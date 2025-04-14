/**
 * Frontend Logger Utility
 * 
 * Provides a standardized way to log messages in the frontend.
 * This helps ensure consistent logging patterns and enables
 * potential future enhancements like remote logging.
 */
import { ENV_CONFIG } from '@shared/config';

/**
 * Log level enum
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

/**
 * Log data interface
 */
interface LogData {
  message: string;
  [key: string]: any;
}

/**
 * Configuration for the logger
 */
interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  redactKeys: string[];
  applicationName: string;
  version: string;
}

// Default configuration based on environment
const defaultConfig: LoggerConfig = {
  minLevel: ENV_CONFIG.IS_PRODUCTION ? LogLevel.INFO : LogLevel.DEBUG,
  enableConsole: true,
  redactKeys: ['password', 'token', 'secret', 'apiKey', 'authorization'],
  applicationName: 'Requireflow',
  version: '1.0.0',
};

/**
 * Frontend logger class
 */
class Logger {
  private config: LoggerConfig;
  
  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }
  
  /**
   * Log an error message
   */
  error(message: string, data: Record<string, any> = {}): void {
    this.log(LogLevel.ERROR, message, data);
  }
  
  /**
   * Log a warning message
   */
  warn(message: string, data: Record<string, any> = {}): void {
    this.log(LogLevel.WARN, message, data);
  }
  
  /**
   * Log an info message
   */
  info(message: string, data: Record<string, any> = {}): void {
    this.log(LogLevel.INFO, message, data);
  }
  
  /**
   * Log a debug message
   */
  debug(message: string, data: Record<string, any> = {}): void {
    this.log(LogLevel.DEBUG, message, data);
  }
  
  /**
   * Log a message with metadata
   */
  private log(level: LogLevel, message: string, data: Record<string, any> = {}): void {
    // Skip logging if below minimum level
    if (!this.shouldLog(level)) {
      return;
    }
    
    // Format log data
    const logData: LogData = {
      message,
      timestamp: new Date().toISOString(),
      level,
      ...this.redactSensitiveData(data),
      app: this.config.applicationName,
      version: this.config.version,
      url: window.location.href,
    };
    
    // Log to console if enabled
    if (this.config.enableConsole) {
      this.logToConsole(level, logData);
    }
    
    // In a real application, you might also send logs to a service like Sentry,
    // LogRocket, or your own backend API. This would be implemented here.
  }
  
  /**
   * Determine if a log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG];
    const configLevelIndex = levels.indexOf(this.config.minLevel);
    const requestedLevelIndex = levels.indexOf(level);
    
    return requestedLevelIndex <= configLevelIndex;
  }
  
  /**
   * Redact sensitive data from logs
   */
  private redactSensitiveData(data: Record<string, any>): Record<string, any> {
    const redacted = { ...data };
    
    // Recursive function to redact sensitive keys
    const redactKeys = (obj: Record<string, any>, keys: string[]): void => {
      if (!obj || typeof obj !== 'object') return;
      
      Object.keys(obj).forEach(key => {
        // Check if this key should be redacted
        if (keys.some(k => key.toLowerCase().includes(k.toLowerCase()))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          // Recursively check nested objects
          redactKeys(obj[key], keys);
        }
      });
    };
    
    redactKeys(redacted, this.config.redactKeys);
    return redacted;
  }
  
  /**
   * Log to console with appropriate styling
   */
  private logToConsole(level: LogLevel, data: LogData): void {
    const { message, ...rest } = data;
    
    // Color styles for different log levels
    const styles = {
      [LogLevel.ERROR]: 'color: #FF5252; font-weight: bold;',
      [LogLevel.WARN]: 'color: #FFC107; font-weight: bold;',
      [LogLevel.INFO]: 'color: #2196F3; font-weight: bold;',
      [LogLevel.DEBUG]: 'color: #4CAF50; font-weight: bold;',
    };
    
    // Log with appropriate console method and styling
    console[level](
      `%c${data.timestamp} [${level.toUpperCase()}]%c ${message}`,
      styles[level],
      'color: inherit',
      rest
    );
  }
}

// Export a singleton logger instance
export const logger = new Logger();

// Also export the class for custom instances
export { Logger };