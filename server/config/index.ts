/**
 * Backend Configuration Module
 * 
 * This module centralizes all configuration settings for the server application,
 * providing a single point of access for configuration values throughout the codebase.
 * It loads values from environment variables with sensible defaults.
 */
import path from 'path';
import { 
  getRequiredEnv, 
  getOptionalEnv, 
  getBooleanEnv,
  getIntEnv,
  getEnvironment,
  Environment
} from '../utils/environment';
import { APP_CONSTANTS, CACHE_CONFIG } from '@shared/config';

/**
 * Server configuration
 */
export const serverConfig = {
  env: getEnvironment(),
  port: getIntEnv('PORT', 5000),
  host: getOptionalEnv('HOST', '0.0.0.0'),
  apiPrefix: getOptionalEnv('API_PREFIX', APP_CONSTANTS.API_PREFIX),
  corsOrigin: getOptionalEnv('CORS_ORIGIN', '*'),
  trustProxy: getBooleanEnv('TRUST_PROXY', true),
  
  // Used for rate limiting, cookies, etc.
  appName: getOptionalEnv('APP_NAME', APP_CONSTANTS.APP_NAME),
  appVersion: getOptionalEnv('APP_VERSION', APP_CONSTANTS.VERSION),
  
  // Security settings
  cookieSecret: getOptionalEnv('COOKIE_SECRET', 'dev-cookie-secret'),
  sessionSecret: getOptionalEnv('SESSION_SECRET', 'dev-session-secret'),
  jwtSecret: getOptionalEnv('JWT_SECRET', 'dev-jwt-secret'),
  
  // Rate limiting
  rateLimitWindow: getIntEnv('RATE_LIMIT_WINDOW', 15 * 60 * 1000), // 15 minutes
  rateLimitMax: getIntEnv('RATE_LIMIT_MAX', 100), // 100 requests per window
};

/**
 * Database configuration
 */
export const dbConfig = {
  url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres',
  useSSL: getBooleanEnv('DB_USE_SSL', getEnvironment() === Environment.PRODUCTION),
  poolMin: getIntEnv('DB_POOL_MIN', 2),
  poolMax: getIntEnv('DB_POOL_MAX', 10),
  
  // Schema settings
  schema: getOptionalEnv('DB_SCHEMA', 'public'),
  
  // For session storage
  sessionTable: getOptionalEnv('SESSION_TABLE', 'sessions'),
};

/**
 * Cache configuration
 */
export const cacheConfig = {
  enabled: getBooleanEnv('CACHE_ENABLED', true),
  defaultTtl: getIntEnv('CACHE_DEFAULT_TTL', CACHE_CONFIG.DEFAULT_TTL_SECONDS) * 1000,
  shortTtl: getIntEnv('CACHE_SHORT_TTL', CACHE_CONFIG.SHORT_TTL_SECONDS) * 1000,
  longTtl: getIntEnv('CACHE_LONG_TTL', CACHE_CONFIG.LONG_TTL_SECONDS) * 1000,
};

/**
 * Storage configuration for file uploads
 */
export const storageConfig = {
  uploadsDir: getOptionalEnv('UPLOADS_DIR', path.join(process.cwd(), 'uploads')),
  maxFileSize: getIntEnv('MAX_FILE_SIZE', 10) * 1024 * 1024, // 10MB default
  tempDir: getOptionalEnv('TEMP_DIR', path.join(process.cwd(), 'tmp')),
};

/**
 * Logging configuration
 */
export const loggingConfig = {
  level: getOptionalEnv('LOG_LEVEL', getEnvironment() === Environment.PRODUCTION ? 'info' : 'debug'),
  format: getOptionalEnv('LOG_FORMAT', getEnvironment() === Environment.PRODUCTION ? 'json' : 'pretty'),
  enableConsole: getBooleanEnv('LOG_CONSOLE', true),
  enableFile: getBooleanEnv('LOG_FILE', false),
  filePath: getOptionalEnv('LOG_FILE_PATH', 'logs/app.log'),
  
  // Redaction of sensitive data
  redactFields: ['password', 'token', 'secret', 'creditCard', 'socialSecurity'],
};

/**
 * Authentication configuration
 */
export const authConfig = {
  sessionDuration: getIntEnv('SESSION_DURATION', 24 * 60 * 60 * 1000), // 24 hours in ms
  jwtExpiresIn: getOptionalEnv('JWT_EXPIRES_IN', '24h'),
  bcryptRounds: getIntEnv('BCRYPT_ROUNDS', 10),
  
  // Demo account configuration is now managed in shared/config.ts
  // These environment variables are kept for backward compatibility
  demoUsername: getOptionalEnv('DEMO_USERNAME', ''),
  demoPassword: getOptionalEnv('DEMO_PASSWORD', ''),
};

/**
 * External services configuration
 */
export const servicesConfig = {
  // Google Cloud
  googleCredentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  googleProjectId: process.env.GOOGLE_PROJECT_ID,
  
  // OpenAI
  openAiApiKey: process.env.OPENAI_API_KEY,
  openAiModel: getOptionalEnv('OPENAI_MODEL', 'gpt-4o'),
  
  // HuggingFace
  huggingFaceApiKey: process.env.HUGGINGFACE_API_KEY,
  
  // Email service
  smtpHost: process.env.SMTP_HOST,
  smtpPort: getIntEnv('SMTP_PORT', 587),
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  emailFrom: getOptionalEnv('EMAIL_FROM', 'noreply@requireflow.com'),
};

/**
 * Feature flags
 */
export const featureConfig = {
  enableAuth: getBooleanEnv('ENABLE_AUTH', true),
  enableRateLimiting: getBooleanEnv('ENABLE_RATE_LIMITING', getEnvironment() === Environment.PRODUCTION),
  enableSwagger: getBooleanEnv('ENABLE_SWAGGER', getEnvironment() !== Environment.PRODUCTION),
  enableFileUploads: getBooleanEnv('ENABLE_FILE_UPLOADS', true),
  enableAiServices: getBooleanEnv('ENABLE_AI_SERVICES', true),
  enableWebhooks: getBooleanEnv('ENABLE_WEBHOOKS', false),
  enableMetrics: getBooleanEnv('ENABLE_METRICS', getEnvironment() === Environment.PRODUCTION),
};

/**
 * Full configuration object
 */
export const config = {
  server: serverConfig,
  db: dbConfig,
  cache: cacheConfig,
  storage: storageConfig,
  logging: loggingConfig,
  auth: authConfig,
  services: servicesConfig,
  features: featureConfig,
  
  // Helper functions for checking environment
  isDevelopment: () => getEnvironment() === Environment.DEVELOPMENT,
  isProduction: () => getEnvironment() === Environment.PRODUCTION,
  isTest: () => getEnvironment() === Environment.TEST,
};

export default config;