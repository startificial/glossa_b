/**
 * Activity Controller
 * 
 * Handles all operations related to activity logging and retrieval.
 */
import { Request, Response } from 'express';
import { db } from '../db';
import { projects, activities } from '@shared/schema';
import { eq, desc, and } from 'drizzle-orm';
import { storage } from '../storage';
import { logger } from '../utils/logger';

/**
 * Controller for activity related operations
 */
export class ActivityController {
  /**
   * Get activities for a project
   * @param req Express request object
   * @param res Express response object
   */
  async getProjectActivities(req: Request, res: Response): Promise<Response> {
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

      // Get limit parameter (default: 100)
      const limit = req.query.limit ? parseInt(String(req.query.limit)) : 100;
      
      // Get activities for the project
      const projectActivities = await db.query.activities.findMany({
        where: eq(activities.projectId, projectId),
        orderBy: [desc(activities.createdAt)],
        limit: limit
      });
      
      // Fetch users to get their names
      const userIds = new Set();
      projectActivities.forEach(activity => {
        if (activity.userId) {
          userIds.add(activity.userId);
        }
      });
      
      // Get user names for the activities
      const users = await Promise.all(
        Array.from(userIds).map((userId: number) => storage.getUser(userId))
      );
      
      const userMap = new Map();
      users.forEach(user => {
        if (user) {
          userMap.set(user.id, user);
        }
      });
      
      // Add user details to activities
      const activitiesWithUserDetails = projectActivities.map(activity => {
        const user = activity.userId ? userMap.get(activity.userId) : null;
        return {
          ...activity,
          user: user ? {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username
          } : null
        };
      });
      
      return res.json(activitiesWithUserDetails);
    } catch (error) {
      logger.error("Error fetching project activities:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Get all activities
   * @param req Express request object
   * @param res Express response object
   */
  async getAllActivities(req: Request, res: Response): Promise<Response> {
    try {
      // Get limit parameter (default: 100)
      const limit = req.query.limit ? parseInt(String(req.query.limit)) : 100;
      
      // Get all activities
      const allActivities = await db.query.activities.findMany({
        orderBy: [desc(activities.createdAt)],
        limit: limit
      });
      
      // Fetch unique projects and users
      const projectIds = new Set();
      const userIds = new Set();
      
      allActivities.forEach(activity => {
        if (activity.projectId) {
          projectIds.add(activity.projectId);
        }
        if (activity.userId) {
          userIds.add(activity.userId);
        }
      });
      
      // Get projects and users
      const projects = await Promise.all(
        Array.from(projectIds).map((projectId: number) => storage.getProject(projectId))
      );
      
      const users = await Promise.all(
        Array.from(userIds).map((userId: number) => storage.getUser(userId))
      );
      
      // Create maps for quick lookup
      const projectMap = new Map();
      projects.forEach(project => {
        if (project) {
          projectMap.set(project.id, project);
        }
      });
      
      const userMap = new Map();
      users.forEach(user => {
        if (user) {
          userMap.set(user.id, user);
        }
      });
      
      // Add project and user details to activities
      const activitiesWithDetails = allActivities.map(activity => {
        const project = activity.projectId ? projectMap.get(activity.projectId) : null;
        const user = activity.userId ? userMap.get(activity.userId) : null;
        
        return {
          ...activity,
          project: project ? {
            id: project.id,
            name: project.name
          } : null,
          user: user ? {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username
          } : null
        };
      });
      
      return res.json(activitiesWithDetails);
    } catch (error) {
      logger.error("Error fetching all activities:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Create a new activity
   * @param req Express request object
   * @param res Express response object
   */
  async createActivity(req: Request, res: Response): Promise<Response> {
    try {
      // Validate activity data
      const { type, description, userId, projectId, relatedEntityId } = req.body;
      
      if (!type || !description) {
        return res.status(400).json({ 
          message: "Invalid activity data", 
          detail: "Type and description are required" 
        });
      }
      
      // Create activity
      const activity = await storage.createActivity({
        type,
        description,
        userId: userId || req.session.userId || null,
        projectId: projectId || null,
        relatedEntityId: relatedEntityId || null
      });
      
      return res.status(201).json(activity);
    } catch (error) {
      logger.error("Error creating activity:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
}

export const activityController = new ActivityController();