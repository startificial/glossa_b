/**
 * Project Controller
 * 
 * Handles HTTP requests related to project management.
 * Processes request input, calls appropriate services, and formats responses.
 */
import { Request, Response } from 'express';
import { projectService, userService } from '../services';
import { asyncHandler } from '../utils/async-handler';
import { insertProjectSchema } from '@shared/schema';
import { UnauthorizedError } from '../error/api-error';

/**
 * Controller for project-related endpoints
 */
export class ProjectController {
  /**
   * Get all projects for the current user
   */
  getUserProjects = asyncHandler(async (req: Request, res: Response) => {
    // Ensure user is authenticated
    if (!req.session.userId) {
      throw new UnauthorizedError();
    }
    
    const projects = await projectService.getProjectsByUser(req.session.userId);
    res.json(projects);
  });
  
  /**
   * Get a specific project by ID
   */
  getProjectById = asyncHandler(async (req: Request, res: Response) => {
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      res.status(400).json({ message: "Invalid project ID" });
      return;
    }
    
    const project = await projectService.getProjectById(projectId);
    res.json(project);
  });
  
  /**
   * Create a new project
   */
  createProject = asyncHandler(async (req: Request, res: Response) => {
    // Ensure user is authenticated
    if (!req.session.userId) {
      throw new UnauthorizedError();
    }
    
    // Validate request body
    const validatedData = insertProjectSchema.parse(req.body);
    
    // Set the user ID from the session
    validatedData.userId = req.session.userId;
    
    // Create the project
    const project = await projectService.createProject(validatedData);
    res.status(201).json(project);
  });
  
  /**
   * Update a project
   */
  updateProject = asyncHandler(async (req: Request, res: Response) => {
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      res.status(400).json({ message: "Invalid project ID" });
      return;
    }
    
    // Ensure user is authenticated
    if (!req.session.userId) {
      throw new UnauthorizedError();
    }
    
    // Create a subset of the insertProjectSchema for updates
    const updateProjectSchema = insertProjectSchema.omit({
      userId: true, // Don't allow changing the owner
      createdAt: true,
      updatedAt: true
    });
    
    // Validate the request body
    const validatedData = updateProjectSchema.parse(req.body);
    
    // Update the project
    const project = await projectService.updateProject(projectId, validatedData);
    res.json(project);
  });
  
  /**
   * Delete a project
   */
  deleteProject = asyncHandler(async (req: Request, res: Response) => {
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      res.status(400).json({ message: "Invalid project ID" });
      return;
    }
    
    // Ensure user is authenticated
    if (!req.session.userId) {
      throw new UnauthorizedError();
    }
    
    // Delete the project
    await projectService.deleteProject(projectId);
    res.status(200).json({ message: "Project deleted successfully" });
  });
  
  /**
   * Search projects by query
   */
  searchProjects = asyncHandler(async (req: Request, res: Response) => {
    const { query } = req.query;
    
    if (!query || typeof query !== 'string') {
      res.status(400).json({ message: "Search query is required" });
      return;
    }
    
    // Ensure user is authenticated
    if (!req.session.userId) {
      throw new UnauthorizedError();
    }
    
    const projects = await projectService.searchProjects(query);
    res.json(projects);
  });
  
  /**
   * Get recent projects
   */
  getRecentProjects = asyncHandler(async (req: Request, res: Response) => {
    // Parse limit from query params
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    
    if (isNaN(limit) || limit < 1 || limit > 100) {
      res.status(400).json({ message: "Invalid limit parameter" });
      return;
    }
    
    // Ensure user is authenticated
    if (!req.session.userId) {
      throw new UnauthorizedError();
    }
    
    const projects = await projectService.getRecentProjects(limit);
    res.json(projects);
  });
}