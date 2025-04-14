/**
 * Requirement Routes
 * 
 * Defines Express routes for requirement management.
 */
import { Express } from 'express';
import { requirementController } from '../controllers';
import { isAuthenticated } from '../middleware/auth';

/**
 * Register requirement routes with the Express application
 * @param app Express application instance
 */
export function registerRequirementRoutes(app: Express): void {
  /**
   * @route GET /api/projects/:projectId/requirements
   * @desc Get all requirements for a project
   * @access Private
   */
  app.get(
    '/api/projects/:projectId/requirements',
    isAuthenticated,
    requirementController.getProjectRequirements
  );
  
  /**
   * @route GET /api/projects/:projectId/requirements/high-priority
   * @desc Get high priority requirements for a project
   * @access Private
   */
  app.get(
    '/api/projects/:projectId/requirements/high-priority',
    isAuthenticated,
    requirementController.getHighPriorityRequirements
  );
  
  /**
   * @route GET /api/projects/:projectId/requirements/category/:category
   * @desc Get requirements by category for a project
   * @access Private
   */
  app.get(
    '/api/projects/:projectId/requirements/category/:category',
    isAuthenticated,
    requirementController.getRequirementsByCategory
  );
  
  /**
   * @route GET /api/projects/:projectId/requirements/:id
   * @desc Get a requirement with project check for access control
   * @access Private
   */
  app.get(
    '/api/projects/:projectId/requirements/:id',
    isAuthenticated,
    requirementController.getRequirementWithProjectCheck
  );
  
  /**
   * @route GET /api/requirements/:id
   * @desc Get a requirement by ID
   * @access Private
   */
  app.get(
    '/api/requirements/:id',
    isAuthenticated,
    requirementController.getRequirementById
  );
  
  /**
   * @route POST /api/requirements
   * @desc Create a new requirement
   * @access Private
   */
  app.post(
    '/api/requirements',
    isAuthenticated,
    requirementController.createRequirement
  );
  
  /**
   * @route PUT /api/requirements/:id
   * @desc Update a requirement
   * @access Private
   */
  app.put(
    '/api/requirements/:id',
    isAuthenticated,
    requirementController.updateRequirement
  );
  
  /**
   * @route DELETE /api/requirements/:id
   * @desc Delete a requirement
   * @access Private
   */
  app.delete(
    '/api/requirements/:id',
    isAuthenticated,
    requirementController.deleteRequirement
  );
}