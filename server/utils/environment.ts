/**
 * Environment Utilities
 * 
 * Provides helper functions for working with environment variables
 * and determining the current execution environment.
 */

/**
 * Possible application environments
 */
export enum Environment {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
  TEST = 'test',
}

/**
 * Get the current application environment
 * @returns The current environment
 */
export function getEnvironment(): Environment {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env.toLowerCase()) {
    case 'production':
      return Environment.PRODUCTION;
    case 'test':
      return Environment.TEST;
    default:
      return Environment.DEVELOPMENT;
  }
}

/**
 * Check if the application is running in development mode
 * @returns True if in development mode
 */
export function isDevelopment(): boolean {
  return getEnvironment() === Environment.DEVELOPMENT;
}

/**
 * Check if the application is running in production mode
 * @returns True if in production mode
 */
export function isProduction(): boolean {
  return getEnvironment() === Environment.PRODUCTION;
}

/**
 * Check if the application is running in test mode
 * @returns True if in test mode
 */
export function isTest(): boolean {
  return getEnvironment() === Environment.TEST;
}

/**
 * Get a required environment variable
 * @param name The name of the environment variable
 * @returns The value of the environment variable
 * @throws Error if the environment variable is not set
 */
export function getRequiredEnv(name: string): string {
  const value = process.env[name];
  
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  
  return value;
}

/**
 * Get an optional environment variable with a default value
 * @param name The name of the environment variable
 * @param defaultValue The default value to use if the environment variable is not set
 * @returns The value of the environment variable or the default value
 */
export function getOptionalEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

/**
 * Get a boolean environment variable
 * @param name The name of the environment variable
 * @param defaultValue The default value to use if the environment variable is not set
 * @returns The boolean value of the environment variable
 */
export function getBooleanEnv(name: string, defaultValue: boolean = false): boolean {
  const value = process.env[name];
  
  if (value === undefined) {
    return defaultValue;
  }
  
  return ['true', '1', 'yes'].includes(value.toLowerCase());
}

/**
 * Get an integer environment variable
 * @param name The name of the environment variable
 * @param defaultValue The default value to use if the environment variable is not set
 * @returns The integer value of the environment variable
 */
export function getIntEnv(name: string, defaultValue: number): number {
  const value = process.env[name];
  
  if (value === undefined) {
    return defaultValue;
  }
  
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}