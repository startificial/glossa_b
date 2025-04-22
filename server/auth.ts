/**
 * Authentication Setup Module
 * 
 * Sets up authentication routes and middleware using Passport.js
 * with a local authentication strategy.
 */
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  // Passport needs to be initialized after session middleware is set up in index.ts
  // But we're setting up the strategy here

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`[AUTH] Attempting login for username: ${username}`);
        const user = await storage.getUserByUsername(username);
        
        if (!user) {
          console.log(`[AUTH] User not found: ${username}`);
          return done(null, false, { message: "Invalid username or password" });
        }
        
        const isValid = await comparePasswords(password, user.password);
        if (!isValid) {
          console.log(`[AUTH] Invalid password for user: ${username}`);
          return done(null, false, { message: "Invalid username or password" });
        }
        
        console.log(`[AUTH] Login successful for user: ${username}`);
        return done(null, user);
      } catch (error) {
        console.error(`[AUTH] Login error for ${username}:`, error);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    console.log(`[AUTH] Serializing user: ${user.id}`);
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log(`[AUTH] Deserializing user ID: ${id}`);
      const user = await storage.getUser(id);
      if (!user) {
        console.log(`[AUTH] User not found during deserialization: ${id}`);
        return done(null, false);
      }
      done(null, user);
    } catch (error) {
      console.error(`[AUTH] Error deserializing user ${id}:`, error);
      done(error);
    }
  });

  // Login route
  app.post("/api/login", (req, res, next) => {
    console.log(`[AUTH] Login attempt from ${req.ip}`);
    
    passport.authenticate("local", (err: any, user: SelectUser | false, info: any) => {
      if (err) {
        console.error("[AUTH] Login error:", err);
        return res.status(500).json({ message: "Internal server error" });
      }
      
      if (!user) {
        console.log("[AUTH] Authentication failed:", info?.message || "Unknown reason");
        return res.status(401).json({ message: info?.message || "Invalid username or password" });
      }
      
      req.login(user, (err) => {
        if (err) {
          console.error("[AUTH] Session error:", err);
          return res.status(500).json({ message: "Internal server error" });
        }
        
        console.log(`[AUTH] User authenticated successfully: ${user.username} (ID: ${user.id})`);
        req.session.userId = user.id; // Ensure userId is set in session
        
        // Don't return the password
        const { password, ...userWithoutPassword } = user;
        return res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  // Logout route
  app.post("/api/logout", (req, res) => {
    const wasAuthenticated = req.isAuthenticated();
    const userId = req.session?.userId;
    
    console.log(`[AUTH] Logout attempt. Was authenticated: ${wasAuthenticated}, User ID: ${userId || 'none'}`);
    
    req.logout((err) => {
      if (err) {
        console.error("[AUTH] Logout error:", err);
        return res.status(500).json({ message: "Error during logout" });
      }
      
      req.session.destroy((err) => {
        if (err) {
          console.error("[AUTH] Session destruction error:", err);
          return res.status(500).json({ message: "Failed to destroy session" });
        }
        
        console.log("[AUTH] User logged out successfully");
        res.clearCookie('connect.sid');
        res.status(200).json({ message: "Logged out successfully" });
      });
    });
  });

  // User info route
  app.get("/api/user", (req, res) => {
    console.log(`[AUTH] User info request. Is authenticated: ${req.isAuthenticated()}, Session user ID: ${req.session?.userId || 'none'}`);
    
    if (!req.isAuthenticated() && !req.session?.userId) {
      console.log("[AUTH] User not authenticated for /api/user");
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const userId = req.user?.id || req.session.userId;
    
    if (!userId) {
      console.log("[AUTH] No user ID available");
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    storage.getUser(userId)
      .then(user => {
        if (!user) {
          console.log(`[AUTH] User not found for ID: ${userId}`);
          return res.status(404).json({ message: "User not found" });
        }
        
        // Don't return the password
        const { password, ...userWithoutPassword } = user;
        console.log(`[AUTH] Returning user info for: ${user.username} (ID: ${user.id})`);
        return res.json(userWithoutPassword);
      })
      .catch(error => {
        console.error(`[AUTH] Error retrieving user ${userId}:`, error);
        return res.status(500).json({ message: "Internal server error" });
      });
  });

  // Registration route
  app.post("/api/register", async (req, res, next) => {
    try {
      console.log(`[AUTH] Registration attempt for username: ${req.body.username}`);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        console.log(`[AUTH] Registration failed - username already exists: ${req.body.username}`);
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Hash the password
      const hashedPassword = await hashPassword(req.body.password);
      
      // Create the user with hashed password
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
      });
      
      // Login the user after registration
      req.login(user, (err) => {
        if (err) {
          console.error("[AUTH] Post-registration login error:", err);
          return next(err);
        }
        
        req.session.userId = user.id; // Ensure userId is set in session
        console.log(`[AUTH] User registered and logged in: ${user.username} (ID: ${user.id})`);
        
        // Don't return the password
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      console.error("[AUTH] Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });
}