/**
 * Authentication Middleware
 * 
 * Provides middleware for authenticating requests.
 */
import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from '../error/api-error';
import { storage } from '../storage';

/**
 * Middleware to check if a user is authenticated
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export function requireAuthentication(req: Request, res: Response, next: NextFunction): void {
  // Enhanced debugging for authentication issues
  console.log(`[AUTH-DEBUG] Session ID: ${req.sessionID || 'none'}`);
  console.log(`[AUTH-DEBUG] Session data:`, JSON.stringify(req.session || {}));
  console.log(`[AUTH-DEBUG] Is authenticated: ${req.session && req.session.userId ? 'true' : 'false'}`);
  console.log(`[AUTH-DEBUG] Headers:`, JSON.stringify({
    'cookie': req.headers.cookie || 'none',
    'x-forwarded-for': req.headers['x-forwarded-for'] || 'none',
    'x-forwarded-proto': req.headers['x-forwarded-proto'] || 'none'
  }));
  
  // Check if there's a user ID in the session
  if (!req.session || !req.session.userId) {
    throw new UnauthorizedError('Authentication required');
  }
  
  next();
}

/**
 * Legacy middleware name for backward compatibility
 */
export const isAuthenticated = requireAuthentication;

/**
 * Middleware to check if a user is an admin
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Enhanced debugging for authentication issues
  console.log(`[ADMIN-AUTH-DEBUG] Session ID: ${req.sessionID || 'none'}`);
  console.log(`[ADMIN-AUTH-DEBUG] Session data:`, JSON.stringify(req.session || {}));
  
  // First ensure the user is authenticated
  if (!req.session || !req.session.userId) {
    throw new UnauthorizedError('Authentication required');
  }
  
  try {
    // Get the user from the database
    const user = await storage.getUser(req.session.userId);
    
    // Check if user exists and is an admin
    if (!user) {
      console.log(`[ADMIN-AUTH-DEBUG] User not found for ID: ${req.session.userId}`);
      throw new UnauthorizedError('User not found');
    }
    
    console.log(`[ADMIN-AUTH-DEBUG] User role: ${user.role}`);
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
  console.log(`[AUTH] Request to ${req.method} ${req.path} | Auth status: ${req.session.userId ? 'Authenticated' : 'Not authenticated'}`);
  
  next();
}