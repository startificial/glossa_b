/**
 * Standard Error Types Module
 * 
 * This module defines standardized error types used throughout the application.
 * Having a well-defined set of error types makes error handling more consistent
 * and enables better mapping between backend and frontend error handling.
 */

/**
 * Base error class with consistent properties across all application errors
 */
export class AppError extends Error {
  /** Unique error code identifying the type of error */
  public readonly code: string;
  /** HTTP status code to return with the error */
  public readonly statusCode: number;
  /** Whether the error is operational (expected) or a programming error */
  public readonly isOperational: boolean;
  /** Timestamp when the error occurred */
  public readonly timestamp: Date;
  /** Additional error details (for logging/debugging, not for user display) */
  public readonly details?: Record<string, any>;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    details?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date();
    this.details = details;

    // Captures the stack trace, excluding the constructor call
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error - returned when request data fails validation
 */
export class ValidationError extends AppError {
  /** Fields that failed validation and error messages */
  public readonly validationErrors: Record<string, string[]>;

  constructor(
    message: string = 'Validation failed',
    validationErrors: Record<string, string[]> = {}
  ) {
    super(message, 'VALIDATION_ERROR', 400, true, { validationErrors });
    this.validationErrors = validationErrors;
  }
}

/**
 * Not found error - returned when a requested resource doesn't exist
 */
export class NotFoundError extends AppError {
  constructor(
    resourceType: string,
    identifier?: string | number
  ) {
    const message = identifier 
      ? `${resourceType} with identifier ${identifier} not found`
      : `${resourceType} not found`;
    
    super(message, 'NOT_FOUND', 404, true);
  }
}

/**
 * Authentication error - returned when authentication fails
 */
export class AuthenticationError extends AppError {
  constructor(
    message: string = 'Authentication failed'
  ) {
    super(message, 'AUTHENTICATION_ERROR', 401, true);
  }
}

/**
 * Authorization error - returned when a user lacks permission for an action
 */
export class AuthorizationError extends AppError {
  constructor(
    message: string = 'Insufficient permissions to perform this action'
  ) {
    super(message, 'AUTHORIZATION_ERROR', 403, true);
  }
}

/**
 * Conflict error - returned when a request would cause a conflict
 */
export class ConflictError extends AppError {
  constructor(
    message: string,
    details?: Record<string, any>
  ) {
    super(message, 'CONFLICT_ERROR', 409, true, details);
  }
}

/**
 * Service unavailable error - returned when an external service fails
 */
export class ServiceUnavailableError extends AppError {
  constructor(
    serviceName: string,
    details?: Record<string, any>
  ) {
    const message = `Service ${serviceName} is currently unavailable`;
    super(message, 'SERVICE_UNAVAILABLE', 503, true, details);
  }
}

/**
 * Database error - returned when a database operation fails
 */
export class DatabaseError extends AppError {
  constructor(
    operation: string,
    details?: Record<string, any>
  ) {
    const message = `Database operation '${operation}' failed`;
    super(message, 'DATABASE_ERROR', 500, true, details);
  }
}

/**
 * General API error - used for other API-related errors
 */
export class ApiError extends AppError {
  constructor(
    message: string,
    statusCode: number = 500,
    details?: Record<string, any>
  ) {
    super(message, 'API_ERROR', statusCode, true, details);
  }
}

/**
 * Map from error codes to Error classes for creating errors from error codes
 */
export const ERROR_MAP: Record<string, typeof AppError> = {
  'VALIDATION_ERROR': ValidationError,
  'NOT_FOUND': NotFoundError,
  'AUTHENTICATION_ERROR': AuthenticationError,
  'AUTHORIZATION_ERROR': AuthorizationError,
  'CONFLICT_ERROR': ConflictError,
  'SERVICE_UNAVAILABLE': ServiceUnavailableError,
  'DATABASE_ERROR': DatabaseError,
  'API_ERROR': ApiError,
};

/**
 * Type guard to check if an error is an AppError
 * @param error Any error object
 * @returns Whether the error is an AppError
 */
export function isAppError(error: any): error is AppError {
  return error instanceof AppError;
}

/**
 * Error details interface for structured error reporting
 */
export interface ErrorResponse {
  code: string;
  message: string;
  statusCode: number;
  timestamp: string;
  path?: string;
  validationErrors?: Record<string, string[]>;
  requestId?: string;
}