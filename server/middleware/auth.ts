/**
 * Authentication Middleware
 * 
 * Provides middleware functions for authentication and authorization.
 */
import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { logger } from '../utils/logger';

/**
 * Middleware to check if a user is authenticated
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export function isAuthenticated(req: Request, res: Response, next: NextFunction): void {
  if (req.session && req.session.userId) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}

/**
 * Middleware to check if a user has admin privileges
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export async function isAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.session || !req.session.userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    
    if (user.role !== 'admin') {
      res.status(403).json({ message: "Forbidden: Requires admin privileges" });
      return;
    }
    
    next();
  } catch (error) {
    logger.error("Error checking admin status:", error);
    res.status(500).json({ message: "Server error" });
  }
}

/**
 * Helper function to get the current user from session
 * Falls back to admin user if no session user is found
 * @param req Express request object
 * @param storage Storage instance
 * @returns The user object or undefined if not found
 */
export async function getCurrentUser(req: Request, storage: any) {
  let user;
  if (req.session && req.session.userId) {
    user = await storage.getUser(req.session.userId);
  } 
  
  // If no user from session, try admin as fallback
  if (!user) {
    user = await storage.getUserByUsername("glossa_admin");
  }
  
  return user;
}