/**
 * API Error Module
 * 
 * Provides standardized error classes for API responses.
 * Ensures consistent error formatting and status codes.
 */

/**
 * Base API Error class
 * Extends Error with HTTP status code and optional data
 */
export class ApiError extends Error {
  statusCode: number;
  data?: any;

  /**
   * Create a new API error
   * @param statusCode HTTP status code to return
   * @param message Error message
   * @param data Additional error data (optional)
   */
  constructor(statusCode: number, message: string, data?: any) {
    super(message);
    this.statusCode = statusCode;
    this.data = data;
    this.name = this.constructor.name;
    
    // Maintains proper stack trace for where error was thrown (node.js)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * 400 Bad Request Error
 * Use for validation failures, malformed request syntax, etc.
 */
export class BadRequestError extends ApiError {
  constructor(message = 'Bad Request', data?: any) {
    super(400, message, data);
  }
}

/**
 * 401 Unauthorized Error
 * Use when authentication is required but missing or invalid
 */
export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized', data?: any) {
    super(401, message, data);
  }
}

/**
 * 403 Forbidden Error
 * Use when user doesn't have permission for the requested operation
 */
export class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden', data?: any) {
    super(403, message, data);
  }
}

/**
 * 404 Not Found Error
 * Use when requested resource doesn't exist
 */
export class NotFoundError extends ApiError {
  constructor(message = 'Not Found', data?: any) {
    super(404, message, data);
  }
}

/**
 * 409 Conflict Error
 * Use when the request conflicts with current state of the server
 */
export class ConflictError extends ApiError {
  constructor(message = 'Conflict', data?: any) {
    super(409, message, data);
  }
}

/**
 * 422 Unprocessable Entity Error
 * Use for semantic validation errors
 */
export class UnprocessableEntityError extends ApiError {
  constructor(message = 'Unprocessable Entity', data?: any) {
    super(422, message, data);
  }
}

/**
 * 500 Internal Server Error
 * Use for unhandled server errors
 */
export class InternalServerError extends ApiError {
  constructor(message = 'Internal Server Error', data?: any) {
    super(500, message, data);
  }
}

/**
 * 503 Service Unavailable Error
 * Use when the server is temporarily unable to handle the request
 */
export class ServiceUnavailableError extends ApiError {
  constructor(message = 'Service Unavailable', data?: any) {
    super(503, message, data);
  }
}