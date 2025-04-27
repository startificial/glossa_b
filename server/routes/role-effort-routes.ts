/**
 * Role Effort Routes
 * 
 * Defines Express routes for managing role efforts.
 */
import { Express } from 'express';
import { roleEffortController } from '../controllers/role-effort-controller';
import { isAuthenticated } from '../middleware/auth';

/**
 * Register role effort routes with the Express application
 * @param app Express application instance
 */
export function registerRoleEffortRoutes(app: Express): void {
  /**
   * @route GET /api/requirements/:requirementId/role-efforts
   * @desc Get role efforts for a requirement
   * @access Private
   */
  app.get(
    '/api/requirements/:requirementId/role-efforts',
    isAuthenticated,
    roleEffortController.getRequirementRoleEfforts.bind(roleEffortController)
  );

  /**
   * @route POST /api/requirements/:requirementId/role-efforts
   * @desc Create a role effort for a requirement
   * @access Private
   */
  app.post(
    '/api/requirements/:requirementId/role-efforts',
    isAuthenticated,
    roleEffortController.createRequirementRoleEffort.bind(roleEffortController)
  );

  /**
   * @route DELETE /api/requirements/:requirementId/role-efforts/:effortId
   * @desc Delete a role effort for a requirement
   * @access Private
   */
  app.delete(
    '/api/requirements/:requirementId/role-efforts/:effortId',
    isAuthenticated,
    roleEffortController.deleteRequirementRoleEffort.bind(roleEffortController)
  );

  /**
   * @route GET /api/tasks/:taskId/role-efforts
   * @desc Get role efforts for a task
   * @access Private
   */
  app.get(
    '/api/tasks/:taskId/role-efforts',
    isAuthenticated,
    roleEffortController.getTaskRoleEfforts.bind(roleEffortController)
  );

  /**
   * @route POST /api/tasks/:taskId/role-efforts
   * @desc Create a role effort for a task
   * @access Private
   */
  app.post(
    '/api/tasks/:taskId/role-efforts',
    isAuthenticated,
    roleEffortController.createTaskRoleEffort.bind(roleEffortController)
  );

  /**
   * @route DELETE /api/tasks/:taskId/role-efforts/:effortId
   * @desc Delete a role effort for a task
   * @access Private
   */
  app.delete(
    '/api/tasks/:taskId/role-efforts/:effortId',
    isAuthenticated,
    roleEffortController.deleteTaskRoleEffort.bind(roleEffortController)
  );
}