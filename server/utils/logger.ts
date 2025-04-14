/**
 * Logger Utility
 * 
 * Provides a standardized logging interface for the application.
 * Using a wrapper around console logging for now, but can be easily
 * replaced with a more robust logging solution like Winston or Pino.
 */

/**
 * LogLevel enum for different logging levels
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

/**
 * Logger interface
 */
export interface Logger {
  error(data: any, message?: string): void;
  warn(data: any, message?: string): void;
  info(data: any, message?: string): void;
  debug(data: any, message?: string): void;
}

/**
 * Current log level based on environment
 */
const currentLogLevel = process.env.LOG_LEVEL || 
  (process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG);

/**
 * Simple console logger
 */
class ConsoleLogger implements Logger {
  /**
   * Log an error message
   */
  error(data: any, message?: string): void {
    this.log(LogLevel.ERROR, data, message);
  }

  /**
   * Log a warning message
   */
  warn(data: any, message?: string): void {
    this.log(LogLevel.WARN, data, message);
  }

  /**
   * Log an info message
   */
  info(data: any, message?: string): void {
    this.log(LogLevel.INFO, data, message);
  }

  /**
   * Log a debug message
   */
  debug(data: any, message?: string): void {
    this.log(LogLevel.DEBUG, data, message);
  }

  /**
   * Internal logging method
   */
  private log(level: LogLevel, data: any, message?: string): void {
    // Skip logging if the current level is higher than the requested level
    if (!this.shouldLog(level)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const logPrefix = `[${timestamp}] [${level.toUpperCase()}]`;

    if (message) {
      // If we have a message, log it alongside the data
      console[level](`${logPrefix}: ${message}`, data);
    } else if (typeof data === 'string') {
      // If data is a string and no message, treat data as the message
      console[level](`${logPrefix}: ${data}`);
    } else {
      // Otherwise, log the data with a generic prefix
      console[level](`${logPrefix}:`, data);
    }
  }

  /**
   * Determine if we should log at this level
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG];
    const currentIndex = levels.indexOf(currentLogLevel as LogLevel);
    const requestedIndex = levels.indexOf(level);
    
    // Log only if the requested level is less than or equal to the current level
    // (ERROR is highest priority, DEBUG is lowest)
    return requestedIndex <= currentIndex;
  }
}

/**
 * Export a singleton logger instance
 */
export const logger: Logger = new ConsoleLogger();