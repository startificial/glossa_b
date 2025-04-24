/**
 * Task Controller
 * 
 * Handles all operations related to tasks management including CRUD operations
 * and task-specific functionality.
 */
import { Request, Response } from 'express';
import { db } from '../db';
import { projects, requirements, implementationTasks } from '@shared/schema';
import { eq, and, asc } from 'drizzle-orm';
import { insertImplementationTaskSchema } from '@shared/schema';
import { storage } from '../storage';
import { logger } from '../utils/logger';
import { z } from 'zod';

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

      // Check if requirement exists
      const requirement = await db.query.requirements.findFirst({
        where: eq(requirements.id, requirementId)
      });
      
      if (!requirement) {
        return res.status(404).json({ message: "Requirement not found" });
      }

      // Get tasks for the requirement
      const tasksList = await db.query.implementationTasks.findMany({
        where: eq(implementationTasks.requirementId, requirementId),
        orderBy: [asc(implementationTasks.id)]
      });
      
      return res.json(tasksList);
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

      // Check if project exists
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, projectId)
      });
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Get all requirements for the project
      const requirementList = await db.query.requirements.findMany({
        where: eq(requirements.projectId, projectId)
      });
      
      const requirementIds = requirementList.map(req => req.id);
      
      // If no requirements found, return empty array
      if (requirementIds.length === 0) {
        return res.json([]);
      }
      
      // Get tasks for all requirements
      const tasksList = await db.query.implementationTasks.findMany({
        where: inArray(implementationTasks.requirementId, requirementIds),
        orderBy: [asc(implementationTasks.id)]
      });
      
      // Get a map of requirement titles for context
      const requirementMap = new Map();
      requirementList.forEach(req => {
        requirementMap.set(req.id, {
          id: req.id,
          title: req.title,
          category: req.category
        });
      });
      
      // Add requirement context to tasks
      const tasksWithContext = tasksList.map(task => ({
        ...task,
        requirement: requirementMap.get(task.requirementId) || null
      }));
      
      return res.json(tasksWithContext);
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

      // Get the task
      const task = await storage.getImplementationTask(taskId);
      
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

      // Check if task exists
      const existingTask = await storage.getImplementationTask(taskId);
      
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
      
      // Get requirement for activity context
      const requirement = await storage.getRequirement(existingTask.requirementId);
      
      // Add activity for task update
      await storage.createActivity({
        type: "updated_task",
        description: `Updated task "${updatedTask.title}"${requirement ? ` for requirement "${requirement.title}"` : ''}`,
        userId: req.session.userId || 1, // Use demo user if not logged in
        projectId: requirement ? requirement.projectId : null,
        relatedEntityId: taskId
      });

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

      // Check if task exists
      const existingTask = await storage.getImplementationTask(taskId);
      
      if (!existingTask) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Get requirement for activity context
      const requirement = await storage.getRequirement(existingTask.requirementId);

      // Delete the task
      await storage.deleteImplementationTask(taskId);
      
      // Add activity for task deletion
      await storage.createActivity({
        type: "deleted_task",
        description: `Deleted task "${existingTask.title}"${requirement ? ` from requirement "${requirement.title}"` : ''}`,
        userId: req.session.userId || 1, // Use demo user if not logged in
        projectId: requirement ? requirement.projectId : null,
        relatedEntityId: null
      });

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