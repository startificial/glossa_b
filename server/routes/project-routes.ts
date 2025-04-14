/**
 * Project Routes
 * 
 * Defines Express routes for project management.
 */
import { Express } from 'express';
import { projectController } from '../controllers';
import { isAuthenticated } from '../middleware/auth';

/**
 * Register project routes with the Express application
 * @param app Express application instance
 */
export function registerProjectRoutes(app: Express): void {
  /**
   * @route GET /api/projects
   * @desc Get all projects for the authenticated user
   * @access Private
   */
  app.get('/api/projects', isAuthenticated, projectController.getUserProjects);
  
  /**
   * @route GET /api/projects/recent
   * @desc Get recent projects
   * @access Private
   */
  app.get('/api/projects/recent', isAuthenticated, projectController.getRecentProjects);
  
  /**
   * @route GET /api/projects/search
   * @desc Search projects by query
   * @access Private
   */
  app.get('/api/projects/search', isAuthenticated, projectController.searchProjects);
  
  /**
   * @route GET /api/projects/:id
   * @desc Get a specific project by ID
   * @access Private
   */
  app.get('/api/projects/:id', isAuthenticated, projectController.getProjectById);
  
  /**
   * @route POST /api/projects
   * @desc Create a new project
   * @access Private
   */
  app.post('/api/projects', isAuthenticated, projectController.createProject);
  
  /**
   * @route PUT /api/projects/:id
   * @desc Update a project
   * @access Private
   */
  app.put('/api/projects/:id', isAuthenticated, projectController.updateProject);
  
  /**
   * @route DELETE /api/projects/:id
   * @desc Delete a project
   * @access Private
   */
  app.delete('/api/projects/:id', isAuthenticated, projectController.deleteProject);
}