/**
 * Logger utility for consistent logging throughout the application
 * 
 * This provides a standardized interface for logging messages with different 
 * severity levels and consistent formatting.
 */

// Log levels
enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG'
}

// Utility function to format date/time consistently
function formatTimestamp(): string {
  return new Date().toLocaleTimeString();
}

// Format a log message with timestamp and level
function formatLog(level: LogLevel, message: string, ...args: any[]): string {
  const timestamp = formatTimestamp();
  return `${timestamp} [${level}] ${message}`;
}

// Logger interface implementation
export const logger = {
  /**
   * Log an error message
   * @param message The message to log
   * @param args Optional arguments to include
   */
  error(message: string, ...args: any[]): void {
    console.error(formatLog(LogLevel.ERROR, message), ...args);
  },

  /**
   * Log a warning message
   * @param message The message to log
   * @param args Optional arguments to include
   */
  warn(message: string, ...args: any[]): void {
    console.warn(formatLog(LogLevel.WARN, message), ...args);
  },

  /**
   * Log an informational message
   * @param message The message to log
   * @param args Optional arguments to include
   */
  info(message: string, ...args: any[]): void {
    console.log(formatLog(LogLevel.INFO, message), ...args);
  },

  /**
   * Log a debug message
   * @param message The message to log
   * @param args Optional arguments to include
   */
  debug(message: string, ...args: any[]): void {
    // Only log debug messages in development environment
    if (process.env.NODE_ENV !== 'production') {
      console.debug(formatLog(LogLevel.DEBUG, message), ...args);
    }
  }
};