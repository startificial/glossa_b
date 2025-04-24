/**
 * Task Routes
 * 
 * Defines Express routes for managing tasks.
 */
import { Express } from 'express';
import { taskController } from '../controllers/task-controller';
import { isAuthenticated } from '../middleware/auth';

/**
 * Register task routes with the Express application
 * @param app Express application instance
 */
export function registerTaskRoutes(app: Express): void {
  /**
   * @route GET /api/requirements/:requirementId/tasks
   * @desc Get tasks for a requirement
   * @access Private
   */
  app.get(
    '/api/requirements/:requirementId/tasks',
    isAuthenticated,
    taskController.getTasksForRequirement.bind(taskController)
  );

  /**
   * @route POST /api/requirements/:requirementId/tasks
   * @desc Create a new task for a requirement
   * @access Private
   */
  app.post(
    '/api/requirements/:requirementId/tasks',
    isAuthenticated,
    taskController.createTask.bind(taskController)
  );

  /**
   * @route GET /api/projects/:projectId/tasks
   * @desc Get tasks for a project
   * @access Private
   */
  app.get(
    '/api/projects/:projectId/tasks',
    isAuthenticated,
    taskController.getTasksForProject.bind(taskController)
  );

  /**
   * @route GET /api/tasks/:id
   * @desc Get a task by ID
   * @access Private
   */
  app.get(
    '/api/tasks/:id',
    isAuthenticated,
    taskController.getTaskById.bind(taskController)
  );

  /**
   * @route PUT /api/tasks/:id
   * @desc Update a task
   * @access Private
   */
  app.put(
    '/api/tasks/:id',
    isAuthenticated,
    taskController.updateTask.bind(taskController)
  );

  /**
   * @route DELETE /api/tasks/:id
   * @desc Delete a task
   * @access Private
   */
  app.delete(
    '/api/tasks/:id',
    isAuthenticated,
    taskController.deleteTask.bind(taskController)
  );
}