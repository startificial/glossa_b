/**
 * Requirement Controller
 * 
 * Handles HTTP requests related to requirement management.
 * Processes request input, calls appropriate services, and formats responses.
 */
import { Request, Response } from 'express';
import { requirementService, projectService } from '../services';
import { asyncHandler } from '../utils/async-handler';
import { insertRequirementSchema } from '@shared/schema';
import { UnauthorizedError, ForbiddenError } from '../error/api-error';

/**
 * Controller for requirement-related endpoints
 */
export class RequirementController {
  /**
   * Get all requirements for a project
   */
  getProjectRequirements = asyncHandler(async (req: Request, res: Response) => {
    const projectId = parseInt(req.params.projectId);
    
    if (isNaN(projectId)) {
      res.status(400).json({ message: "Invalid project ID" });
      return;
    }
    
    // Ensure project exists (this will throw if not found)
    await projectService.getProjectById(projectId);
    
    const requirements = await requirementService.getRequirementsByProject(projectId);
    res.json(requirements);
  });
  
  /**
   * Get a specific requirement by ID
   */
  getRequirementById = asyncHandler(async (req: Request, res: Response) => {
    const requirementId = parseInt(req.params.id);
    
    if (isNaN(requirementId)) {
      res.status(400).json({ message: "Invalid requirement ID" });
      return;
    }
    
    const requirement = await requirementService.getRequirementById(requirementId);
    res.json(requirement);
  });
  
  /**
   * Get a specific requirement with project check for access control
   */
  getRequirementWithProjectCheck = asyncHandler(async (req: Request, res: Response) => {
    const requirementId = parseInt(req.params.id);
    const projectId = parseInt(req.params.projectId);
    
    if (isNaN(requirementId) || isNaN(projectId)) {
      res.status(400).json({ message: "Invalid requirement or project ID" });
      return;
    }
    
    const requirement = await requirementService.getRequirementWithProjectCheck(requirementId, projectId);
    res.json(requirement);
  });
  
  /**
   * Create a new requirement
   */
  createRequirement = asyncHandler(async (req: Request, res: Response) => {
    // Ensure user is authenticated
    if (!req.session.userId) {
      throw new UnauthorizedError();
    }
    
    // Validate request body
    const validatedData = insertRequirementSchema.parse(req.body);
    
    // Ensure project exists and user has access
    const project = await projectService.getProjectById(validatedData.projectId);
    
    // Check if the user owns the project
    if (project.userId !== req.session.userId) {
      throw new ForbiddenError("You don't have permission to add requirements to this project");
    }
    
    // Create the requirement
    const requirement = await requirementService.createRequirement(validatedData);
    res.status(201).json(requirement);
  });
  
  /**
   * Update a requirement
   */
  updateRequirement = asyncHandler(async (req: Request, res: Response) => {
    const requirementId = parseInt(req.params.id);
    
    if (isNaN(requirementId)) {
      res.status(400).json({ message: "Invalid requirement ID" });
      return;
    }
    
    // Ensure user is authenticated
    if (!req.session.userId) {
      throw new UnauthorizedError();
    }
    
    // Get the existing requirement
    const existingRequirement = await requirementService.getRequirementById(requirementId);
    
    // Get the project to check ownership
    const project = await projectService.getProjectById(existingRequirement.projectId);
    
    // Check if the user owns the project
    if (project.userId !== req.session.userId) {
      throw new ForbiddenError("You don't have permission to update this requirement");
    }
    
    // Create a subset of the insertRequirementSchema for updates
    const updateRequirementSchema = insertRequirementSchema.omit({
      projectId: true, // Don't allow changing the project
      createdAt: true,
      updatedAt: true
    });
    
    // Validate the request body
    const validatedData = updateRequirementSchema.parse(req.body);
    
    // Update the requirement
    const requirement = await requirementService.updateRequirement(requirementId, validatedData);
    res.json(requirement);
  });
  
  /**
   * Delete a requirement
   */
  deleteRequirement = asyncHandler(async (req: Request, res: Response) => {
    const requirementId = parseInt(req.params.id);
    
    if (isNaN(requirementId)) {
      res.status(400).json({ message: "Invalid requirement ID" });
      return;
    }
    
    // Ensure user is authenticated
    if (!req.session.userId) {
      throw new UnauthorizedError();
    }
    
    // Get the existing requirement
    const existingRequirement = await requirementService.getRequirementById(requirementId);
    
    // Get the project to check ownership
    const project = await projectService.getProjectById(existingRequirement.projectId);
    
    // Check if the user owns the project
    if (project.userId !== req.session.userId) {
      throw new ForbiddenError("You don't have permission to delete this requirement");
    }
    
    // Delete the requirement
    await requirementService.deleteRequirement(requirementId);
    res.status(200).json({ message: "Requirement deleted successfully" });
  });
  
  /**
   * Get high priority requirements for a project
   */
  getHighPriorityRequirements = asyncHandler(async (req: Request, res: Response) => {
    const projectId = parseInt(req.params.projectId);
    
    if (isNaN(projectId)) {
      res.status(400).json({ message: "Invalid project ID" });
      return;
    }
    
    // Parse limit from query params
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    
    if (limit !== undefined && (isNaN(limit) || limit < 1)) {
      res.status(400).json({ message: "Invalid limit parameter" });
      return;
    }
    
    // Ensure project exists
    await projectService.getProjectById(projectId);
    
    const requirements = await requirementService.getHighPriorityRequirements(projectId, limit);
    res.json(requirements);
  });
  
  /**
   * Get requirements by category
   */
  getRequirementsByCategory = asyncHandler(async (req: Request, res: Response) => {
    const projectId = parseInt(req.params.projectId);
    const { category } = req.params;
    
    if (isNaN(projectId) || !category) {
      res.status(400).json({ message: "Invalid project ID or category" });
      return;
    }
    
    // Ensure project exists
    await projectService.getProjectById(projectId);
    
    const requirements = await requirementService.getRequirementsByCategory(projectId, category);
    res.json(requirements);
  });
}