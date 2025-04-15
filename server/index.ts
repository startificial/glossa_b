import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import session from "express-session";
import { storage } from "./storage";
import createMemoryStore from "memorystore";
import { initializeDatabase, runMigrations } from "./database";
import connectPgSimple from "connect-pg-simple";
import path from "path";
import os from "os";
import fs from "fs";
import { setupGoogleCredentials, cleanupCredentials } from "./google-credentials";
import { VideoProcessor } from "./video-processor";
import { warmAllModels, scheduleModelWarming } from "./model-warming-service";
import { initDocumentMiddleware } from "./document-middleware";
import { registerPdfRoutes } from "./simple-pdf-generator";

// Always use PostgreSQL database if available
// This ensures consistent data retrieval and proper handling of complex fields like acceptanceCriteria
if (process.env.DATABASE_URL) {
  process.env.USE_POSTGRES = 'true';
  console.log('PostgreSQL database URL detected, enforcing USE_POSTGRES=true');
}

// Add session type
declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

// Create session store based on environment
const MemoryStore = createMemoryStore(session);
const PgStore = connectPgSimple(session);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Create and serve the video scenes directory
const videoScenesDir = path.join(os.tmpdir(), 'video-scenes');
if (!fs.existsSync(videoScenesDir)) {
  fs.mkdirSync(videoScenesDir, { recursive: true });
}
app.use('/media/video-scenes', express.static(videoScenesDir));

// Create and serve the audio timestamps directory
const audioTimestampsDir = path.join(os.tmpdir(), 'audio-timestamps');
if (!fs.existsSync(audioTimestampsDir)) {
  fs.mkdirSync(audioTimestampsDir, { recursive: true });
}
app.use('/media/audio-timestamps', express.static(audioTimestampsDir));

// Create and serve the documents directory with proper content types
const documentsDir = path.join(process.cwd(), 'uploads', 'documents');
if (!fs.existsSync(documentsDir)) {
  fs.mkdirSync(documentsDir, { recursive: true });
}
// Use express.static with mime type overrides for PDF
app.use('/downloads/documents', (req, res, next) => {
  console.log('Received request for static document:', req.url);
  next();
}, express.static(documentsDir, {
  setHeaders: (res, filePath) => {
    console.log('Serving static file:', filePath);
    if (filePath.endsWith('.pdf')) {
      console.log('Setting PDF headers for file:', filePath);
      res.setHeader('Content-Type', 'application/pdf');
      // Add content disposition for downloads
      const fileName = path.basename(filePath);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    }
  }
}));

// Determine which session store to use
const usePostgres = process.env.DATABASE_URL && process.env.USE_POSTGRES === 'true';
const sessionStore = usePostgres
  ? new PgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
    })
  : new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });

// Set up session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || "glossa-session-secret",
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" // Allow cookies to be sent in cross-site requests
  }
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Initialize database if using PostgreSQL
    if (process.env.DATABASE_URL && process.env.USE_POSTGRES === 'true') {
      log('PostgreSQL database detected, initializing...', 'database');
      await initializeDatabase();
      await runMigrations();
    } else {
      log('Using in-memory storage', 'database');
    }
    
    // Setup Google Cloud credentials
    try {
      const credentialsPath = await setupGoogleCredentials();
      if (credentialsPath) {
        log(`Google Cloud credentials initialized at: ${credentialsPath}`, 'credentials');
        // Initialize VideoProcessor class with credentials
        await VideoProcessor.setupCredentials();
      } else {
        log('Google Cloud credentials not found or invalid', 'credentials');
      }
    } catch (credError) {
      log(`Error setting up Google Cloud credentials: ${credError}`, 'error');
    }
    
    // Warm up HuggingFace models to prevent cold start issues
    if (process.env.HUGGINGFACE_API_KEY) {
      log('HuggingFace API key found, warming up models...', 'models');
      try {
        // Start model warming in the background (don't await)
        warmAllModels().catch(err => {
          log(`Error during initial model warming: ${err}`, 'error');
        });
        
        // Schedule regular model warming every 60 minutes to keep models hot
        scheduleModelWarming(60);
        log('Model warming scheduled successfully', 'models');
      } catch (modelError) {
        log(`Error setting up model warming service: ${modelError}`, 'error');
      }
    } else {
      log('HuggingFace API key not found, skipping model warming', 'models');
    }

    // Initialize document middleware
    initDocumentMiddleware(app);
    
    // Register PDF generation routes
    registerPdfRoutes(app);
    
    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      throw err;
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on port 5000
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = 5000;
    const serverInstance = server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${port}`);
      log(`Database: ${process.env.USE_POSTGRES === 'true' ? 'PostgreSQL' : 'In-Memory'}`);
    });
    
    // Set up proper cleanup when the process exits
    ['SIGINT', 'SIGTERM', 'SIGHUP'].forEach(signal => {
      process.on(signal, () => {
        log(`Received ${signal}, cleaning up resources...`, 'shutdown');
        
        // Clean up credentials
        cleanupCredentials();
        
        // Close the server
        serverInstance.close(() => {
          log('Server closed, exiting gracefully', 'shutdown');
          process.exit(0);
        });
        
        // Force exit after 3 seconds if server doesn't close gracefully
        setTimeout(() => {
          log('Server forcefully closed after timeout', 'shutdown');
          process.exit(1);
        }, 3000);
      });
    });
  } catch (error) {
    log(`Server initialization error: ${error}`, 'error');
    process.exit(1);
  }
})();
