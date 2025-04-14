/**
 * Tests for Environment Utility
 * 
 * These tests ensure that our environment utility correctly
 * identifies the current environment and manages environment variables.
 */
import { 
  Environment, 
  getEnvironment, 
  isDevelopment, 
  isProduction, 
  isTest,
  getEnvVar,
  getRequiredEnvVar,
  getBooleanEnvVar
} from './environment';

describe('Environment Utilities', () => {
  // Store original process.env
  const originalEnv = process.env;
  
  beforeEach(() => {
    // Reset process.env before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });
  
  afterAll(() => {
    // Restore original process.env
    process.env = originalEnv;
  });
  
  describe('getEnvironment', () => {
    it('should return DEVELOPMENT when NODE_ENV is development', () => {
      // Arrange
      process.env.NODE_ENV = 'development';
      
      // Act
      const result = getEnvironment();
      
      // Assert
      expect(result).toBe(Environment.DEVELOPMENT);
    });
    
    it('should return PRODUCTION when NODE_ENV is production', () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      
      // Act
      const result = getEnvironment();
      
      // Assert
      expect(result).toBe(Environment.PRODUCTION);
    });
    
    it('should return TEST when NODE_ENV is test', () => {
      // Arrange
      process.env.NODE_ENV = 'test';
      
      // Act
      const result = getEnvironment();
      
      // Assert
      expect(result).toBe(Environment.TEST);
    });
    
    it('should default to DEVELOPMENT when NODE_ENV is not set', () => {
      // Arrange
      delete process.env.NODE_ENV;
      
      // Act
      const result = getEnvironment();
      
      // Assert
      expect(result).toBe(Environment.DEVELOPMENT);
    });
    
    it('should default to DEVELOPMENT for unknown NODE_ENV values', () => {
      // Arrange
      process.env.NODE_ENV = 'unknown';
      
      // Act
      const result = getEnvironment();
      
      // Assert
      expect(result).toBe(Environment.DEVELOPMENT);
    });
  });
  
  describe('Environment checks', () => {
    it('isDevelopment should return true when in development environment', () => {
      // Arrange
      process.env.NODE_ENV = 'development';
      
      // Act & Assert
      expect(isDevelopment()).toBe(true);
      expect(isProduction()).toBe(false);
      expect(isTest()).toBe(false);
    });
    
    it('isProduction should return true when in production environment', () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      
      // Act & Assert
      expect(isDevelopment()).toBe(false);
      expect(isProduction()).toBe(true);
      expect(isTest()).toBe(false);
    });
    
    it('isTest should return true when in test environment', () => {
      // Arrange
      process.env.NODE_ENV = 'test';
      
      // Act & Assert
      expect(isDevelopment()).toBe(false);
      expect(isProduction()).toBe(false);
      expect(isTest()).toBe(true);
    });
  });
  
  describe('getEnvVar', () => {
    it('should return environment variable when it exists', () => {
      // Arrange
      process.env.TEST_VAR = 'test-value';
      
      // Act
      const result = getEnvVar('TEST_VAR');
      
      // Assert
      expect(result).toBe('test-value');
    });
    
    it('should return default value when environment variable does not exist', () => {
      // Arrange
      delete process.env.MISSING_VAR;
      
      // Act
      const result = getEnvVar('MISSING_VAR', 'default-value');
      
      // Assert
      expect(result).toBe('default-value');
    });
    
    it('should return undefined when environment variable does not exist and no default provided', () => {
      // Arrange
      delete process.env.MISSING_VAR;
      
      // Act
      const result = getEnvVar('MISSING_VAR');
      
      // Assert
      expect(result).toBeUndefined();
    });
  });
  
  describe('getRequiredEnvVar', () => {
    it('should return environment variable when it exists', () => {
      // Arrange
      process.env.REQUIRED_VAR = 'required-value';
      
      // Act
      const result = getRequiredEnvVar('REQUIRED_VAR');
      
      // Assert
      expect(result).toBe('required-value');
    });
    
    it('should throw error when required environment variable does not exist', () => {
      // Arrange
      delete process.env.MISSING_REQUIRED_VAR;
      
      // Act & Assert
      expect(() => getRequiredEnvVar('MISSING_REQUIRED_VAR')).toThrow();
      expect(() => getRequiredEnvVar('MISSING_REQUIRED_VAR')).toThrow('Required environment variable MISSING_REQUIRED_VAR is not set');
    });
  });
  
  describe('getBooleanEnvVar', () => {
    it('should return true for "true" string values', () => {
      // Arrange
      process.env.BOOLEAN_VAR = 'true';
      
      // Act
      const result = getBooleanEnvVar('BOOLEAN_VAR');
      
      // Assert
      expect(result).toBe(true);
    });
    
    it('should return true for "TRUE" string values (case insensitive)', () => {
      // Arrange
      process.env.BOOLEAN_VAR = 'TRUE';
      
      // Act
      const result = getBooleanEnvVar('BOOLEAN_VAR');
      
      // Assert
      expect(result).toBe(true);
    });
    
    it('should return true for "1" string values', () => {
      // Arrange
      process.env.BOOLEAN_VAR = '1';
      
      // Act
      const result = getBooleanEnvVar('BOOLEAN_VAR');
      
      // Assert
      expect(result).toBe(true);
    });
    
    it('should return false for "false" string values', () => {
      // Arrange
      process.env.BOOLEAN_VAR = 'false';
      
      // Act
      const result = getBooleanEnvVar('BOOLEAN_VAR');
      
      // Assert
      expect(result).toBe(false);
    });
    
    it('should return false for "FALSE" string values (case insensitive)', () => {
      // Arrange
      process.env.BOOLEAN_VAR = 'FALSE';
      
      // Act
      const result = getBooleanEnvVar('BOOLEAN_VAR');
      
      // Assert
      expect(result).toBe(false);
    });
    
    it('should return false for "0" string values', () => {
      // Arrange
      process.env.BOOLEAN_VAR = '0';
      
      // Act
      const result = getBooleanEnvVar('BOOLEAN_VAR');
      
      // Assert
      expect(result).toBe(false);
    });
    
    it('should return false for any non-truthy string values', () => {
      // Arrange
      process.env.BOOLEAN_VAR = 'some-value';
      
      // Act
      const result = getBooleanEnvVar('BOOLEAN_VAR');
      
      // Assert
      expect(result).toBe(false);
    });
    
    it('should return default value when environment variable does not exist', () => {
      // Arrange
      delete process.env.MISSING_BOOLEAN_VAR;
      
      // Act
      const result = getBooleanEnvVar('MISSING_BOOLEAN_VAR', true);
      
      // Assert
      expect(result).toBe(true);
    });
    
    it('should return false when environment variable does not exist and no default provided', () => {
      // Arrange
      delete process.env.MISSING_BOOLEAN_VAR;
      
      // Act
      const result = getBooleanEnvVar('MISSING_BOOLEAN_VAR');
      
      // Assert
      expect(result).toBe(false);
    });
  });
});