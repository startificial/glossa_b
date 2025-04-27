/**
 * Repository Factory
 * 
 * This factory provides a centralized way to create and access repository instances.
 * It implements the singleton pattern to ensure only one instance of each repository exists.
 */
import { db } from '../db';
import { 
  IUserRepository, 
  IProjectRepository,
  IRequirementRepository
} from './interfaces';
import { 
  PostgresUserRepository 
} from './implementations/postgres-user-repository';
import {
  PostgresProjectRepository
} from './implementations/postgres-project-repository';
import {
  PostgresRequirementRepository
} from './implementations/postgres-requirement-repository';

/**
 * Repository factory interface
 * 
 * Defines the contract for repository factory implementations.
 */
export interface IRepositoryFactory {
  getUserRepository(): IUserRepository;
  getProjectRepository(): IProjectRepository;
  getRequirementRepository(): IRequirementRepository;
  // Add more repository getter methods as needed
}

/**
 * Repository factory implementation for PostgreSQL
 * 
 * Creates and manages repository instances for PostgreSQL repositories.
 */
class PostgresRepositoryFactory implements IRepositoryFactory {
  // Repository instances (lazy-initialized)
  private _userRepository: IUserRepository | null = null;
  private _projectRepository: IProjectRepository | null = null;
  private _requirementRepository: IRequirementRepository | null = null;
  // Add more repositories as needed
  
  /**
   * Get the user repository instance
   * 
   * @returns The user repository instance
   */
  getUserRepository(): IUserRepository {
    if (!this._userRepository) {
      this._userRepository = new PostgresUserRepository(db);
    }
    return this._userRepository;
  }
  
  /**
   * Get the project repository instance
   * 
   * @returns The project repository instance
   */
  getProjectRepository(): IProjectRepository {
    if (!this._projectRepository) {
      this._projectRepository = new PostgresProjectRepository(db);
    }
    return this._projectRepository;
  }
  
  /**
   * Get the requirement repository instance
   * 
   * @returns The requirement repository instance
   */
  getRequirementRepository(): IRequirementRepository {
    if (!this._requirementRepository) {
      this._requirementRepository = new PostgresRequirementRepository(db);
    }
    return this._requirementRepository;
  }
  
  // Add more repository getter methods as needed
}

/**
 * The global repository factory instance
 * 
 * This is the singleton instance that should be used throughout the application.
 */
export const repositoryFactory: IRepositoryFactory = new PostgresRepositoryFactory();