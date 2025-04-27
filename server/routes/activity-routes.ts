/**
 * Activity Routes
 * 
 * Defines Express routes for managing activity logs.
 */
import { Express } from 'express';
import { activityController } from '../controllers/activity-controller';
import { isAuthenticated } from '../middleware/auth';

/**
 * Register activity routes with the Express application
 * @param app Express application instance
 */
export function registerActivityRoutes(app: Express): void {
  /**
   * @route GET /api/projects/:projectId/activities
   * @desc Get activities for a project
   * @access Private
   */
  app.get(
    '/api/projects/:projectId/activities',
    isAuthenticated,
    activityController.getProjectActivities.bind(activityController)
  );

  /**
   * @route GET /api/activities
   * @desc Get all activities
   * @access Private
   */
  app.get(
    '/api/activities',
    isAuthenticated,
    activityController.getAllActivities.bind(activityController)
  );

  /**
   * @route POST /api/activities
   * @desc Create a new activity
   * @access Private
   */
  app.post(
    '/api/activities',
    isAuthenticated,
    activityController.createActivity.bind(activityController)
  );
}