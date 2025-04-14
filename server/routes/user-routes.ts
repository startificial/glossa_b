/**
 * User Routes
 * 
 * Defines Express routes for user management.
 */
import { Express } from 'express';
import { userController } from '../controllers';
import { isAuthenticated } from '../middleware/auth';

/**
 * Register user routes with the Express application
 * @param app Express application instance
 */
export function registerUserRoutes(app: Express): void {
  /**
   * @route GET /api/me
   * @desc Get current authenticated user profile
   * @access Public (with fallback to demo user)
   */
  app.get('/api/me', userController.getCurrentUser);
  
  /**
   * @route PUT /api/me
   * @desc Update current user profile
   * @access Private
   */
  app.put('/api/me', isAuthenticated, userController.updateProfile);
}