/**
 * Shared Configuration Module
 * 
 * Central place for application configuration that is used by both
 * frontend and backend. This helps ensure consistency across the stack.
 */

/**
 * Application-wide constants
 */
export const APP_CONSTANTS = {
  APP_NAME: 'Requireflow',
  VERSION: '1.0.0',
  COPYRIGHT: `© ${new Date().getFullYear()} Requireflow`,
  SUPPORT_EMAIL: 'support@requireflow.com',
  API_PREFIX: '/api',
};

/**
 * Environment-specific configuration
 * 
 * Note: For frontend, ensure all values are public-safe.
 * For sensitive values, use environment variables in the backend only.
 * 
 * This handles both frontend (import.meta.env) and backend (process.env) environments
 */
export const ENV_CONFIG = {
  IS_DEVELOPMENT: typeof process !== 'undefined' 
    ? process.env.NODE_ENV === 'development'
    : typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.DEV
      : true,
  IS_PRODUCTION: typeof process !== 'undefined'
    ? process.env.NODE_ENV === 'production'
    : typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.PROD
      : false,
  BASE_URL: typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env.BASE_URL || '/'
    : '/',
  API_URL: typeof process !== 'undefined'
    ? process.env.API_URL || '/api'
    : typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.VITE_API_URL || '/api'
      : '/api',
  APP_MODE: typeof process !== 'undefined'
    ? process.env.APP_MODE || 'standard'
    : typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.VITE_APP_MODE || 'standard'
      : 'standard',
};

/**
 * Feature flags
 * 
 * Centralized configuration of feature flags. This makes it easy to
 * enable/disable features across the application.
 */
export const FEATURE_FLAGS = {
  ENABLE_AUTH: true,
  ENABLE_DARK_MODE: true,
  ENABLE_NOTIFICATIONS: true,
  ENABLE_FILE_UPLOADS: true,
  ENABLE_CACHING: true,
  ENABLE_AI_REQUIREMENTS: true,
  ENABLE_ANALYTICS: ENV_CONFIG.IS_PRODUCTION,
  ENABLE_PERFORMANCE_MONITORING: ENV_CONFIG.IS_PRODUCTION,
};

/**
 * Date and time formats
 */
export const DATE_FORMATS = {
  SHORT_DATE: 'MM/dd/yyyy',
  LONG_DATE: 'MMMM d, yyyy',
  TIME: 'h:mm a',
  DATE_TIME: 'MM/dd/yyyy h:mm a',
  ISO_DATE: 'yyyy-MM-dd',
  ISO_DATE_TIME: 'yyyy-MM-dd\'T\'HH:mm:ss',
};

/**
 * Pagination defaults
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  PAGINATION_OPTIONS: [10, 25, 50, 100],
};

/**
 * Validation constraints
 */
export const VALIDATION = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_TITLE_LENGTH: 200,
  MAX_FILE_SIZE_MB: 10,
  ALLOWED_FILE_TYPES: [
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/json',
    'text/csv',
    'image/jpeg',
    'image/png',
  ],
  EMAIL_REGEX: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
};

/**
 * Cache configuration
 */
export const CACHE_CONFIG = {
  DEFAULT_TTL_SECONDS: 300, // 5 minutes
  SHORT_TTL_SECONDS: 60,    // 1 minute
  LONG_TTL_SECONDS: 1800,   // 30 minutes
};

/**
 * HTTP status codes
 */
export const HTTP_STATUS = {
  // Success codes
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  
  // Client error codes
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  
  // Server error codes
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
};

/**
 * Error codes
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT_ERROR: 'CONFLICT_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  API_ERROR: 'API_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
};

/**
 * Demo user configuration
 * 
 * Centralized configuration for demo user settings.
 * This helps eliminate hardcoded values throughout the codebase.
 */
export const DEMO_USER_CONFIG = {
  ENABLED: true,
  USERNAME: 'demo',
  DEFAULT_PASSWORD: 'password',
  FIRST_NAME: 'Demo',
  LAST_NAME: 'User',
  EMAIL: 'demo@example.com',
  COMPANY: 'Demo Company Inc.',
  ROLE: 'admin',
  AUTO_LOGIN: ENV_CONFIG.IS_DEVELOPMENT, // Only auto-login in development
};