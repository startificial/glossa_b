/**
 * API Error Classes
 * 
 * Defines custom error classes for handling API errors.
 */

/**
 * Base class for API errors
 */
export class ApiError extends Error {
  statusCode: number;
  errorCode: string;
  
  /**
   * Create an API error
   * @param message Error message
   * @param statusCode HTTP status code
   * @param errorCode Application-specific error code
   */
  constructor(message: string, statusCode: number = 500, errorCode: string = 'INTERNAL_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    
    // Ensures proper stack trace for debugging 
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error for bad requests (400)
 */
export class BadRequestError extends ApiError {
  constructor(message: string = 'Bad request', errorCode: string = 'BAD_REQUEST') {
    super(message, 400, errorCode);
  }
}

/**
 * Error for unauthorized requests (401)
 */
export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Authentication required', errorCode: string = 'UNAUTHORIZED') {
    super(message, 401, errorCode);
  }
}

/**
 * Error for forbidden access (403)
 */
export class ForbiddenError extends ApiError {
  constructor(message: string = 'Access forbidden', errorCode: string = 'FORBIDDEN') {
    super(message, 403, errorCode);
  }
}

/**
 * Error for not found resources (404)
 */
export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found', errorCode: string = 'NOT_FOUND') {
    super(message, 404, errorCode);
  }
}

/**
 * Error for conflict errors (409)
 */
export class ConflictError extends ApiError {
  constructor(message: string = 'Resource conflict', errorCode: string = 'CONFLICT') {
    super(message, 409, errorCode);
  }
}

/**
 * Error for validation errors (422)
 */
export class ValidationError extends ApiError {
  constructor(message: string = 'Validation error', errorCode: string = 'VALIDATION_ERROR') {
    super(message, 422, errorCode);
  }
}

/**
 * Error for rate limiting (429)
 */
export class RateLimitError extends ApiError {
  constructor(message: string = 'Too many requests', errorCode: string = 'RATE_LIMIT') {
    super(message, 429, errorCode);
  }
}

/**
 * Error for internal server errors (500)
 */
export class InternalServerError extends ApiError {
  constructor(message: string = 'Internal server error', errorCode: string = 'INTERNAL_ERROR') {
    super(message, 500, errorCode);
  }
}

/**
 * Error for service unavailable errors (503)
 */
export class ServiceUnavailableError extends ApiError {
  constructor(message: string = 'Service unavailable', errorCode: string = 'SERVICE_UNAVAILABLE') {
    super(message, 503, errorCode);
  }
}