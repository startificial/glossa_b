/**
 * Error Handler Middleware
 * 
 * Centralizes error handling for the entire application, ensuring consistent
 * error responses across all routes.
 */
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { 
  AppError, 
  ValidationError, 
  isAppError, 
  ErrorResponse 
} from '../error/error-types';
import { logger } from '../utils/logger';
import { formatZodError } from '../utils/validation-utils';
import { isDevelopment } from '../utils/environment';

/**
 * Main error handler middleware
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Generate a unique request ID for correlation
  const requestId = req.headers['x-request-id'] as string || generateRequestId();

  // Normalize error to AppError type
  const normalizedError = normalizeError(err);
  
  // Prepare the error response
  const errorResponse: ErrorResponse = {
    code: normalizedError.code,
    message: normalizedError.message,
    statusCode: normalizedError.statusCode,
    timestamp: normalizedError.timestamp.toISOString(),
    path: req.path,
    requestId
  };

  // Add validation errors if applicable
  if (normalizedError instanceof ValidationError) {
    errorResponse.validationErrors = normalizedError.validationErrors;
  }

  // Log the error appropriately based on severity
  logError(normalizedError, req, requestId);

  // In development mode, include stack trace for non-operational errors
  if (isDevelopment() && !normalizedError.isOperational) {
    Object.assign(errorResponse, { 
      stack: normalizedError.stack,
      details: normalizedError.details
    });
  }

  // Send the error response
  res.status(normalizedError.statusCode).json(errorResponse);
}

/**
 * Normalize any error type to an AppError
 */
function normalizeError(err: Error | AppError): AppError {
  // If already an AppError, return as is
  if (isAppError(err)) {
    return err;
  }

  // Handle ZodError (validation errors)
  if (err instanceof ZodError) {
    return new ValidationError(
      'Validation failed',
      formatZodError(err)
    );
  }

  // Handle common error types
  if (err.name === 'SyntaxError') {
    return new ValidationError(
      'Invalid JSON syntax',
      { body: ['Request contains invalid JSON'] }
    );
  }

  // Handle database errors (common Drizzle errors)
  if (err.message.includes('database') || 
      err.message.includes('constraint') || 
      err.message.includes('foreign key')) {
    return new AppError(
      'Database operation failed',
      'DATABASE_ERROR',
      500,
      true,
      { originalError: err.message }
    );
  }

  // Fall back to a general server error for unknown error types
  const errorMessage = isDevelopment() 
    ? err.message 
    : 'An unexpected error occurred';

  return new AppError(
    errorMessage,
    'INTERNAL_SERVER_ERROR',
    500,
    false,
    { originalError: err.message, stack: err.stack }
  );
}

/**
 * Log the error with appropriate severity
 */
function logError(error: AppError, req: Request, requestId: string): void {
  const logData = {
    code: error.code,
    statusCode: error.statusCode,
    isOperational: error.isOperational,
    message: error.message,
    path: req.path,
    method: req.method,
    requestId,
    ip: req.ip,
    userId: (req as any).user?.id, // If using authentication middleware
    details: error.details,
    stack: error.stack
  };

  // Log with appropriate severity based on the error
  if (error.statusCode >= 500) {
    // Server errors
    logger.error(logData, 'Server error occurred');
  } else if (!error.isOperational) {
    // Programming errors that aren't server errors
    logger.error(logData, 'Programming error occurred');
  } else if (error.statusCode >= 400 && error.statusCode < 500) {
    // Client errors
    logger.warn(logData, 'Client error occurred');
  } else {
    // Fallback for other errors
    logger.info(logData, 'Error occurred');
  }
}

/**
 * Generate a unique request ID for error tracking
 */
function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * 404 handler middleware - should be placed after all routes
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  const err = new AppError(
    `Route not found: ${req.method} ${req.path}`,
    'NOT_FOUND',
    404,
    true
  );
  next(err);
}