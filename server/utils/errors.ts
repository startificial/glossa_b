/**
 * Error Classes
 * 
 * This module provides custom error classes for common HTTP error scenarios.
 * These error classes are used throughout the application to provide
 * consistent error responses.
 */

/**
 * Base class for API errors
 */
export class ApiError extends Error {
  status: number;
  
  constructor(message: string, status: number) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    
    // This is to make instanceof work properly in TypeScript
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * 400 Bad Request Error
 */
export class BadRequestError extends ApiError {
  constructor(message: string = 'Bad Request') {
    super(message, 400);
    
    // This is to make instanceof work properly in TypeScript
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

/**
 * 401 Unauthorized Error
 */
export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
    
    // This is to make instanceof work properly in TypeScript
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/**
 * 403 Forbidden Error
 */
export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
    
    // This is to make instanceof work properly in TypeScript
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/**
 * 404 Not Found Error
 */
export class NotFoundError extends ApiError {
  constructor(message: string = 'Not Found') {
    super(message, 404);
    
    // This is to make instanceof work properly in TypeScript
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * 409 Conflict Error
 */
export class ConflictError extends ApiError {
  constructor(message: string = 'Conflict') {
    super(message, 409);
    
    // This is to make instanceof work properly in TypeScript
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * 500 Internal Server Error
 */
export class InternalServerError extends ApiError {
  constructor(message: string = 'Internal Server Error') {
    super(message, 500);
    
    // This is to make instanceof work properly in TypeScript
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }
}