/**
 * Project Routes
 * 
 * Defines Express routes for project management.
 */
import { Express } from 'express';
import { projectController } from '../controllers/project-controller';
import { isAuthenticated, isAdmin } from '../middleware/auth';

/**
 * Register project routes with the Express application
 * @param app Express application instance
 */
export function registerProjectRoutes(app: Express): void {
  /**
   * @route GET /api/projects
   * @desc Get all projects
   * @access Private
   */
  app.get('/api/projects', isAuthenticated, projectController.getAllProjects.bind(projectController));
  
  /**
   * @route GET /api/projects/:id
   * @desc Get a project by ID
   * @access Private
   */
  app.get('/api/projects/:id', isAuthenticated, projectController.getProjectById.bind(projectController));
  
  /**
   * @route POST /api/projects
   * @desc Create a new project
   * @access Private
   */
  app.post('/api/projects', isAuthenticated, projectController.createProject.bind(projectController));
  
  /**
   * @route PUT /api/projects/:id
   * @desc Update a project
   * @access Private
   */
  app.put('/api/projects/:id', isAuthenticated, projectController.updateProject.bind(projectController));
  
  /**
   * @route DELETE /api/projects/:id
   * @desc Delete a project
   * @access Private
   */
  app.delete('/api/projects/:id', isAuthenticated, projectController.deleteProject.bind(projectController));
}