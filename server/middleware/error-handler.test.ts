/**
 * Tests for Error Handler Middleware
 * 
 * These tests ensure that our error handler middleware
 * correctly processes different types of errors.
 */
import { ZodError, z } from 'zod';
import { errorHandler, notFoundHandler } from './error-handler';
import { 
  AppError, 
  ValidationError, 
  NotFoundError,
  AuthenticationError 
} from '../error/error-types';
import { 
  createMockRequest, 
  createMockResponse, 
  createMockNext 
} from '../__tests__/test-utils';

// Mock the logger to prevent console output in tests
jest.mock('../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock the environment functions
jest.mock('../utils/environment', () => ({
  isDevelopment: jest.fn(() => false),
  isProduction: jest.fn(() => true),
  isTest: jest.fn(() => false),
  getEnvironment: jest.fn(() => 'production'),
  Environment: {
    DEVELOPMENT: 'development',
    PRODUCTION: 'production',
    TEST: 'test',
  },
}));

// Mock formatZodError
jest.mock('../utils/validation-utils', () => ({
  formatZodError: jest.fn(() => ({
    email: ['Invalid email format'],
    password: ['Password is too short'],
  })),
}));

describe('Error Handler Middleware', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('errorHandler', () => {
    it('should handle AppError instances correctly', () => {
      // Arrange
      const error = new AppError('Test error', 'TEST_ERROR', 418, true);
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      
      // Act
      errorHandler(error, req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(418);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 'TEST_ERROR',
        message: 'Test error',
        statusCode: 418,
      }));
    });
    
    it('should handle ValidationError instances with validation errors', () => {
      // Arrange
      const validationErrors = {
        email: ['Email is required'],
        password: ['Password must be at least 8 characters'],
      };
      const error = new ValidationError('Validation failed', validationErrors);
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      
      // Act
      errorHandler(error, req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        statusCode: 400,
        validationErrors,
      }));
    });
    
    it('should handle ZodError by converting it to a ValidationError', () => {
      // Arrange
      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(8),
      });
      
      const error = new ZodError([]);
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      
      // Act
      errorHandler(error, req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        statusCode: 400,
        validationErrors: expect.any(Object),
      }));
    });
    
    it('should handle regular Error by converting it to an AppError', () => {
      // Arrange
      const error = new Error('Standard error');
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      
      // Act
      errorHandler(error, req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 'INTERNAL_SERVER_ERROR',
        statusCode: 500,
      }));
    });
    
    it('should handle SyntaxError by converting it to a ValidationError', () => {
      // Arrange
      const error = new SyntaxError('Invalid JSON');
      error.name = 'SyntaxError'; // Ensure name is set correctly
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      
      // Act
      errorHandler(error, req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 'VALIDATION_ERROR',
        statusCode: 400,
      }));
    });
    
    it('should identify and handle database errors', () => {
      // Arrange
      const error = new Error('The database operation failed due to a foreign key constraint');
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      
      // Act
      errorHandler(error, req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 'DATABASE_ERROR',
        statusCode: 500,
      }));
    });
    
    it('should include request path in the error response', () => {
      // Arrange
      const error = new NotFoundError('User', 123);
      const req = createMockRequest();
      req.path = '/api/users/123';
      const res = createMockResponse();
      const next = createMockNext();
      
      // Act
      errorHandler(error, req, res, next);
      
      // Assert
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        path: '/api/users/123',
      }));
    });
    
    it('should include a requestId in the error response', () => {
      // Arrange
      const error = new AppError('Test error', 'TEST_ERROR');
      const req = createMockRequest({
        headers: { 'x-request-id': 'test-request-id' },
      });
      const res = createMockResponse();
      const next = createMockNext();
      
      // Act
      errorHandler(error, req, res, next);
      
      // Assert
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        requestId: 'test-request-id',
      }));
    });
    
    it('should generate a requestId if not provided in headers', () => {
      // Arrange
      const error = new AppError('Test error', 'TEST_ERROR');
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      
      // Act
      errorHandler(error, req, res, next);
      
      // Assert
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        requestId: expect.stringMatching(/^req-\d+-[a-z0-9]+$/),
      }));
    });
  });
  
  describe('notFoundHandler', () => {
    it('should create a not found error and pass it to next', () => {
      // Arrange
      const req = createMockRequest();
      req.method = 'GET';
      req.path = '/api/unknown-route';
      const res = createMockResponse();
      const next = createMockNext();
      
      // Act
      notFoundHandler(req, res, next);
      
      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        code: 'NOT_FOUND',
        statusCode: 404,
        message: 'Route not found: GET /api/unknown-route',
      }));
    });
  });
});