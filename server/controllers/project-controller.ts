import { Request, Response } from 'express';
import { db } from '../db';
import { storage } from '../storage';
import { projects, customers } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import { insertProjectSchema } from '@shared/schema';
import { logger } from '../utils/logger';
import { z } from 'zod';

// Helper function to create project in database
async function createProjectInDb(projectData: any) {
  try {
    logger.info("Creating project:", projectData);
    const insertResult = await db.insert(projects).values(projectData).returning();
    
    if (insertResult.length === 0) {
      throw new Error("Failed to insert project");
    }
    
    return insertResult[0];
  } catch (error) {
    logger.error("Error creating project in DB:", error);
    throw error;
  }
}

/**
 * Controller for project-related operations
 */
export class ProjectController {
  /**
   * Get all projects
   * @param req Express request object
   * @param res Express response object
   */
  async getAllProjects(req: Request, res: Response): Promise<Response> {
    try {
      // Get user ID from session
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Get user to ensure it exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Query all projects from the database - organization-wide visibility
      const projectsList = await db.query.projects.findMany({
        orderBy: [desc(projects.updatedAt)]
      });
      
      return res.json(projectsList);
    } catch (error) {
      logger.error("Error fetching projects:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Get a project by ID
   * @param req Express request object
   * @param res Express response object
   */
  async getProjectById(req: Request, res: Response): Promise<Response> {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      // Get user ID from session
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Query project from the database
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, projectId)
      });
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // If the project has a customer ID, fetch the customer details
      if (project.customerId) {
        const customer = await db.query.customers.findFirst({
          where: eq(customers.id, project.customerId)
        });
        
        if (customer) {
          // Return project with associated customer
          return res.json({
            ...project,
            customer
          });
        }
      }

      return res.json(project);
    } catch (error) {
      logger.error("Error fetching project:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Create a new project
   * @param req Express request object
   * @param res Express response object
   */
  async createProject(req: Request, res: Response): Promise<Response> {
    try {
      // Get user ID from session
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Get user to ensure it exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      logger.info('Creating project with data:', req.body);

      // If customerId is provided, verify it exists
      if (req.body.customerId) {
        const customerId = parseInt(req.body.customerId);
        const customer = await db.query.customers.findFirst({
          where: eq(customers.id, customerId)
        });
        
        if (!customer) {
          return res.status(400).json({ message: "Invalid customer ID. Customer not found." });
        }
      }

      const validatedData = insertProjectSchema.parse({
        ...req.body,
        userId: userId
      });

      // Use database to create project
      const project = await createProjectInDb(validatedData);
      
      // If role template IDs were provided, create project roles from those templates
      if (req.body.roleTemplateIds && Array.isArray(req.body.roleTemplateIds) && req.body.roleTemplateIds.length > 0) {
        logger.info(`Creating project roles from ${req.body.roleTemplateIds.length} templates:`, req.body.roleTemplateIds);
        try {
          // Make sure all template IDs are strings (for consistent comparison)
          const templateIds = req.body.roleTemplateIds.map((id: any) => String(id));
          const createdRoles = await storage.createProjectRolesFromTemplates(project.id, templateIds);
          logger.info(`Created ${createdRoles.length} project roles`);
        } catch (error) {
          logger.error('Error creating project roles from templates:', error);
          // We don't want to fail the project creation if role creation fails
        }
      }
      
      // Add activity for project creation
      await storage.createActivity({
        type: "created_project",
        description: `${user.username} created project "${project.name}"`,
        userId: userId,
        projectId: project.id,
        relatedEntityId: null
      });

      return res.status(201).json(project);
    } catch (error) {
      logger.error("Error creating project:", error);
      return res.status(400).json({ message: "Invalid project data", error });
    }
  }

  /**
   * Update a project
   * @param req Express request object
   * @param res Express response object
   */
  async updateProject(req: Request, res: Response): Promise<Response> {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      // Get user ID from session
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Get user to ensure it exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if project exists in the database
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, projectId)
      });
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // If customerId is provided, verify it exists
      if (req.body.customerId) {
        const customerId = parseInt(req.body.customerId);
        const customer = await db.query.customers.findFirst({
          where: eq(customers.id, customerId)
        });
        
        if (!customer) {
          return res.status(400).json({ message: "Invalid customer ID. Customer not found." });
        }
      }

      // Validate partial update fields
      const { name, description, type, sourceSystem, targetSystem, customerId } = req.body;
      const updateData: any = {
        name,
        description,
        type,
        sourceSystem,
        targetSystem,
        updatedAt: new Date()
      };
      
      // Only add customerId if it's present in request - allows nulling with null value
      if ('customerId' in req.body) {
        updateData.customerId = customerId;
      }
      
      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });
      
      // Update the project in the database
      const result = await db.update(projects)
        .set(updateData)
        .where(eq(projects.id, projectId))
        .returning();
      
      if (result.length === 0) {
        return res.status(500).json({ message: "Failed to update project" });
      }
      
      // Add activity for project update
      await storage.createActivity({
        type: "updated_project",
        description: `${user.username} updated project "${result[0].name}"`,
        userId: userId,
        projectId: projectId,
        relatedEntityId: null
      });
      
      return res.json(result[0]);
    } catch (error) {
      logger.error("Error updating project:", error);
      return res.status(400).json({ message: "Invalid project data", error });
    }
  }

  /**
   * Delete a project
   * @param req Express request object
   * @param res Express response object
   */
  async deleteProject(req: Request, res: Response): Promise<Response> {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      // Get user ID from session
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Get user to ensure it exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if project exists
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, projectId),
        columns: {
          id: true,
          name: true
        }
      });
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Delete the project
      await db.delete(projects).where(eq(projects.id, projectId));
      
      // Add activity for project deletion
      await storage.createActivity({
        type: "deleted_project",
        description: `${user.username} deleted project "${project.name}"`,
        userId: userId,
        projectId: undefined, // Don't include projectId as it's been deleted
        relatedEntityId: null
      });
      
      return res.status(200).json({ message: "Project deleted successfully" });
    } catch (error) {
      logger.error("Error deleting project:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
}

// Create and export the controller instance
export const projectController = new ProjectController();