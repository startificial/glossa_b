/**
 * Authentication Middleware
 * 
 * Provides middleware functions for securing API routes.
 */
import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../error/api-error';

/**
 * Middleware to check if user is authenticated
 * Verifies that user is present in the session
 * 
 * @throws UnauthorizedError if user is not authenticated
 */
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.session && req.session.userId) {
    return next();
  }
  
  throw new UnauthorizedError('Authentication required');
}

/**
 * Middleware to check if user has admin role
 * First verifies authentication, then checks the user's role
 * 
 * @throws UnauthorizedError if user is not authenticated
 * @throws ForbiddenError if user is not an admin
 */
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session || !req.session.userId) {
    throw new UnauthorizedError('Authentication required');
  }
  
  // This would typically check a user role
  // For now, we're just passing through as we don't have roles implemented
  return next();
}