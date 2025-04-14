/**
 * Security Middleware
 * 
 * This module provides middleware functions to improve the security
 * of the application by setting appropriate HTTP headers and implementing
 * other security best practices.
 */
import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';
import { getEnvironment, Environment } from '../utils/environment';
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * Get Helmet configuration based on environment
 */
function getHelmetConfig() {
  const isDev = getEnvironment() === Environment.DEVELOPMENT;
  
  return {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          // Allow inline scripts for development only
          ...(isDev ? ["'unsafe-inline'", "'unsafe-eval'"] : []),
        ],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: [
          "'self'",
          // For development, allow localhost connections
          ...(isDev ? ['ws:', 'http:', 'localhost:*'] : []),
        ],
      },
    },
    // Only use HTTPS in production
    hsts: !isDev,
    // Disable iframe embedding except for same origin
    frameguard: {
      action: 'sameorigin',
    },
    // Prevent MIME type sniffing
    noSniff: true,
    // Prevent browsers from trying to guess the MIME type
    xssFilter: true,
    // Don't expose which server we're using
    hidePoweredBy: true,
  };
}

/**
 * Apply Helmet security headers middleware
 */
export const securityHeaders = helmet(getHelmetConfig());

/**
 * Rate limiting middleware
 */
export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  // Skip rate limiting in development
  if (getEnvironment() !== Environment.PRODUCTION || !config.features.enableRateLimiting) {
    return next();
  }
  
  // This is a placeholder for actual rate limiting implementation
  // In a real application, you would use a library like express-rate-limit
  // with a persistent store like Redis to track requests
  
  // For now, log that we would rate limit here
  logger.debug({
    path: req.path,
    ip: req.ip,
    message: 'Rate limiting would be applied here in a complete implementation',
  });
  
  next();
}

/**
 * CORS configuration middleware
 */
export function corsConfig(req: Request, res: Response, next: NextFunction) {
  // Set CORS headers based on configuration
  res.header('Access-Control-Allow-Origin', config.server.corsOrigin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  
  next();
}

/**
 * Request logging middleware that logs basic information about each request
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  
  // Log request details
  logger.debug({
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  }, 'Incoming request');
  
  // Capture response details after it's sent
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Log based on status code
    const logData = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    };
    
    if (res.statusCode >= 500) {
      logger.error(logData, 'Server error response');
    } else if (res.statusCode >= 400) {
      logger.warn(logData, 'Client error response');
    } else {
      logger.debug(logData, 'Request completed');
    }
  });
  
  next();
}