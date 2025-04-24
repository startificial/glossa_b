/**
 * Requirement Routes
 * 
 * Defines Express routes for requirement management including CRUD operations
 * and AI-powered functionality for requirements.
 */
import { Express } from 'express';
import { requirementController } from '../controllers/requirement-controller';
import { isAuthenticated } from '../middleware/auth';

/**
 * Register requirement routes with the Express application
 * @param app Express application instance
 */
export function registerRequirementRoutes(app: Express): void {
  /**
   * @route GET /api/projects/:projectId/requirements/high-priority
   * @desc Get high priority requirements for a project
   * @access Private
   */
  app.get(
    '/api/projects/:projectId/requirements/high-priority',
    isAuthenticated,
    requirementController.getHighPriorityRequirements.bind(requirementController)
  );

  /**
   * @route GET /api/projects/:projectId/requirements/:id
   * @desc Get a requirement by ID
   * @access Private
   */
  app.get(
    '/api/projects/:projectId/requirements/:id([0-9]+)',
    isAuthenticated,
    requirementController.getRequirementById.bind(requirementController)
  );

  /**
   * @route GET /api/projects/:projectId/requirements
   * @desc Get all requirements for a project
   * @access Private
   */
  app.get(
    '/api/projects/:projectId/requirements',
    isAuthenticated,
    requirementController.getRequirementsByProject.bind(requirementController)
  );

  /**
   * @route POST /api/projects/:projectId/requirements
   * @desc Create a new requirement
   * @access Private
   */
  app.post(
    '/api/projects/:projectId/requirements',
    isAuthenticated,
    requirementController.createRequirement.bind(requirementController)
  );

  /**
   * @route PUT /api/projects/:projectId/requirements/:id
   * @desc Update a requirement
   * @access Private
   */
  app.put(
    '/api/projects/:projectId/requirements/:id',
    isAuthenticated,
    requirementController.updateRequirement.bind(requirementController)
  );

  /**
   * @route DELETE /api/projects/:projectId/requirements/:id
   * @desc Delete a requirement
   * @access Private
   */
  app.delete(
    '/api/projects/:projectId/requirements/:id',
    isAuthenticated,
    requirementController.deleteRequirement.bind(requirementController)
  );

  /**
   * @route POST /api/requirements/:requirementId/generate-acceptance-criteria
   * @desc Generate acceptance criteria for a requirement
   * @access Private
   */
  app.post(
    '/api/requirements/:requirementId/generate-acceptance-criteria',
    isAuthenticated,
    requirementController.generateAcceptanceCriteria.bind(requirementController)
  );

  /**
   * @route POST /api/requirements/:requirementId/generate-tasks
   * @desc Generate tasks for a requirement
   * @access Private
   */
  app.post(
    '/api/requirements/:requirementId/generate-tasks',
    isAuthenticated,
    requirementController.generateTasks.bind(requirementController)
  );

  /**
   * @route POST /api/requirements/:requirementId/generate-expert-review
   * @desc Generate expert review for a requirement
   * @access Private
   */
  app.post(
    '/api/requirements/:requirementId/generate-expert-review',
    isAuthenticated,
    requirementController.generateExpertReview.bind(requirementController)
  );

  /**
   * @route GET /api/requirements/:requirementId/references
   * @desc Get references for a requirement
   * @access Private
   */
  app.get(
    '/api/requirements/:requirementId/references',
    isAuthenticated,
    requirementController.getRequirementReferences.bind(requirementController)
  );

  /**
   * @route POST /api/requirements/analyze-contradictions
   * @desc Analyze contradictions between requirements
   * @access Private
   */
  app.post(
    '/api/requirements/analyze-contradictions',
    isAuthenticated,
    requirementController.analyzeContradictions.bind(requirementController)
  );

  /**
   * @route GET /api/requirements/contradiction-tasks/:taskId
   * @desc Get contradiction analysis task status
   * @access Private
   */
  app.get(
    '/api/requirements/contradiction-tasks/:taskId',
    isAuthenticated,
    requirementController.getContradictionTaskStatus.bind(requirementController)
  );

  /**
   * @route GET /api/projects/:projectId/contradictions
   * @desc Get contradictions for a project
   * @access Private
   */
  app.get(
    '/api/projects/:projectId/contradictions',
    isAuthenticated,
    requirementController.getProjectContradictions.bind(requirementController)
  );

  /**
   * @route GET /api/projects/:projectId/requirements/quality-check
   * @desc Run quality check on requirements
   * @access Private
   */
  app.get(
    '/api/projects/:projectId/requirements/quality-check',
    isAuthenticated,
    requirementController.qualityCheckRequirements.bind(requirementController)
  );
}