/**
 * Requirement Analysis Routes
 * 
 * This module handles all API routes related to requirement analysis,
 * including contradictions and quality checks.
 */
import express from 'express';
import { requirementAnalysisController } from '../controllers/requirement-analysis-controller';
import { isAuthenticated } from '../middleware/auth';

const router = express.Router();

// Register routes with authentication middleware
router.use(isAuthenticated);

// POST /api/requirements/analyze-contradictions - Analyze contradictions between requirements
router.post('/requirements/analyze-contradictions', requirementAnalysisController.analyzeContradictions);

// GET /api/requirements/contradiction-tasks/:taskId - Get details of a contradiction task
router.get('/requirements/contradiction-tasks/:taskId', requirementAnalysisController.getContradictionTask);

// GET /api/projects/:projectId/contradictions - Get contradictions for a project
router.get('/projects/:projectId/contradictions', requirementAnalysisController.getProjectContradictions);

// GET /api/projects/:projectId/requirements/quality-check - Perform quality check on project requirements
router.get('/projects/:projectId/requirements/quality-check', requirementAnalysisController.checkRequirementQuality);

/**
 * Register requirement analysis routes with the Express application
 * @param app Express application instance
 */
export function registerRequirementAnalysisRoutes(app: express.Express): void {
  app.use('/api', router);
}

export default router;