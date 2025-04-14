/**
 * Tests for Error Types
 * 
 * These tests ensure that our error types work correctly
 * and carry the expected properties.
 */
import {
  AppError,
  ValidationError,
  NotFoundError,
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  ServiceUnavailableError,
  DatabaseError,
  ApiError,
  isAppError,
  ERROR_MAP
} from './error-types';

describe('Error Types', () => {
  describe('AppError', () => {
    it('should create a base error with the correct properties', () => {
      const message = 'Test error message';
      const code = 'TEST_ERROR';
      const statusCode = 418; // I'm a teapot
      const details = { foo: 'bar' };
      
      const error = new AppError(message, code, statusCode, true, details);
      
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe(message);
      expect(error.code).toBe(code);
      expect(error.statusCode).toBe(statusCode);
      expect(error.isOperational).toBe(true);
      expect(error.details).toEqual(details);
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.stack).toBeDefined();
    });
    
    it('should set default values when not provided', () => {
      const message = 'Test error message';
      const code = 'TEST_ERROR';
      
      const error = new AppError(message, code);
      
      expect(error.statusCode).toBe(500); // Default status code
      expect(error.isOperational).toBe(true); // Default isOperational
      expect(error.details).toBeUndefined(); // No details
    });
  });
  
  describe('ValidationError', () => {
    it('should create a validation error with the correct properties', () => {
      const validationErrors = {
        email: ['Email is required'],
        password: ['Password must be at least 8 characters']
      };
      
      const error = new ValidationError('Validation failed', validationErrors);
      
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Validation failed');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.validationErrors).toEqual(validationErrors);
      expect(error.details).toEqual({ validationErrors });
    });
    
    it('should use default values when not provided', () => {
      const error = new ValidationError();
      
      expect(error.message).toBe('Validation failed');
      expect(error.validationErrors).toEqual({});
    });
  });
  
  describe('NotFoundError', () => {
    it('should create a not found error with a resource type', () => {
      const error = new NotFoundError('User');
      
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('User not found');
      expect(error.code).toBe('NOT_FOUND');
      expect(error.statusCode).toBe(404);
    });
    
    it('should include the identifier when provided', () => {
      const error = new NotFoundError('Project', 123);
      
      expect(error.message).toBe('Project with identifier 123 not found');
    });
  });
  
  describe('AuthenticationError', () => {
    it('should create an authentication error', () => {
      const message = 'Invalid credentials';
      const error = new AuthenticationError(message);
      
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe(message);
      expect(error.code).toBe('AUTHENTICATION_ERROR');
      expect(error.statusCode).toBe(401);
    });
    
    it('should use a default message when not provided', () => {
      const error = new AuthenticationError();
      
      expect(error.message).toBe('Authentication failed');
    });
  });
  
  describe('AuthorizationError', () => {
    it('should create an authorization error', () => {
      const message = 'Not allowed to access this resource';
      const error = new AuthorizationError(message);
      
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe(message);
      expect(error.code).toBe('AUTHORIZATION_ERROR');
      expect(error.statusCode).toBe(403);
    });
    
    it('should use a default message when not provided', () => {
      const error = new AuthorizationError();
      
      expect(error.message).toBe('Insufficient permissions to perform this action');
    });
  });
  
  describe('ConflictError', () => {
    it('should create a conflict error with the correct properties', () => {
      const message = 'User already exists';
      const details = { username: 'existing_user' };
      const error = new ConflictError(message, details);
      
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe(message);
      expect(error.code).toBe('CONFLICT_ERROR');
      expect(error.statusCode).toBe(409);
      expect(error.details).toEqual(details);
    });
  });
  
  describe('ServiceUnavailableError', () => {
    it('should create a service unavailable error', () => {
      const serviceName = 'ExternalAPI';
      const details = { timeout: 5000 };
      const error = new ServiceUnavailableError(serviceName, details);
      
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe(`Service ${serviceName} is currently unavailable`);
      expect(error.code).toBe('SERVICE_UNAVAILABLE');
      expect(error.statusCode).toBe(503);
      expect(error.details).toEqual(details);
    });
  });
  
  describe('DatabaseError', () => {
    it('should create a database error', () => {
      const operation = 'insert';
      const details = { table: 'users', error: 'Unique constraint violation' };
      const error = new DatabaseError(operation, details);
      
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe(`Database operation '${operation}' failed`);
      expect(error.code).toBe('DATABASE_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.details).toEqual(details);
    });
  });
  
  describe('ApiError', () => {
    it('should create an API error with the correct status code', () => {
      const message = 'API call failed';
      const statusCode = 429; // Too many requests
      const details = { retryAfter: 60 };
      const error = new ApiError(message, statusCode, details);
      
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe(message);
      expect(error.code).toBe('API_ERROR');
      expect(error.statusCode).toBe(statusCode);
      expect(error.details).toEqual(details);
    });
    
    it('should use default status code when not provided', () => {
      const error = new ApiError('API call failed');
      
      expect(error.statusCode).toBe(500);
    });
  });
  
  describe('isAppError', () => {
    it('should return true for AppError instances', () => {
      const error = new AppError('Test error', 'TEST_ERROR');
      
      expect(isAppError(error)).toBe(true);
    });
    
    it('should return true for derived error types', () => {
      const error = new ValidationError('Validation failed');
      
      expect(isAppError(error)).toBe(true);
    });
    
    it('should return false for standard Error', () => {
      const error = new Error('Standard error');
      
      expect(isAppError(error)).toBe(false);
    });
    
    it('should return false for non-error values', () => {
      expect(isAppError(null)).toBe(false);
      expect(isAppError(undefined)).toBe(false);
      expect(isAppError('error string')).toBe(false);
      expect(isAppError({ message: 'error object' })).toBe(false);
    });
  });
  
  describe('ERROR_MAP', () => {
    it('should map error codes to error classes', () => {
      expect(ERROR_MAP['VALIDATION_ERROR']).toBe(ValidationError);
      expect(ERROR_MAP['NOT_FOUND']).toBe(NotFoundError);
      expect(ERROR_MAP['AUTHENTICATION_ERROR']).toBe(AuthenticationError);
      expect(ERROR_MAP['AUTHORIZATION_ERROR']).toBe(AuthorizationError);
      expect(ERROR_MAP['CONFLICT_ERROR']).toBe(ConflictError);
      expect(ERROR_MAP['SERVICE_UNAVAILABLE']).toBe(ServiceUnavailableError);
      expect(ERROR_MAP['DATABASE_ERROR']).toBe(DatabaseError);
      expect(ERROR_MAP['API_ERROR']).toBe(ApiError);
    });
  });
});