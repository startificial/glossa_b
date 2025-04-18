/**
 * Project Roles API Routes
 * 
 * This module handles all API routes related to project roles, requirement role efforts,
 * and task role efforts.
 */
import express from 'express';
import { isAuthenticated } from '../middleware/auth';
import { 
  projectRoleController,
  requirementRoleEffortController,
  taskRoleEffortController
} from '../controllers';

const router = express.Router();

// All routes require authentication
router.use(isAuthenticated);

// Project Roles Routes
// GET /api/projects/:projectId/roles - Get all roles for a project
router.get('/projects/:projectId/roles', projectRoleController.getAllProjectRoles);

// GET /api/projects/:projectId/roles/:roleId - Get a specific role
router.get('/projects/:projectId/roles/:roleId', projectRoleController.getProjectRole);

// POST /api/projects/:projectId/roles - Create a new role
router.post('/projects/:projectId/roles', projectRoleController.createProjectRole);

// PUT /api/projects/:projectId/roles/:roleId - Update a role
router.put('/projects/:projectId/roles/:roleId', projectRoleController.updateProjectRole);

// DELETE /api/projects/:projectId/roles/:roleId - Delete a role
router.delete('/projects/:projectId/roles/:roleId', projectRoleController.deleteProjectRole);

// Requirement Role Effort Routes
// GET /api/projects/:projectId/requirements/:requirementId/efforts - Get all role efforts for a requirement
router.get('/projects/:projectId/requirements/:requirementId/efforts', requirementRoleEffortController.getAllEfforts);

// POST /api/projects/:projectId/requirements/:requirementId/efforts - Create a new effort
router.post('/projects/:projectId/requirements/:requirementId/efforts', requirementRoleEffortController.createEffort);

// PUT /api/projects/:projectId/requirements/:requirementId/efforts/:effortId - Update an effort
router.put('/projects/:projectId/requirements/:requirementId/efforts/:effortId', requirementRoleEffortController.updateEffort);

// DELETE /api/projects/:projectId/requirements/:requirementId/efforts/:effortId - Delete an effort
router.delete('/projects/:projectId/requirements/:requirementId/efforts/:effortId', requirementRoleEffortController.deleteEffort);

// Task Role Effort Routes
// GET /api/projects/:projectId/tasks/:taskId/efforts - Get all role efforts for a task
router.get('/projects/:projectId/tasks/:taskId/efforts', taskRoleEffortController.getAllEfforts);

// POST /api/projects/:projectId/tasks/:taskId/efforts - Create a new effort
router.post('/projects/:projectId/tasks/:taskId/efforts', taskRoleEffortController.createEffort);

// PUT /api/projects/:projectId/tasks/:taskId/efforts/:effortId - Update an effort
router.put('/projects/:projectId/tasks/:taskId/efforts/:effortId', taskRoleEffortController.updateEffort);

// DELETE /api/projects/:projectId/tasks/:taskId/efforts/:effortId - Delete an effort
router.delete('/projects/:projectId/tasks/:taskId/efforts/:effortId', taskRoleEffortController.deleteEffort);

export default router;