/**
 * Requirement Role Effort Controller
 * 
 * Handles HTTP requests related to requirement role efforts.
 * Used for managing role-based effort estimation for requirements.
 */
import { Request, Response } from 'express';
import { storage } from '../storage';
import { asyncHandler } from '../utils/async-handler';
import { UnauthorizedError, NotFoundError, BadRequestError } from '../utils/errors';
import { z } from 'zod';
import { insertRequirementRoleEffortSchema } from '@shared/schema';

export class RequirementRoleEffortController {
  /**
   * Get all role efforts for a specific requirement
   */
  getAllEfforts = asyncHandler(async (req: Request, res: Response) => {
    const projectId = parseInt(req.params.projectId);
    const requirementId = parseInt(req.params.requirementId);
    
    if (isNaN(projectId) || isNaN(requirementId)) {
      throw new BadRequestError('Invalid project or requirement ID');
    }
    
    // Check if requirement exists and belongs to the project
    const requirement = await storage.getRequirementWithProjectCheck(requirementId, projectId);
    if (!requirement) {
      throw new NotFoundError('Requirement not found or does not belong to the specified project');
    }
    
    // Get all role efforts for the requirement
    const efforts = await storage.getRequirementRoleEfforts(requirementId);
    
    res.json(efforts);
  });
  
  /**
   * Create a new requirement role effort
   */
  createEffort = asyncHandler(async (req: Request, res: Response) => {
    const projectId = parseInt(req.params.projectId);
    const requirementId = parseInt(req.params.requirementId);
    
    if (isNaN(projectId) || isNaN(requirementId)) {
      throw new BadRequestError('Invalid project or requirement ID');
    }
    
    // Check if requirement exists and belongs to the project
    const requirement = await storage.getRequirementWithProjectCheck(requirementId, projectId);
    if (!requirement) {
      throw new NotFoundError('Requirement not found or does not belong to the specified project');
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
    const createEffortSchema = insertRequirementRoleEffortSchema.extend({
      // Add additional validation if needed
    });
    
    const validatedData = createEffortSchema.parse({
      ...req.body,
      requirementId: requirementId
    });
    
    // Create the effort
    const effort = await storage.createRequirementRoleEffort(validatedData);
    
    // Return the created effort
    res.status(201).json(effort);
  });
  
  /**
   * Update an existing requirement role effort
   */
  updateEffort = asyncHandler(async (req: Request, res: Response) => {
    const projectId = parseInt(req.params.projectId);
    const requirementId = parseInt(req.params.requirementId);
    const effortId = parseInt(req.params.effortId);
    
    if (isNaN(projectId) || isNaN(requirementId) || isNaN(effortId)) {
      throw new BadRequestError('Invalid project, requirement, or effort ID');
    }
    
    // Check if requirement exists and belongs to the project
    const requirement = await storage.getRequirementWithProjectCheck(requirementId, projectId);
    if (!requirement) {
      throw new NotFoundError('Requirement not found or does not belong to the specified project');
    }
    
    // Validate the request body
    const updateEffortSchema = insertRequirementRoleEffortSchema.partial().extend({
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
    const updatedEffort = await storage.updateRequirementRoleEffort(effortId, validatedData);
    
    if (!updatedEffort) {
      throw new BadRequestError('Failed to update effort');
    }
    
    // Return the updated effort
    res.json(updatedEffort);
  });
  
  /**
   * Delete a requirement role effort
   */
  deleteEffort = asyncHandler(async (req: Request, res: Response) => {
    const projectId = parseInt(req.params.projectId);
    const requirementId = parseInt(req.params.requirementId);
    const effortId = parseInt(req.params.effortId);
    
    if (isNaN(projectId) || isNaN(requirementId) || isNaN(effortId)) {
      throw new BadRequestError('Invalid project, requirement, or effort ID');
    }
    
    // Check if requirement exists and belongs to the project
    const requirement = await storage.getRequirementWithProjectCheck(requirementId, projectId);
    if (!requirement) {
      throw new NotFoundError('Requirement not found or does not belong to the specified project');
    }
    
    // Delete the effort
    const success = await storage.deleteRequirementRoleEffort(effortId);
    
    if (!success) {
      throw new BadRequestError('Failed to delete effort');
    }
    
    res.status(204).end();
  });
}

// Create instance for use in routes
export const requirementRoleEffortController = new RequirementRoleEffortController();