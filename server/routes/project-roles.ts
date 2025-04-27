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
// GET /api/requirements/:requirementId/role-efforts - Get all role efforts for a requirement
router.get('/requirements/:requirementId/role-efforts', requirementRoleEffortController.getRoleEffortsForRequirement);

// POST /api/requirements/:requirementId/role-efforts - Create a new effort
router.post('/requirements/:requirementId/role-efforts', requirementRoleEffortController.createRoleEffortForRequirement);

// DELETE /api/requirements/:requirementId/role-efforts/:effortId - Delete an effort
router.delete('/requirements/:requirementId/role-efforts/:effortId', requirementRoleEffortController.deleteRoleEffortForRequirement);

// Task Role Effort Routes
// GET /api/tasks/:taskId/role-efforts - Get all role efforts for a task
router.get('/tasks/:taskId/role-efforts', taskRoleEffortController.getRoleEffortsForTask);

// POST /api/tasks/:taskId/role-efforts - Create a new effort
router.post('/tasks/:taskId/role-efforts', taskRoleEffortController.createRoleEffortForTask);

// DELETE /api/tasks/:taskId/role-efforts/:effortId - Delete an effort
router.delete('/tasks/:taskId/role-efforts/:effortId', taskRoleEffortController.deleteRoleEffortForTask);

export default router;