/**
 * Tests for useErrorHandler Hook
 * 
 * These tests ensure that our error handling hook
 * correctly handles and processes errors.
 */
import { renderHook, act } from '@testing-library/react';
import { useErrorHandler } from './use-error-handler';

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(() => ({
    toast: {
      error: jest.fn(),
      success: jest.fn(),
      warning: jest.fn(),
    }
  }))
}));

// Mock the logger
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  }
}));

describe('useErrorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should handle a standard Error with default options', () => {
    // Arrange
    const error = new Error('Test error message');
    const { result } = renderHook(() => useErrorHandler());
    const { toast } = require('@/hooks/use-toast').useToast();
    const { logger } = require('@/lib/logger');
    
    // Act
    act(() => {
      result.current.handleError(error);
    });
    
    // Assert
    expect(toast.error).toHaveBeenCalledWith({
      title: 'An error occurred',
      description: 'Test error message',
    });
    expect(logger.error).toHaveBeenCalledWith(
      'Error handled:',
      expect.objectContaining({
        name: 'Error',
        message: 'Test error message',
      })
    );
  });
  
  it('should handle an API error with status code', () => {
    // Arrange
    const apiError = new Error('API error');
    (apiError as any).status = 404;
    (apiError as any).statusText = 'Not Found';
    
    const { result } = renderHook(() => useErrorHandler());
    const { toast } = require('@/hooks/use-toast').useToast();
    
    // Act
    act(() => {
      result.current.handleError(apiError);
    });
    
    // Assert
    expect(toast.error).toHaveBeenCalledWith({
      title: 'API Error (404)',
      description: 'API error',
    });
  });
  
  it('should use custom toast title and description when provided', () => {
    // Arrange
    const error = new Error('Internal error');
    const { result } = renderHook(() => useErrorHandler());
    const { toast } = require('@/hooks/use-toast').useToast();
    
    // Act
    act(() => {
      result.current.handleError(error, {
        toastTitle: 'Custom Error Title',
        toastDescription: 'Custom error description',
      });
    });
    
    // Assert
    expect(toast.error).toHaveBeenCalledWith({
      title: 'Custom Error Title',
      description: 'Custom error description',
    });
  });
  
  it('should not show toast when showToast option is false', () => {
    // Arrange
    const error = new Error('Silent error');
    const { result } = renderHook(() => useErrorHandler());
    const { toast } = require('@/hooks/use-toast').useToast();
    const { logger } = require('@/lib/logger');
    
    // Act
    act(() => {
      result.current.handleError(error, {
        showToast: false,
      });
    });
    
    // Assert
    expect(toast.error).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalled(); // Still logs the error
  });
  
  it('should call the onError callback when provided', () => {
    // Arrange
    const error = new Error('Callback error');
    const onError = jest.fn();
    const { result } = renderHook(() => useErrorHandler());
    
    // Act
    act(() => {
      result.current.handleError(error, {
        onError,
      });
    });
    
    // Assert
    expect(onError).toHaveBeenCalledWith(error);
  });
  
  it('should handle non-Error objects', () => {
    // Arrange
    const nonError = { message: 'Not a real error' };
    const { result } = renderHook(() => useErrorHandler());
    const { toast } = require('@/hooks/use-toast').useToast();
    const { logger } = require('@/lib/logger');
    
    // Act
    act(() => {
      result.current.handleError(nonError as any);
    });
    
    // Assert
    expect(toast.error).toHaveBeenCalledWith({
      title: 'An error occurred',
      description: 'An unknown error occurred',
    });
    expect(logger.error).toHaveBeenCalledWith(
      'Error handled:',
      expect.objectContaining({
        message: 'Not a real error',
      })
    );
  });
  
  it('should handle string errors', () => {
    // Arrange
    const errorString = 'String error message';
    const { result } = renderHook(() => useErrorHandler());
    const { toast } = require('@/hooks/use-toast').useToast();
    
    // Act
    act(() => {
      result.current.handleError(errorString as any);
    });
    
    // Assert
    expect(toast.error).toHaveBeenCalledWith({
      title: 'An error occurred',
      description: 'String error message',
    });
  });
  
  it('should handle network errors with special formatting', () => {
    // Arrange
    const networkError = new Error('Network error');
    (networkError as any).code = 'ECONNREFUSED';
    
    const { result } = renderHook(() => useErrorHandler());
    const { toast } = require('@/hooks/use-toast').useToast();
    
    // Act
    act(() => {
      result.current.handleError(networkError);
    });
    
    // Assert
    expect(toast.error).toHaveBeenCalledWith({
      title: 'Network Error',
      description: 'Network error',
    });
  });
  
  it('should use custom log level when provided', () => {
    // Arrange
    const error = new Error('Warning level error');
    const { result } = renderHook(() => useErrorHandler());
    const { logger } = require('@/lib/logger');
    
    // Act
    act(() => {
      result.current.handleError(error, {
        logLevel: 'warn',
      });
    });
    
    // Assert
    expect(logger.warn).toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });
});