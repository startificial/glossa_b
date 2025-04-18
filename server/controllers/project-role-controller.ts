/**
 * Project Role Controller
 * 
 * Handles HTTP requests related to project roles management.
 * Responsible for validating inputs and returning appropriate responses.
 */
import { Request, Response } from 'express';
import { storage } from '../storage';
import { asyncHandler } from '../utils/async-handler';
import { UnauthorizedError, NotFoundError, BadRequestError } from '../error/api-error';
import { z } from 'zod';
import { insertProjectRoleSchema, projectRoles } from '@shared/schema';

export class ProjectRoleController {
  /**
   * Get all project roles for a specific project
   */
  getAllProjectRoles = asyncHandler(async (req: Request, res: Response) => {
    const projectId = parseInt(req.params.projectId);
    
    if (isNaN(projectId)) {
      throw new BadRequestError('Invalid project ID');
    }
    
    // Check if project exists
    const project = await storage.getProject(projectId);
    if (!project) {
      throw new NotFoundError('Project not found');
    }
    
    // Get all roles for the project
    const roles = await storage.getProjectRoles(projectId);
    
    res.json(roles);
  });
  
  /**
   * Get a specific project role
   */
  getProjectRole = asyncHandler(async (req: Request, res: Response) => {
    const projectId = parseInt(req.params.projectId);
    const roleId = parseInt(req.params.roleId);
    
    if (isNaN(projectId) || isNaN(roleId)) {
      throw new BadRequestError('Invalid project or role ID');
    }
    
    // Check if project exists
    const project = await storage.getProject(projectId);
    if (!project) {
      throw new NotFoundError('Project not found');
    }
    
    // Get the role
    const role = await storage.getProjectRole(roleId);
    if (!role) {
      throw new NotFoundError('Role not found');
    }
    
    // Verify that the role belongs to the specified project
    if (role.projectId !== projectId) {
      throw new BadRequestError('Role does not belong to the specified project');
    }
    
    res.json(role);
  });
  
  /**
   * Create a new project role
   */
  createProjectRole = asyncHandler(async (req: Request, res: Response) => {
    const projectId = parseInt(req.params.projectId);
    
    if (isNaN(projectId)) {
      throw new BadRequestError('Invalid project ID');
    }
    
    // Check if project exists
    const project = await storage.getProject(projectId);
    if (!project) {
      throw new NotFoundError('Project not found');
    }
    
    // Validate the request body to ensure it conforms to the expected structure
    const createRoleSchema = insertProjectRoleSchema.extend({
      // Add additional validation if needed
    });
    
    const validatedData = createRoleSchema.parse({
      ...req.body,
      projectId: projectId
    });
    
    // Create the role
    const role = await storage.createProjectRole(validatedData);
    
    // Return the created role
    res.status(201).json(role);
  });
  
  /**
   * Update an existing project role
   */
  updateProjectRole = asyncHandler(async (req: Request, res: Response) => {
    const projectId = parseInt(req.params.projectId);
    const roleId = parseInt(req.params.roleId);
    
    if (isNaN(projectId) || isNaN(roleId)) {
      throw new BadRequestError('Invalid project or role ID');
    }
    
    // Check if project exists
    const project = await storage.getProject(projectId);
    if (!project) {
      throw new NotFoundError('Project not found');
    }
    
    // Check if role exists and belongs to the project
    const existingRole = await storage.getProjectRole(roleId);
    if (!existingRole) {
      throw new NotFoundError('Role not found');
    }
    
    if (existingRole.projectId !== projectId) {
      throw new BadRequestError('Role does not belong to the specified project');
    }
    
    // Validate the request body
    const updateRoleSchema = insertProjectRoleSchema.partial().extend({
      // Add additional validation if needed
    });
    
    const validatedData = updateRoleSchema.parse(req.body);
    
    // Update the role
    const updatedRole = await storage.updateProjectRole(roleId, validatedData);
    
    if (!updatedRole) {
      throw new BadRequestError('Failed to update role');
    }
    
    // Return the updated role
    res.json(updatedRole);
  });
  
  /**
   * Delete a project role
   */
  deleteProjectRole = asyncHandler(async (req: Request, res: Response) => {
    const projectId = parseInt(req.params.projectId);
    const roleId = parseInt(req.params.roleId);
    
    if (isNaN(projectId) || isNaN(roleId)) {
      throw new BadRequestError('Invalid project or role ID');
    }
    
    // Check if project exists
    const project = await storage.getProject(projectId);
    if (!project) {
      throw new NotFoundError('Project not found');
    }
    
    // Check if role exists and belongs to the project
    const existingRole = await storage.getProjectRole(roleId);
    if (!existingRole) {
      throw new NotFoundError('Role not found');
    }
    
    if (existingRole.projectId !== projectId) {
      throw new BadRequestError('Role does not belong to the specified project');
    }
    
    // Delete the role
    const success = await storage.deleteProjectRole(roleId);
    
    if (!success) {
      throw new BadRequestError('Failed to delete role');
    }
    
    res.status(204).end();
  });
}

// Create instance for use in routes
export const projectRoleController = new ProjectRoleController();