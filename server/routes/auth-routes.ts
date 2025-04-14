/**
 * Authentication Routes
 * 
 * Defines Express routes for user authentication.
 */
import { Express } from 'express';
import { userController } from '../controllers';

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
  app.post('/api/register', userController.registerUser);
  
  /**
   * @route POST /api/login
   * @desc Authenticate a user and get a token
   * @access Public
   */
  app.post('/api/login', userController.loginUser);
  
  /**
   * @route POST /api/logout
   * @desc Logout and clear session
   * @access Public
   */
  app.post('/api/logout', userController.logoutUser);
}