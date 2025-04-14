/**
 * Error Handler Middleware
 * 
 * Provides centralized error handling for Express routes.
 * Transforms ApiError instances into appropriate HTTP responses.
 */
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../error/api-error';
import { ZodError } from 'zod';

/**
 * Express error handling middleware
 * Handles:
 * - Custom API errors
 * - Zod validation errors
 * - Generic errors
 */
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error('Error caught by errorHandler:', err);
  
  // Handle our custom API errors
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      message: err.message,
      ...(err.data && { data: err.data })
    });
  }
  
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: 'Validation error',
      data: err.errors
    });
  }
  
  // Handle DuplicateKeyError (for database operations)
  if (err.message && err.message.includes('duplicate key value violates unique constraint')) {
    return res.status(409).json({
      message: 'Resource already exists',
      detail: err.message
    });
  }
  
  // Default to 500 server error
  return res.status(500).json({
    message: 'Internal Server Error',
    ...(process.env.NODE_ENV !== 'production' && { detail: err.message })
  });
}

/**
 * Handler for 404 routes
 * Used when no routes match the requested URL
 */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    message: `Cannot ${req.method} ${req.path}`
  });
}

/**
 * Async handler wrapper to catch errors from async route handlers
 * Eliminates need for try/catch in route handlers
 */
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};