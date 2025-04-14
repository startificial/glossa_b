/**
 * Controllers Module Index
 * 
 * Exports all controller classes.
 * Controllers handle HTTP requests, validate inputs, and return responses.
 */

export * from './user-controller';
export * from './project-controller';
export * from './requirement-controller';

// Create and export singleton instances of each controller
import { UserController } from './user-controller';
import { ProjectController } from './project-controller';
import { RequirementController } from './requirement-controller';

// Singleton instances for route registration
export const userController = new UserController();
export const projectController = new ProjectController();
export const requirementController = new RequirementController();