/**
 * Authentication Middleware
 * 
 * Provides middleware for authenticating requests.
 */
import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../error/api-error';

/**
 * Middleware to check if a user is authenticated
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export function isAuthenticated(req: Request, res: Response, next: NextFunction): void {
  // Check if there's a user ID in the session
  if (!req.session.userId) {
    throw new UnauthorizedError('Authentication required');
  }
  
  next();
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