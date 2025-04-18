/**
 * Async Handler Utility
 * 
 * This module provides a wrapper for async route handlers to avoid try/catch boilerplate
 * and ensure consistent error handling across all controllers.
 */
import { Request, Response, NextFunction } from 'express';

/**
 * Wraps an async route handler function to automatically catch errors
 * and pass them to Express's error handling middleware.
 * 
 * @param fn The async route handler function to wrap
 * @returns A function that handles async errors
 */
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};