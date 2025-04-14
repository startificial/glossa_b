/**
 * Tests for Security Middleware
 * 
 * These tests ensure that our security middleware functions
 * correctly apply the expected security measures.
 */
import { rateLimiter, corsConfig, requestLogger } from './security';
import { 
  createMockRequest,
  createMockResponse,
  createMockNext,
} from '../__tests__/test-utils';

// Mock config
jest.mock('../config', () => ({
  config: {
    server: {
      corsOrigin: 'https://example.com',
    },
    features: {
      enableRateLimiting: true,
    },
  },
}));

// Mock environment utilities
jest.mock('../utils/environment', () => ({
  getEnvironment: jest.fn(() => 'production'),
  Environment: {
    DEVELOPMENT: 'development',
    PRODUCTION: 'production',
    TEST: 'test',
  },
}));

// Mock logger
jest.mock('../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Security Middleware', () => {
  // Clear mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('rateLimiter', () => {
    it('should call next function', () => {
      // Arrange
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      
      // Act
      rateLimiter(req, res, next);
      
      // Assert
      expect(next).toHaveBeenCalled();
    });
    
    it('should log a debug message about rate limiting', () => {
      // Arrange
      const req = createMockRequest();
      req.path = '/api/test';
      req.ip = '127.0.0.1';
      const res = createMockResponse();
      const next = createMockNext();
      const { logger } = require('../utils/logger');
      
      // Act
      rateLimiter(req, res, next);
      
      // Assert
      expect(logger.debug).toHaveBeenCalledWith(expect.objectContaining({
        path: '/api/test',
        ip: '127.0.0.1',
      }));
    });
  });
  
  describe('corsConfig', () => {
    it('should set CORS headers', () => {
      // Arrange
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      
      // Act
      corsConfig(req, res, next);
      
      // Assert
      expect(res.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://example.com');
      expect(res.header).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
      expect(res.header).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      expect(res.header).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
      expect(next).toHaveBeenCalled();
    });
    
    it('should handle OPTIONS requests by sending 204 status', () => {
      // Arrange
      const req = createMockRequest();
      req.method = 'OPTIONS';
      const res = createMockResponse();
      const next = createMockNext();
      
      // Act
      corsConfig(req, res, next);
      
      // Assert
      expect(res.sendStatus).toHaveBeenCalledWith(204);
      expect(next).not.toHaveBeenCalled();
    });
  });
  
  describe('requestLogger', () => {
    it('should log request details and call next', () => {
      // Arrange
      const req = createMockRequest();
      req.method = 'GET';
      req.path = '/api/test';
      req.ip = '127.0.0.1';
      req.get = jest.fn().mockReturnValue('Test User Agent');
      const res = createMockResponse();
      const next = createMockNext();
      const { logger } = require('../utils/logger');
      
      // Act
      requestLogger(req, res, next);
      
      // Assert
      expect(logger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          path: '/api/test',
          ip: '127.0.0.1',
          userAgent: 'Test User Agent',
        }),
        'Incoming request'
      );
      expect(next).toHaveBeenCalled();
    });
    
    it('should log response details when response is finished', () => {
      // Arrange
      jest.useFakeTimers();
      const req = createMockRequest();
      req.method = 'GET';
      req.path = '/api/test';
      
      const res = createMockResponse();
      res.statusCode = 200;
      res.on = jest.fn().mockImplementation((event, callback) => {
        if (event === 'finish') {
          // Simulate the 'finish' event after 100ms
          setTimeout(() => callback(), 100);
        }
        return res;
      });
      
      const next = createMockNext();
      const { logger } = require('../utils/logger');
      
      // Act
      requestLogger(req, res, next);
      
      // Advance timers to trigger the 'finish' event
      jest.advanceTimersByTime(100);
      
      // Assert
      expect(logger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          path: '/api/test',
          statusCode: 200,
          duration: expect.stringMatching(/^\d+ms$/),
        }),
        'Request completed'
      );
      
      // Clean up
      jest.useRealTimers();
    });
    
    it('should log error response with appropriate log level', () => {
      // Arrange
      jest.useFakeTimers();
      const req = createMockRequest();
      req.method = 'POST';
      req.path = '/api/test';
      
      const res = createMockResponse();
      res.statusCode = 500;
      res.on = jest.fn().mockImplementation((event, callback) => {
        if (event === 'finish') {
          // Simulate the 'finish' event after 100ms
          setTimeout(() => callback(), 100);
        }
        return res;
      });
      
      const next = createMockNext();
      const { logger } = require('../utils/logger');
      
      // Act
      requestLogger(req, res, next);
      
      // Advance timers to trigger the 'finish' event
      jest.advanceTimersByTime(100);
      
      // Assert
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          path: '/api/test',
          statusCode: 500,
          duration: expect.stringMatching(/^\d+ms$/),
        }),
        'Server error response'
      );
      
      // Clean up
      jest.useRealTimers();
    });
    
    it('should log client error responses with warn level', () => {
      // Arrange
      jest.useFakeTimers();
      const req = createMockRequest();
      req.method = 'GET';
      req.path = '/api/nonexistent';
      
      const res = createMockResponse();
      res.statusCode = 404;
      res.on = jest.fn().mockImplementation((event, callback) => {
        if (event === 'finish') {
          // Simulate the 'finish' event after 100ms
          setTimeout(() => callback(), 100);
        }
        return res;
      });
      
      const next = createMockNext();
      const { logger } = require('../utils/logger');
      
      // Act
      requestLogger(req, res, next);
      
      // Advance timers to trigger the 'finish' event
      jest.advanceTimersByTime(100);
      
      // Assert
      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          path: '/api/nonexistent',
          statusCode: 404,
          duration: expect.stringMatching(/^\d+ms$/),
        }),
        'Client error response'
      );
      
      // Clean up
      jest.useRealTimers();
    });
  });
});