/**
 * Zod Error Formatter
 * 
 * Utility functions for formatting Zod validation errors.
 */
import { ZodError, ZodIssue } from 'zod';

/**
 * Interface for a formatted validation error
 */
export interface FormattedZodError {
  path: (string | number)[];
  message: string;
}

/**
 * Format a Zod validation error into a more user-friendly structure
 * @param error The Zod error to format
 * @returns An array of formatted error objects
 */
export function formatZodError(error: ZodError): FormattedZodError[] {
  return error.errors.map((issue: ZodIssue) => ({
    path: issue.path,
    message: issue.message
  }));
}