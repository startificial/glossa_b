import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes/index"; // Use the version that accepts quickStart parameter
import { setupVite, serveStatic, log } from "./vite";
import session from "express-session";
import { storage } from "./storage";
import createMemoryStore from "memorystore";
import { initializeDatabase, runMigrations } from "./db";
import connectPgSimple from "connect-pg-simple";
import path from "path";
import os from "os";
import fs from "fs";
import { setupGoogleCredentials, cleanupCredentials } from "./google-credentials";
import { VideoProcessor } from "./video-processor";
import { warmAllModels, scheduleModelWarming } from "./model-warming-service";
import { initDocumentMiddleware } from "./document-middleware";
import { registerPdfRoutes } from "./simple-pdf-generator";
import passport from 'passport';
import { setupAuth } from "./auth";
import { ENV_CONFIG } from '../shared/config/system-defaults';

/**
 * Helper function to ensure a directory exists
 * @param dirPath The directory path to create if it doesn't exist
 * @param description Optional description for logging
 * @returns The directory path
 */
function ensureDirectoryExists(dirPath: string, description: string = 'directory'): string {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created ${description}: ${dirPath}`);
  }
  return dirPath;
}

// Always use PostgreSQL database if available
// This ensures consistent data retrieval and proper handling of complex fields like acceptanceCriteria
if (process.env.DATABASE_URL) {
  process.env.USE_POSTGRES = 'true';
  console.log('PostgreSQL database URL detected, enforcing USE_POSTGRES=true');
}

// Add session type and passport extensions
declare module "express-session" {
  interface SessionData {
    userId: number;
    passport?: {
      user: number;
    };
  }
}

// Add user property to Express.Request
declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      email: string | null;
      role: string;
      firstName: string | null;
      lastName: string | null;
      company: string | null;
      avatarUrl: string | null;
      createdAt: Date;
      updatedAt: Date;
      [key: string]: any;
    }
  }
}

// Create session store based on environment
const MemoryStore = createMemoryStore(session);
const PgStore = connectPgSimple(session);

const app = express();
// Trust the proxy when in production for secure cookies to work
// This is crucial for Replit deployments which use a proxy
app.set('trust proxy', 1);
console.log(`[SERVER] Trust proxy setting: ${app.get('trust proxy')}`);

// For debugging HTTP headers in production 
// Use centralized config from system-defaults.ts
const enableDebugLogs = ENV_CONFIG.DEBUG_LOGS;
console.log(`[SERVER] Debug logs ${enableDebugLogs ? 'enabled' : 'disabled'}`);

if (enableDebugLogs) {
  app.use((req, res, next) => {
    const forwarded = req.headers['x-forwarded-for'];
    const protocol = req.headers['x-forwarded-proto'];
    console.log(`[REQUEST] ${req.method} ${req.url} | Forwarded: ${forwarded || 'none'} | Protocol: ${protocol || 'none'}`);
    next();
  });
} else {
  // No middleware needed when debug logs are disabled
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Create and serve the video scenes directory
const videoScenesDir = ensureDirectoryExists(path.join(os.tmpdir(), 'video-scenes'), 'video scenes directory');
app.use('/media/video-scenes', express.static(videoScenesDir));

// Create and serve the audio timestamps directory
const audioTimestampsDir = ensureDirectoryExists(path.join(os.tmpdir(), 'audio-timestamps'), 'audio timestamps directory');
app.use('/media/audio-timestamps', express.static(audioTimestampsDir));

// Create and serve the documents directory with proper content types
const documentsDir = ensureDirectoryExists(path.join(process.cwd(), 'uploads', 'documents'), 'documents directory');
// Use express.static with mime type overrides for PDF
app.use('/downloads/documents', (req, res, next) => {
  if (enableDebugLogs) {
    console.log('Received request for static document:', req.url);
  }
  next();
}, express.static(documentsDir, {
  setHeaders: (res, filePath) => {
    if (enableDebugLogs) {
      console.log('Serving static file:', filePath);
    }
    if (filePath.endsWith('.pdf')) {
      if (enableDebugLogs) {
        console.log('Setting PDF headers for file:', filePath);
      }
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

// Set up session middleware with proper configuration for Replit environment
const isProduction = process.env.NODE_ENV === "production";
console.log(`[SERVER] Environment: ${isProduction ? 'production' : 'development'}`);

// Define cookie options based on environment
const isSecureEnvironment = process.env.NODE_ENV === 'production';
console.log(`[SERVER] Using secure cookies: ${isSecureEnvironment ? 'Yes' : 'No'}`);

// Define cookie options with explicit type for TypeScript
const cookieOptions: session.CookieOptions = {
  maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
  secure: isSecureEnvironment, // Enable secure in production
  httpOnly: true, 
  path: '/',
  sameSite: isSecureEnvironment ? 'none' : 'lax' // Use 'none' in production for cross-site cookies
};

const sessionConfig = {
  secret: process.env.SESSION_SECRET || "glossa-session-secret",
  resave: true, // Enable to ensure the session is saved back to the store
  saveUninitialized: true, // Save even uninitialized sessions (anonymously visited)
  store: sessionStore,
  proxy: true, // Essential for cookie handling in proxied environments like Replit
  cookie: cookieOptions
};

// Log session configuration (without secret)
console.log(`[SERVER] Session configuration:`, JSON.stringify({
  ...sessionConfig,
  secret: '[REDACTED]',
  store: sessionStore ? 'Configured' : 'None',
  cookie: {
    maxAge: cookieOptions.maxAge,
    secure: cookieOptions.secure,
    sameSite: cookieOptions.sameSite,
    httpOnly: cookieOptions.httpOnly,
    path: cookieOptions.path,
  }
}));

// Initialize session and passport (ensure only one session initialization in the app)
app.use(session(sessionConfig));

// Set up passport middleware - make sure this happens before route registration
console.log('[SERVER] Initializing Passport.js');
const passportInstance = passport;
app.use(passportInstance.initialize());
app.use(passportInstance.session());

// Initialize our authentication routes and strategies
setupAuth(app);

console.log('[SERVER] Passport.js and authentication initialized');

// Debug middleware to log session on every request (enable for troubleshooting)
app.use((req, res, next) => {
  // Always log API requests for debugging
  if (req.path.startsWith('/api/')) {
    console.log(`[API-DEBUG] ${req.method} ${req.path}`);
    console.log(`[API-DEBUG] Session ID: ${req.sessionID}, Has userId: ${req.session && req.session.userId ? 'Yes' : 'No'}`);
    console.log(`[API-DEBUG] Is Authenticated: ${req.isAuthenticated?.() ? 'Yes' : 'No'}`);
    console.log(`[API-DEBUG] User: ${req.user ? `ID: ${req.user.id}, Username: ${req.user.username}` : 'Not authenticated'}`);
  }
  next();
});

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

// Use system configuration for quick start mode

// Check if we should use quick start mode (skips resource-intensive initialization)
const QUICK_START = ENV_CONFIG.QUICK_START; // Use centralized configuration

// Start server quickly, skipping resource-intensive initialization
async function startServer() {
  try {
    // Skip most initialization steps and routes in quick start mode
    if (QUICK_START) {
      log('QUICK START MODE ENABLED - minimizing startup tasks', 'init');
    }
    
    // Set up minimal required middleware
    if (!QUICK_START) {
      initDocumentMiddleware(app);
      registerPdfRoutes(app);
    }
    
    // Register application routes
    console.log(`[SERVER] Registering routes with quickStart=${QUICK_START}`);
    // Make sure to pass quickStart flag to route registration
    const server = await registerRoutes(app, QUICK_START);

    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
      throw err;
    });

    // Setup vite in development or static files in production
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Start the server
    const port = 5000;
    const serverInstance = server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`Server is running on port ${port} (Quick Start: ${QUICK_START ? 'Yes' : 'No'})`);
      log(`Database: ${process.env.USE_POSTGRES === 'true' ? 'PostgreSQL' : 'In-Memory'}`);
      
      // After server starts, schedule resource-intensive initialization if needed
      if (!QUICK_START) {
        setTimeout(() => {
          completeInitialization(serverInstance);
        }, 2000);
      } else {
        log('Skipping background initialization due to Quick Start mode', 'init');
      }
    });
    
    // Set up cleanup handlers
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
    
    return serverInstance;
  } catch (error) {
    log(`Server startup error: ${error}`, 'error');
    process.exit(1);
  }
}

// Perform resource-intensive initialization after server has started
async function completeInitialization(serverInstance: any) {
  log('Starting complete initialization after server is running', 'init');
  
  // Initialize database if using PostgreSQL
  if (process.env.DATABASE_URL && process.env.USE_POSTGRES === 'true') {
    log('PostgreSQL database detected, initializing...', 'database');
    
    try {
      // Initialize database
      await initializeDatabase();
      log('Database initialized', 'database');
      
      // Run migrations
      await runMigrations();
      log('Database migrations completed', 'database');
    } catch (dbError) {
      log(`Database initialization error: ${dbError}`, 'error');
    }
  } else {
    log('Using in-memory storage', 'database');
  }
  
  // Setup Google Cloud credentials
  try {
    const credentialsPath = await setupGoogleCredentials();
    if (credentialsPath) {
      log(`Google Cloud credentials initialized at: ${credentialsPath}`, 'credentials');
    } else {
      log('Google Cloud credentials not found or invalid', 'credentials');
    }
  } catch (credError) {
    log(`Error setting up Google Cloud credentials: ${credError}`, 'error');
  }
  
  // Warm up HuggingFace models
  if (process.env.HUGGINGFACE_API_KEY) {
    log('HuggingFace API key found, warming up models...', 'models');
    try {
      // Start model warming in the background (don't await)
      warmAllModels().catch(err => {
        log(`Error during initial model warming: ${err}`, 'error');
      });
      
      // Schedule regular model warming every 60 minutes
      scheduleModelWarming(60);
      log('Model warming scheduled successfully', 'models');
    } catch (modelError) {
      log(`Error setting up model warming service: ${modelError}`, 'error');
    }
  } else {
    log('HuggingFace API key not found, skipping model warming', 'models');
  }
  
  log('Completed post-startup initialization', 'init');
}

// Start the server
startServer();
