/**
 * Tests for Error Boundary Component
 * 
 * These tests ensure that the error boundary component
 * correctly catches errors and displays fallback UI.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './error-boundary';

// Mock the logger to prevent console output in tests
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('ErrorBoundary', () => {
  // Silence React's error boundary error logging in console
  const originalConsoleError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  
  afterAll(() => {
    console.error = originalConsoleError;
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should render children when no error occurs', () => {
    // Arrange & Act
    render(
      <ErrorBoundary fallback={<div>Something went wrong</div>}>
        <div>Test Content</div>
      </ErrorBoundary>
    );
    
    // Assert
    expect(screen.getByText('Test Content')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });
  
  it('should render fallback UI when error occurs', () => {
    // Component that throws an error during render
    const ComponentWithError = () => {
      throw new Error('Test error');
    };
    
    // Prevent React from logging the error during the test
    const originalError = console.error;
    console.error = jest.fn();
    
    // Arrange & Act
    render(
      <ErrorBoundary fallback={<div>Something went wrong</div>}>
        <ComponentWithError />
      </ErrorBoundary>
    );
    
    // Restore console.error
    console.error = originalError;
    
    // Assert
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
  
  it('should call onError when error occurs', () => {
    // Arrange
    const onError = jest.fn();
    
    // Component that throws an error during render
    const ComponentWithError = () => {
      throw new Error('Test error');
    };
    
    // Prevent React from logging the error during the test
    const originalError = console.error;
    console.error = jest.fn();
    
    // Act
    render(
      <ErrorBoundary 
        fallback={<div>Something went wrong</div>}
        onError={onError}
      >
        <ComponentWithError />
      </ErrorBoundary>
    );
    
    // Restore console.error
    console.error = originalError;
    
    // Assert
    expect(onError).toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    );
  });
  
  it('should handle functional fallback component with error details', () => {
    // Component that throws an error during render
    const ComponentWithError = () => {
      throw new Error('Specific test error');
    };
    
    // Functional fallback component that receives error info
    const FunctionalFallback = ({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) => (
      <div>
        <p>Error occurred: {error.message}</p>
        <button onClick={resetErrorBoundary}>Reset</button>
      </div>
    );
    
    // Prevent React from logging the error during the test
    const originalError = console.error;
    console.error = jest.fn();
    
    // Arrange & Act
    render(
      <ErrorBoundary fallback={FunctionalFallback}>
        <ComponentWithError />
      </ErrorBoundary>
    );
    
    // Restore console.error
    console.error = originalError;
    
    // Assert
    expect(screen.getByText('Error occurred: Specific test error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
  });
  
  it('should log error details when an error occurs', () => {
    // Component that throws an error during render
    const ComponentWithError = () => {
      throw new Error('Test error for logging');
    };
    
    // Get the mocked logger
    const { logger } = require('@/lib/logger');
    
    // Prevent React from logging the error during the test
    const originalError = console.error;
    console.error = jest.fn();
    
    // Arrange & Act
    render(
      <ErrorBoundary fallback={<div>Something went wrong</div>}>
        <ComponentWithError />
      </ErrorBoundary>
    );
    
    // Restore console.error
    console.error = originalError;
    
    // Assert
    expect(logger.error).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      'Error caught by boundary:',
      expect.objectContaining({
        error: expect.stringContaining('Test error for logging'),
        componentStack: expect.any(String)
      })
    );
  });
});