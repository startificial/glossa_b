/**
 * Repository Factory
 * 
 * Provides a centralized way to create and access repository instances.
 * This helps with dependency injection and makes testing easier.
 */
import { IUserRepository } from './user-repository';
import { IRequirementRepository } from './requirement-repository';
import { IProjectRepository } from './project-repository';

import { PostgresUserRepository } from './implementations/postgres-user-repository';
import { PostgresRequirementRepository } from './implementations/postgres-requirement-repository';
import { PostgresProjectRepository } from './implementations/postgres-project-repository';

/**
 * Repository Factory interface
 * Defines the methods to access various repositories
 */
export interface IRepositoryFactory {
  /**
   * Get the user repository instance
   */
  getUserRepository(): IUserRepository;
  
  /**
   * Get the requirement repository instance
   */
  getRequirementRepository(): IRequirementRepository;
  
  /**
   * Get the project repository instance
   */
  getProjectRepository(): IProjectRepository;
}

/**
 * PostgreSQL Repository Factory implementation
 * Creates and caches PostgreSQL-specific repository implementations
 */
export class PostgresRepositoryFactory implements IRepositoryFactory {
  // Singleton instances of repositories
  private static userRepository: IUserRepository;
  private static requirementRepository: IRequirementRepository;
  private static projectRepository: IProjectRepository;
  
  /**
   * Get the user repository instance (singleton)
   */
  getUserRepository(): IUserRepository {
    if (!PostgresRepositoryFactory.userRepository) {
      PostgresRepositoryFactory.userRepository = new PostgresUserRepository();
    }
    return PostgresRepositoryFactory.userRepository;
  }
  
  /**
   * Get the requirement repository instance (singleton)
   */
  getRequirementRepository(): IRequirementRepository {
    if (!PostgresRepositoryFactory.requirementRepository) {
      PostgresRepositoryFactory.requirementRepository = new PostgresRequirementRepository();
    }
    return PostgresRepositoryFactory.requirementRepository;
  }
  
  /**
   * Get the project repository instance (singleton)
   */
  getProjectRepository(): IProjectRepository {
    if (!PostgresRepositoryFactory.projectRepository) {
      PostgresRepositoryFactory.projectRepository = new PostgresProjectRepository();
    }
    return PostgresRepositoryFactory.projectRepository;
  }
}

// Export a singleton instance of the factory
export const repositoryFactory: IRepositoryFactory = new PostgresRepositoryFactory();