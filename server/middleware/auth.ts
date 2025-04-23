/**
 * Authentication Middleware
 * 
 * Provides middleware for authenticating requests.
 */
import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from '../error/api-error';
import { storage } from '../storage';

// Check if debug logging is enabled
const enableDebugLogs = process.env.DEBUG_LOGS === 'true';

/**
 * Middleware to check if a user is authenticated
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export function requireAuthentication(req: Request, res: Response, next: NextFunction): void {
  // Enhanced debugging for authentication issues (only when DEBUG_LOGS=true)
  if (enableDebugLogs) {
    console.log(`[AUTH-DEBUG] Session ID: ${req.sessionID || 'none'}`);
    console.log(`[AUTH-DEBUG] Session data:`, JSON.stringify(req.session || {}));
    console.log(`[AUTH-DEBUG] Is passport authenticated: ${req.isAuthenticated ? req.isAuthenticated() : 'false'}`);
    console.log(`[AUTH-DEBUG] Is session authenticated: ${req.session && req.session.userId ? 'true' : 'false'}`);
    console.log(`[AUTH-DEBUG] Headers:`, JSON.stringify({
      'cookie': req.headers.cookie || 'none',
      'x-forwarded-for': req.headers['x-forwarded-for'] || 'none',
      'x-forwarded-proto': req.headers['x-forwarded-proto'] || 'none'
    }));
  }
  
  // Check if there's a user ID in the session OR if the user is authenticated via passport
  if ((!req.session || !req.session.userId) && !(req.isAuthenticated && req.isAuthenticated())) {
    throw new UnauthorizedError('Authentication required');
  }
  
  next();
}

/**
 * Express middleware to check authentication without throwing errors
 * Responds with 401 Unauthorized status instead
 */
export function isAuthenticated(req: Request, res: Response, next: NextFunction): void {
  // Use either session or passport authentication
  if ((!req.session || !req.session.userId) && !(req.isAuthenticated && req.isAuthenticated())) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  
  next();
}

/**
 * Middleware to check if a user is an admin
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Enhanced debugging for authentication issues (only when DEBUG_LOGS=true)
  if (enableDebugLogs) {
    console.log(`[ADMIN-AUTH-DEBUG] Session ID: ${req.sessionID || 'none'}`);
    console.log(`[ADMIN-AUTH-DEBUG] Session data:`, JSON.stringify(req.session || {}));
  }
  
  // First ensure the user is authenticated
  if (!req.session || !req.session.userId) {
    throw new UnauthorizedError('Authentication required');
  }
  
  try {
    // Get the user from the database
    const user = await storage.getUser(req.session.userId);
    
    // Check if user exists and is an admin
    if (!user) {
      if (enableDebugLogs) {
        console.log(`[ADMIN-AUTH-DEBUG] User not found for ID: ${req.session.userId}`);
      }
      throw new UnauthorizedError('User not found');
    }
    
    if (enableDebugLogs) {
      console.log(`[ADMIN-AUTH-DEBUG] User role: ${user.role}`);
    }
    
    if (user.role !== 'admin') {
      throw new ForbiddenError('Administrator access required');
    }
    
    next();
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      throw error;
    }
    console.error('Error in admin authentication middleware:', error);
    throw new ForbiddenError('Admin access check failed');
  }
}

/**
 * Middleware to log authentication status (for debugging)
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export function logAuthentication(req: Request, res: Response, next: NextFunction): void {
  const isSessionAuth = req.session && req.session.userId ? true : false;
  const isPassportAuth = req.isAuthenticated && req.isAuthenticated() ? true : false;
  console.log(`[AUTH] Request to ${req.method} ${req.path} | Auth status: ${isSessionAuth || isPassportAuth ? 'Authenticated' : 'Not authenticated'}`);
  
  next();
}