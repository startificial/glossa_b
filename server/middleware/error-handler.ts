/**
 * Error Handler Middleware
 * 
 * Provides middleware for handling errors in the application.
 */
import { Request, Response, NextFunction } from 'express';
import { ApiError, NotFoundError } from '../error/api-error';
import { ZodError } from 'zod';
import { formatZodError } from '../error/zod-formatter';

// Type to make async route handlers compatible with Express
type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<any>;

/**
 * Wraps an async route handler to automatically catch errors and pass them to the error middleware
 * @param fn Async route handler function
 * @returns Express middleware function with error handling
 */
export function asyncHandler(fn: AsyncRequestHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Middleware for handling 404 errors
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
}

/**
 * Global error handler middleware
 * @param err Error object
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error(`Error handling request to ${req.method} ${req.path}:`, err);
  
  // Handle API errors
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      code: err.errorCode
    });
  }
  
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation error',
      errors: formatZodError(err)
    });
  }
  
  // Default error handling
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    // Only include stack trace in development
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
}