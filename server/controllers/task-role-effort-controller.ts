/**
 * Task Role Effort Controller
 * 
 * Handles HTTP requests related to task role efforts.
 * Used for managing role-based effort estimation for implementation tasks.
 */
import { Request, Response } from 'express';
import { storage } from '../storage';
import { asyncHandler } from '../utils/async-handler';
import { UnauthorizedError, NotFoundError, BadRequestError } from '../utils/errors';
import { z } from 'zod';
import { insertTaskRoleEffortSchema } from '@shared/schema';

export class TaskRoleEffortController {
  /**
   * Get all role efforts for a specific task
   */
  getAllEfforts = asyncHandler(async (req: Request, res: Response) => {
    const projectId = parseInt(req.params.projectId);
    const taskId = parseInt(req.params.taskId);
    
    if (isNaN(projectId) || isNaN(taskId)) {
      throw new BadRequestError('Invalid project or task ID');
    }
    
    // Get the task
    const task = await storage.getImplementationTask(taskId);
    if (!task) {
      throw new NotFoundError('Task not found');
    }
    
    // Get the requirement to check project ownership
    const requirement = await storage.getRequirementWithProjectCheck(task.requirementId, projectId);
    if (!requirement) {
      throw new NotFoundError('Associated requirement not found or does not belong to the specified project');
    }
    
    // Get all role efforts for the task
    const efforts = await storage.getTaskRoleEfforts(taskId);
    
    res.json(efforts);
  });
  
  /**
   * Create a new task role effort
   */
  createEffort = asyncHandler(async (req: Request, res: Response) => {
    const projectId = parseInt(req.params.projectId);
    const taskId = parseInt(req.params.taskId);
    
    if (isNaN(projectId) || isNaN(taskId)) {
      throw new BadRequestError('Invalid project or task ID');
    }
    
    // Get the task
    const task = await storage.getImplementationTask(taskId);
    if (!task) {
      throw new NotFoundError('Task not found');
    }
    
    // Get the requirement to check project ownership
    const requirement = await storage.getRequirementWithProjectCheck(task.requirementId, projectId);
    if (!requirement) {
      throw new NotFoundError('Associated requirement not found or does not belong to the specified project');
    }
    
    // Validate role ID
    const roleId = parseInt(req.body.roleId);
    if (isNaN(roleId)) {
      throw new BadRequestError('Invalid role ID');
    }
    
    // Check if role exists and belongs to the project
    const role = await storage.getProjectRole(roleId);
    if (!role) {
      throw new NotFoundError('Role not found');
    }
    
    if (role.projectId !== projectId) {
      throw new BadRequestError('Role does not belong to the specified project');
    }
    
    // Validate the request body
    const createEffortSchema = insertTaskRoleEffortSchema.extend({
      // Add additional validation if needed
    });
    
    const validatedData = createEffortSchema.parse({
      ...req.body,
      taskId: taskId
    });
    
    // Create the effort
    const effort = await storage.createTaskRoleEffort(validatedData);
    
    // Return the created effort
    res.status(201).json(effort);
  });
  
  /**
   * Update an existing task role effort
   */
  updateEffort = asyncHandler(async (req: Request, res: Response) => {
    const projectId = parseInt(req.params.projectId);
    const taskId = parseInt(req.params.taskId);
    const effortId = parseInt(req.params.effortId);
    
    if (isNaN(projectId) || isNaN(taskId) || isNaN(effortId)) {
      throw new BadRequestError('Invalid project, task, or effort ID');
    }
    
    // Get the task
    const task = await storage.getImplementationTask(taskId);
    if (!task) {
      throw new NotFoundError('Task not found');
    }
    
    // Get the requirement to check project ownership
    const requirement = await storage.getRequirementWithProjectCheck(task.requirementId, projectId);
    if (!requirement) {
      throw new NotFoundError('Associated requirement not found or does not belong to the specified project');
    }
    
    // Validate the request body
    const updateEffortSchema = insertTaskRoleEffortSchema.partial().extend({
      // Add additional validation if needed
    });
    
    const validatedData = updateEffortSchema.parse(req.body);
    
    // If role ID is provided, validate it
    if (validatedData.roleId) {
      const role = await storage.getProjectRole(validatedData.roleId);
      if (!role) {
        throw new NotFoundError('Role not found');
      }
      
      if (role.projectId !== projectId) {
        throw new BadRequestError('Role does not belong to the specified project');
      }
    }
    
    // Update the effort
    const updatedEffort = await storage.updateTaskRoleEffort(effortId, validatedData);
    
    if (!updatedEffort) {
      throw new BadRequestError('Failed to update effort');
    }
    
    // Return the updated effort
    res.json(updatedEffort);
  });
  
  /**
   * Delete a task role effort
   */
  deleteEffort = asyncHandler(async (req: Request, res: Response) => {
    const projectId = parseInt(req.params.projectId);
    const taskId = parseInt(req.params.taskId);
    const effortId = parseInt(req.params.effortId);
    
    if (isNaN(projectId) || isNaN(taskId) || isNaN(effortId)) {
      throw new BadRequestError('Invalid project, task, or effort ID');
    }
    
    // Get the task
    const task = await storage.getImplementationTask(taskId);
    if (!task) {
      throw new NotFoundError('Task not found');
    }
    
    // Get the requirement to check project ownership
    const requirement = await storage.getRequirementWithProjectCheck(task.requirementId, projectId);
    if (!requirement) {
      throw new NotFoundError('Associated requirement not found or does not belong to the specified project');
    }
    
    // Delete the effort
    const success = await storage.deleteTaskRoleEffort(effortId);
    
    if (!success) {
      throw new BadRequestError('Failed to delete effort');
    }
    
    res.status(204).end();
  });
}

// Create instance for use in routes
export const taskRoleEffortController = new TaskRoleEffortController();