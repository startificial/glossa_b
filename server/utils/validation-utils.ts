/**
 * Validation Utilities
 * 
 * Provides helpers for handling validation-related tasks,
 * particularly for integrating Zod validation with our error handling system.
 */
import { ZodError } from 'zod';

/**
 * Format a Zod validation error into a structured object
 * for consistent error responses
 * 
 * @param error ZodError instance from validation failure
 * @returns Record mapping field paths to arrays of error messages
 */
export function formatZodError(error: ZodError): Record<string, string[]> {
  const formattedErrors: Record<string, string[]> = {};
  
  // Process each Zod issue into our format
  for (const issue of error.errors) {
    const path = issue.path.join('.') || 'root';
    
    if (!formattedErrors[path]) {
      formattedErrors[path] = [];
    }
    
    formattedErrors[path].push(issue.message);
  }
  
  return formattedErrors;
}

/**
 * Convert an error object to a validation error format
 * 
 * @param errors Simple object with field names as keys and error messages as values
 * @returns Record mapping field names to arrays of error messages
 */
export function formatValidationErrors(errors: Record<string, string>): Record<string, string[]> {
  const formattedErrors: Record<string, string[]> = {};
  
  for (const [key, message] of Object.entries(errors)) {
    formattedErrors[key] = [message];
  }
  
  return formattedErrors;
}

/**
 * Create a validation message for a field
 * 
 * @param field Field name
 * @param rule Validation rule description
 * @returns Formatted validation message
 */
export function validationMessage(field: string, rule: string): string {
  return `${field} ${rule}`;
}