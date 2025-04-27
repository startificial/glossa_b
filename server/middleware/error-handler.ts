/**
 * Error Handling Middleware
 * 
 * Provides middleware functions for handling errors and 404 routes.
 */
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Custom error class with status code
 */
export class ApiError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
  }
}

/**
 * Middleware to handle 404 routes
 * @param req Express request object
 * @param res Express response object
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    message: `Not Found - ${req.originalUrl}`
  });
}

/**
 * Global error handling middleware
 * @param err Error object
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  // Log the error
  logger.error(`Error processing ${req.method} ${req.originalUrl}:`, err);
  
  // Get status code and message
  const statusCode = err instanceof ApiError ? err.statusCode : 500;
  const message = err.message || 'Internal Server Error';
  
  // Send response
  res.status(statusCode).json({
    message,
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack
  });
}