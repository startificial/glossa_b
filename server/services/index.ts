/**
 * Services Module Index
 * 
 * Exports all service classes.
 * Services handle business logic and abstract away data access.
 */

export * from './user-service';
export * from './project-service';
export * from './requirement-service';

// Create and export singleton instances of each service
import { UserService } from './user-service';
import { ProjectService } from './project-service';
import { RequirementService } from './requirement-service';
import { repositoryFactory } from '../repositories/repository-factory';

// Singleton instances
export const userService = new UserService(repositoryFactory.getUserRepository());
export const projectService = new ProjectService(repositoryFactory.getProjectRepository());
export const requirementService = new RequirementService(
  repositoryFactory.getRequirementRepository(),
  repositoryFactory.getProjectRepository()
);