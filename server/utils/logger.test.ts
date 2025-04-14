/**
 * Tests for Logger Utility
 * 
 * These tests ensure that our logger utility correctly
 * formats and outputs log messages with the right levels.
 */
import { logger, LogLevel } from './logger';

describe('Logger', () => {
  // Store original console methods
  const originalConsole = {
    debug: console.debug,
    info: console.info,
    warn: console.warn,
    error: console.error,
  };
  
  // Setup mocks for console methods
  beforeAll(() => {
    console.debug = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });
  
  // Restore original console methods
  afterAll(() => {
    console.debug = originalConsole.debug;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  });
  
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should log debug messages correctly', () => {
    // Arrange & Act
    logger.debug('Debug message');
    
    // Assert
    expect(console.debug).toHaveBeenCalledWith(
      expect.stringContaining('[DEBUG]'),
      'Debug message'
    );
  });
  
  it('should log info messages correctly', () => {
    // Arrange & Act
    logger.info('Info message');
    
    // Assert
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining('[INFO]'),
      'Info message'
    );
  });
  
  it('should log warning messages correctly', () => {
    // Arrange & Act
    logger.warn('Warning message');
    
    // Assert
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('[WARN]'),
      'Warning message'
    );
  });
  
  it('should log error messages correctly', () => {
    // Arrange & Act
    logger.error('Error message');
    
    // Assert
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('[ERROR]'),
      'Error message'
    );
  });
  
  it('should include metadata in log messages', () => {
    // Arrange
    const metadata = { userId: 123, action: 'login' };
    
    // Act
    logger.info(metadata, 'User action');
    
    // Assert
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining('[INFO]'),
      metadata,
      'User action'
    );
  });
  
  it('should format Error objects correctly', () => {
    // Arrange
    const error = new Error('Test error');
    error.stack = 'Error: Test error\n    at TestFunction';
    
    // Act
    logger.error(error);
    
    // Assert
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('[ERROR]'),
      expect.objectContaining({
        name: 'Error',
        message: 'Test error',
        stack: expect.stringContaining('Error: Test error')
      })
    );
  });
  
  it('should handle log messages with multiple arguments', () => {
    // Arrange & Act
    logger.info('Message with', 'multiple', 'arguments');
    
    // Assert
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining('[INFO]'),
      'Message with',
      'multiple',
      'arguments'
    );
  });
  
  it('should include timestamp in the log prefix', () => {
    // Arrange & Act
    logger.info('Timestamped message');
    
    // Assert
    // Match format like [INFO] 2025-04-14T03:45:12.345Z
    expect(console.info).toHaveBeenCalledWith(
      expect.stringMatching(/\[INFO\] \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/),
      'Timestamped message'
    );
  });
  
  it('should handle objects with circular references', () => {
    // Arrange
    const circularObj: any = { name: 'circular' };
    circularObj.self = circularObj; // Create circular reference
    
    // Act - this should not throw an error
    logger.info(circularObj, 'Object with circular reference');
    
    // Assert
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining('[INFO]'),
      expect.objectContaining({ name: 'circular' }),
      'Object with circular reference'
    );
  });
  
  it('should handle logging without any arguments', () => {
    // Act - this should not throw an error
    logger.info();
    
    // Assert
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining('[INFO]')
    );
  });
});