/**
 * Logger utility for consistent logging across the application
 */
export const logger = {
  /**
   * Log an informational message
   * @param message The message to log
   * @param data Optional data to include in the log
   */
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${message}`, data ? data : '');
  },

  /**
   * Log a warning message
   * @param message The message to log
   * @param data Optional data to include in the log
   */
  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${message}`, data ? data : '');
  },

  /**
   * Log an error message
   * @param message The message to log
   * @param error Optional error to include in the log
   */
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error ? error : '');
  },

  /**
   * Log a debug message (only in development)
   * @param message The message to log
   * @param data Optional data to include in the log
   */
  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[DEBUG] ${message}`, data ? data : '');
    }
  }
};