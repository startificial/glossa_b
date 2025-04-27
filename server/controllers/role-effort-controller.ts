/**
 * Role Effort Controller
 * 
 * Handles all operations related to role effort management.
 */
import { Request, Response } from 'express';
import { requirementRoleEffortController } from './requirement-role-effort-controller';
import { taskRoleEffortController } from './task-role-effort-controller';

/**
 * Controller for role effort related operations
 */
export class RoleEffortController {
  /**
   * Get role efforts for a requirement
   * @param req Express request object
   * @param res Express response object
   */
  async getRequirementRoleEfforts(req: Request, res: Response): Promise<Response> {
    return requirementRoleEffortController.getRoleEffortsForRequirement(req, res);
  }

  /**
   * Create a role effort for a requirement
   * @param req Express request object
   * @param res Express response object
   */
  async createRequirementRoleEffort(req: Request, res: Response): Promise<Response> {
    return requirementRoleEffortController.createRoleEffortForRequirement(req, res);
  }

  /**
   * Delete a role effort for a requirement
   * @param req Express request object
   * @param res Express response object
   */
  async deleteRequirementRoleEffort(req: Request, res: Response): Promise<Response> {
    return requirementRoleEffortController.deleteRoleEffortForRequirement(req, res);
  }

  /**
   * Get role efforts for a task
   * @param req Express request object
   * @param res Express response object
   */
  async getTaskRoleEfforts(req: Request, res: Response): Promise<Response> {
    return taskRoleEffortController.getRoleEffortsForTask(req, res);
  }

  /**
   * Create a role effort for a task
   * @param req Express request object
   * @param res Express response object
   */
  async createTaskRoleEffort(req: Request, res: Response): Promise<Response> {
    return taskRoleEffortController.createRoleEffortForTask(req, res);
  }

  /**
   * Delete a role effort for a task
   * @param req Express request object
   * @param res Express response object
   */
  async deleteTaskRoleEffort(req: Request, res: Response): Promise<Response> {
    return taskRoleEffortController.deleteRoleEffortForTask(req, res);
  }
}

export const roleEffortController = new RoleEffortController();