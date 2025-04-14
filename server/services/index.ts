/**
 * Services Module Index
 * 
 * Exports all service classes.
 * Services provide business logic between controllers and repositories.
 */

export * from './user-service';
export * from './project-service';
export * from './requirement-service';

// Create and export singleton instances of each service
import { UserService } from './user-service';
import { ProjectService } from './project-service';
import { RequirementService } from './requirement-service';

// Singleton instances for dependency injection
export const userService = new UserService();
export const projectService = new ProjectService();
export const requirementService = new RequirementService();