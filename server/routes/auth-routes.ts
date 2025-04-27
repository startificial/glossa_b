/**
 * Authentication Routes
 * 
 * Defines Express routes for user authentication, registration, and session management.
 */
import { Express } from 'express';
import { authController } from '../controllers/auth-controller';

/**
 * Register authentication routes with the Express application
 * @param app Express application instance
 */
export function registerAuthRoutes(app: Express): void {
  /**
   * @route POST /api/register
   * @desc Register a new user
   * @access Public
   */
  app.post('/api/register', authController.register.bind(authController));
  
  /**
   * @route POST /api/login
   * @desc Login a user
   * @access Public
   */
  app.post('/api/login', authController.login.bind(authController));
  
  /**
   * @route POST /api/logout
   * @desc Logout a user
   * @access Public
   */
  app.post('/api/logout', authController.logout.bind(authController));
}