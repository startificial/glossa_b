/**
 * User Routes
 * 
 * Defines Express routes for user management.
 */
import { Express } from 'express';
import { userController } from '../controllers/user-controller';
import { isAuthenticated } from '../middleware/auth';

/**
 * Register user routes with the Express application
 * @param app Express application instance
 */
export function registerUserRoutes(app: Express): void {
  /**
   * @route GET /api/user
   * @desc Get current authenticated user profile
   * @access Private
   */
  app.get('/api/user', userController.getCurrentUser.bind(userController));
  
  /**
   * @route GET /api/me
   * @desc Get current authenticated user profile with fallback to demo user
   * @access Public (with fallback to demo user)
   */
  app.get('/api/me', userController.getCurrentUserWithFallback.bind(userController));
  
  /**
   * @route PUT /api/me
   * @desc Update current user profile
   * @access Private
   */
  app.put('/api/me', isAuthenticated, userController.updateProfile.bind(userController));
}