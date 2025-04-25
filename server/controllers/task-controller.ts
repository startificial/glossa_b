/**
 * Task Controller
 * 
 * Handles all operations related to tasks management including CRUD operations
 * and task-specific functionality. Utilizes optimized task service for performance.
 */
import { Request, Response } from 'express';
import { db } from '../db';
import { projects, requirements, implementationTasks } from '@shared/schema';
import { eq, and, asc } from 'drizzle-orm';
import { insertImplementationTaskSchema } from '@shared/schema';
import { storage } from '../storage';
import { logger } from '../utils/logger';
import { z } from 'zod';
import * as taskService from '../services/task-service';

/**
 * Controller for task related operations
 */
export class TaskController {
  /**
   * Get tasks for a requirement
   * @param req Express request object
   * @param res Express response object
   */
  async getTasksForRequirement(req: Request, res: Response): Promise<Response> {
    try {
      const requirementId = parseInt(req.params.requirementId);
      if (isNaN(requirementId)) {
        return res.status(400).json({ message: "Invalid requirement ID" });
      }

      // Use the optimized task service to get tasks with caching
      const tasks = await taskService.getTasksByRequirementId(requirementId);
      
      // If no tasks are found, we'll still return an empty array
      // This is a valid result even if the requirement itself doesn't exist
      return res.json(tasks);
    } catch (error) {
      logger.error("Error fetching tasks for requirement:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Create a new task for a requirement
   * @param req Express request object
   * @param res Express response object
   */
  async createTask(req: Request, res: Response): Promise<Response> {
    try {
      const requirementId = parseInt(req.params.requirementId);
      if (isNaN(requirementId)) {
        return res.status(400).json({ message: "Invalid requirement ID" });
      }

      // Check if requirement exists
      const requirement = await db.query.requirements.findFirst({
        where: eq(requirements.id, requirementId)
      });
      
      if (!requirement) {
        return res.status(404).json({ message: "Requirement not found" });
      }

      // Validate the task data
      const taskData = insertImplementationTaskSchema.parse({
        ...req.body,
        requirementId: requirementId // Override with the path parameter
      });

      // Create the task
      const task = await storage.createImplementationTask(taskData);
      
      // Add activity for task creation
      await storage.createActivity({
        type: "created_task",
        description: `Created task "${task.title}" for requirement "${requirement.title}"`,
        userId: req.session.userId || 1, // Use demo user if not logged in
        projectId: requirement.projectId,
        relatedEntityId: task.id
      });

      return res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid task data", 
          errors: error.errors 
        });
      }
      
      logger.error("Error creating task:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Get tasks for a project
   * @param req Express request object
   * @param res Express response object
   */
  async getTasksForProject(req: Request, res: Response): Promise<Response> {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      // Use the optimized task service to get project tasks with caching
      const tasks = await taskService.getTasksByProjectId(projectId);
      
      // Return the tasks (which already have the requirement context added)
      return res.json(tasks);
    } catch (error) {
      logger.error("Error fetching tasks for project:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Get a task by ID
   * @param req Express request object
   * @param res Express response object
   */
  async getTaskById(req: Request, res: Response): Promise<Response> {
    try {
      const taskId = parseInt(req.params.id);
      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }

      // Get the task using optimized task service
      const task = await taskService.getTaskById(taskId);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Get the associated requirement for context
      const requirement = await storage.getRequirement(task.requirementId);
      
      const taskWithContext = {
        ...task,
        requirement: requirement ? {
          id: requirement.id,
          title: requirement.title,
          category: requirement.category,
          projectId: requirement.projectId
        } : null
      };
      
      return res.json(taskWithContext);
    } catch (error) {
      logger.error("Error fetching task:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Update a task
   * @param req Express request object
   * @param res Express response object
   */
  async updateTask(req: Request, res: Response): Promise<Response> {
    try {
      const taskId = parseInt(req.params.id);
      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }

      // Check if task exists - use optimized service
      const existingTask = await taskService.getTaskById(taskId);
      
      if (!existingTask) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Validate the update data (partial validation)
      const updateData = insertImplementationTaskSchema.partial().parse({
        ...req.body,
        requirementId: existingTask.requirementId // Don't allow changing the requirement
      });

      // Update the task
      const updatedTask = await storage.updateImplementationTask(taskId, updateData);
      if (!updatedTask) {
        return res.status(500).json({ message: "Failed to update task" });
      }
      
      // Get requirement for activity context
      const requirement = await storage.getRequirement(existingTask.requirementId);
      
      // Add activity for task update
      await storage.createActivity({
        type: "updated_task",
        description: `Updated task "${updatedTask.title}"${requirement ? ` for requirement "${requirement.title}"` : ''}`,
        userId: req.session.userId || 1, // Use demo user if not logged in
        projectId: requirement ? requirement.projectId || 0 : 0,
        relatedEntityId: taskId
      });

      // Invalidate caches
      taskService.invalidateTaskCaches(taskId, existingTask.requirementId, existingTask.projectId);

      return res.json(updatedTask);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid task data", 
          errors: error.errors 
        });
      }
      
      logger.error("Error updating task:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Delete a task
   * @param req Express request object
   * @param res Express response object
   */
  async deleteTask(req: Request, res: Response): Promise<Response> {
    try {
      const taskId = parseInt(req.params.id);
      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }

      // Check if task exists - use optimized service
      const existingTask = await taskService.getTaskById(taskId);
      
      if (!existingTask) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Get requirement for activity context
      const requirement = await storage.getRequirement(existingTask.requirementId);

      // Store ids for cache invalidation before deleting
      const requirementId = existingTask.requirementId;
      const projectId = existingTask.projectId || 0;

      // Delete the task
      await storage.deleteImplementationTask(taskId);
      
      // Add activity for task deletion
      await storage.createActivity({
        type: "deleted_task",
        description: `Deleted task "${existingTask.title}"${requirement ? ` from requirement "${requirement.title}"` : ''}`,
        userId: req.session.userId || 1, // Use demo user if not logged in
        projectId: requirement ? requirement.projectId || 0 : 0,
        relatedEntityId: null
      });

      // Invalidate caches
      taskService.invalidateTaskCaches(taskId, requirementId, projectId);

      return res.status(200).json({ 
        message: "Task deleted successfully",
        taskId 
      });
    } catch (error) {
      logger.error("Error deleting task:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
}

import { inArray } from 'drizzle-orm';
export const taskController = new TaskController();