/**
 * Workflow Routes
 * 
 * Defines Express routes for workflow management.
 */
import { Express } from 'express';
import { workflowController } from '../controllers/workflow-controller';
import { isAuthenticated, isAdmin } from '../middleware/auth';

/**
 * Register workflow routes with the Express application
 * @param app Express application instance
 */
export function registerWorkflowRoutes(app: Express): void {
  /**
   * @route GET /api/projects/:projectId/workflows
   * @desc Get all workflows for a project
   * @access Public
   */
  app.get('/api/projects/:projectId/workflows', workflowController.getWorkflowsByProject.bind(workflowController));
  
  /**
   * @route GET /api/workflows/:id
   * @desc Get a workflow by ID
   * @access Public
   */
  app.get('/api/workflows/:id', workflowController.getWorkflowById.bind(workflowController));
  
  /**
   * @route POST /api/projects/:projectId/workflows
   * @desc Create a new workflow
   * @access Public
   */
  app.post('/api/projects/:projectId/workflows', workflowController.createWorkflow.bind(workflowController));
  
  /**
   * @route PUT /api/workflows/:id
   * @desc Update a workflow
   * @access Public
   */
  app.put('/api/workflows/:id', workflowController.updateWorkflow.bind(workflowController));
  
  /**
   * @route DELETE /api/workflows/:id
   * @desc Delete a workflow
   * @access Public
   */
  app.delete('/api/workflows/:id', workflowController.deleteWorkflow.bind(workflowController));

  /**
   * @route POST /api/projects/:projectId/generate-workflow
   * @desc Generate a workflow from requirements
   * @access Public
   */
  app.post('/api/projects/:projectId/generate-workflow', workflowController.generateWorkflow.bind(workflowController));
}