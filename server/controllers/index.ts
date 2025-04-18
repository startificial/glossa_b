/**
 * Controllers Module Index
 * 
 * Exports all controller classes.
 * Controllers handle HTTP requests, validate inputs, and return responses.
 */

export * from './user-controller';
export * from './project-controller';
export * from './requirement-controller';
export * from './project-role-controller';
export * from './requirement-role-effort-controller';
export * from './task-role-effort-controller';

// Create and export singleton instances of each controller
import { UserController } from './user-controller';
import { ProjectController } from './project-controller';
import { RequirementController } from './requirement-controller';
import { ProjectRoleController } from './project-role-controller';
import { RequirementRoleEffortController } from './requirement-role-effort-controller';
import { TaskRoleEffortController } from './task-role-effort-controller';

// Singleton instances for route registration
export const userController = new UserController();
export const projectController = new ProjectController();
export const requirementController = new RequirementController();
export const projectRoleController = new ProjectRoleController();
export const requirementRoleEffortController = new RequirementRoleEffortController();
export const taskRoleEffortController = new TaskRoleEffortController();