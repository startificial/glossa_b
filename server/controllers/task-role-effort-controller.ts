/**
 * Task Role Effort Controller
 * 
 * Handles operations related to role efforts for tasks.
 */
import { Request, Response } from 'express';
import { db } from '../db';
import { implementationTasks, taskRoleEfforts } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { storage } from '../storage';
import { logger } from '../utils/logger';
import { z } from 'zod';

// Role effort validation schema
const roleEffortSchema = z.object({
  roleId: z.number().int().positive(),
  hourlyRate: z.number().positive().optional(),
  hours: z.number().positive(),
  notes: z.string().optional()
});

/**
 * Controller for task role effort related operations
 */
export class TaskRoleEffortController {
  /**
   * Get role efforts for a task
   * @param req Express request object
   * @param res Express response object
   */
  async getRoleEffortsForTask(req: Request, res: Response): Promise<Response> {
    try {
      const taskId = parseInt(req.params.taskId);
      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }

      // Check if task exists
      const task = await db.query.implementationTasks.findFirst({
        where: eq(implementationTasks.id, taskId)
      });
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Get role efforts for the task
      const roleEfforts = await db.query.taskRoleEfforts.findMany({
        where: eq(taskRoleEfforts.taskId, taskId)
      });
      
      // Get roles information to include in response
      const roleIds = new Set(roleEfforts.map(effort => effort.roleId));
      const rolesPromises = Array.from(roleIds).map(roleId => storage.getProjectRole(roleId));
      const roles = await Promise.all(rolesPromises);
      
      // Create a map for quick lookup
      const roleMap = new Map();
      roles.forEach(role => {
        if (role) {
          roleMap.set(role.id, role);
        }
      });
      
      // Add role details to efforts
      const effortsWithRoleDetails = roleEfforts.map(effort => {
        const role = roleMap.get(effort.roleId);
        return {
          ...effort,
          role: role ? {
            id: role.id,
            name: role.name,
            description: role.description,
            projectId: role.projectId
          } : null
        };
      });
      
      return res.json(effortsWithRoleDetails);
    } catch (error) {
      logger.error("Error fetching role efforts for task:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Create a role effort for a task
   * @param req Express request object
   * @param res Express response object
   */
  async createRoleEffortForTask(req: Request, res: Response): Promise<Response> {
    try {
      const taskId = parseInt(req.params.taskId);
      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }

      // Check if task exists
      const task = await db.query.implementationTasks.findFirst({
        where: eq(implementationTasks.id, taskId)
      });
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Get the requirement for the task to get projectId
      const requirement = await storage.getRequirement(task.requirementId);
      if (!requirement) {
        return res.status(404).json({ message: "Parent requirement not found" });
      }

      // Validate role effort data
      const validationResult = roleEffortSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid role effort data", 
          errors: validationResult.error.errors 
        });
      }
      
      // Get role to verify it exists
      const role = await storage.getProjectRole(validationResult.data.roleId);
      if (!role) {
        return res.status(404).json({ message: "Role not found" });
      }
      
      // Create role effort
      const roleEffort = await storage.createTaskRoleEffort({
        taskId,
        roleId: validationResult.data.roleId,
        hourlyRate: validationResult.data.hourlyRate,
        hours: validationResult.data.hours,
        notes: validationResult.data.notes
      });
      
      // Add activity for role effort creation
      await storage.createActivity({
        type: "created_task_role_effort",
        description: `Added effort estimate for role "${role.name}" to task "${task.title}"`,
        userId: req.session.userId || 1, // Use demo user if not logged in
        projectId: requirement.projectId,
        relatedEntityId: roleEffort.id
      });
      
      // Get the role details to include in response
      const roleEffortWithRoleDetails = {
        ...roleEffort,
        role: {
          id: role.id,
          name: role.name,
          description: role.description,
          projectId: role.projectId
        }
      };
      
      return res.status(201).json(roleEffortWithRoleDetails);
    } catch (error) {
      logger.error("Error creating role effort for task:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Delete a role effort for a task
   * @param req Express request object
   * @param res Express response object
   */
  async deleteRoleEffortForTask(req: Request, res: Response): Promise<Response> {
    try {
      const taskId = parseInt(req.params.taskId);
      const effortId = parseInt(req.params.effortId);
      
      if (isNaN(taskId) || isNaN(effortId)) {
        return res.status(400).json({ message: "Invalid task ID or effort ID" });
      }

      // Check if task exists
      const task = await db.query.implementationTasks.findFirst({
        where: eq(implementationTasks.id, taskId)
      });
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Get the requirement for the task to get projectId
      const requirement = await storage.getRequirement(task.requirementId);
      if (!requirement) {
        return res.status(404).json({ message: "Parent requirement not found" });
      }

      // Get the effort to check if it exists and to get role info for the activity
      const effort = await db.query.taskRoleEfforts.findFirst({
        where: eq(taskRoleEfforts.id, effortId)
      });
      
      if (!effort) {
        return res.status(404).json({ message: "Role effort not found" });
      }
      
      // Get role for activity context
      const role = await storage.getProjectRole(effort.roleId);
      
      // Delete the role effort
      await storage.deleteTaskRoleEffort(effortId);
      
      // Add activity for role effort deletion
      await storage.createActivity({
        type: "deleted_task_role_effort",
        description: `Removed effort estimate for role "${role ? role.name : 'Unknown'}" from task "${task.title}"`,
        userId: req.session.userId || 1, // Use demo user if not logged in
        projectId: requirement.projectId,
        relatedEntityId: null
      });
      
      return res.status(200).json({ 
        message: "Role effort deleted successfully", 
        effortId 
      });
    } catch (error) {
      logger.error("Error deleting role effort for task:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
}

export const taskRoleEffortController = new TaskRoleEffortController();