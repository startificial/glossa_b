/**
 * Repository Factory
 * 
 * This module implements the Factory Pattern for creating and caching repository instances.
 * It provides a centralized point for repository instantiation and dependency injection.
 */
import type { PgDatabase } from 'drizzle-orm/pg-core';
import { db } from '../db';

// Import repository interfaces
import type { 
  IUserRepository,
  IProjectRepository, 
  IRequirementRepository, 
  ITaskRepository,
  ICustomerRepository,
  IInputDataRepository,
  IActivityRepository,
  IInviteRepository,
  IWorkflowRepository
} from './interfaces';

// Import repository implementations
import { PostgresUserRepository } from './implementations/postgres-user-repository';
import { PostgresProjectRepository } from './implementations/postgres-project-repository';
import { PostgresRequirementRepository } from './implementations/postgres-requirement-repository';
import { PostgresTaskRepository } from './implementations/postgres-task-repository';
import { PostgresCustomerRepository } from './implementations/postgres-customer-repository';
import { PostgresInputDataRepository } from './implementations/postgres-input-data-repository';
import { PostgresActivityRepository } from './implementations/postgres-activity-repository';
import { PostgresInviteRepository } from './implementations/postgres-invite-repository';
import { PostgresWorkflowRepository } from './implementations/postgres-workflow-repository';

/**
 * Repository Factory Interface
 * 
 * Defines methods to get repository instances for each entity type.
 */
export interface IRepositoryFactory {
  getUserRepository(): IUserRepository;
  getProjectRepository(): IProjectRepository;
  getRequirementRepository(): IRequirementRepository;
  getTaskRepository(): ITaskRepository;
  getCustomerRepository(): ICustomerRepository;
  getInputDataRepository(): IInputDataRepository;
  getActivityRepository(): IActivityRepository;
  getInviteRepository(): IInviteRepository;
  getWorkflowRepository(): IWorkflowRepository;
}

/**
 * Repository Factory Implementation
 * 
 * Creates and caches repository instances.
 * Uses constructor dependency injection to provide the database connection.
 */
export class RepositoryFactory implements IRepositoryFactory {
  private _db: PgDatabase;
  
  // Repository instance cache
  private readonly _repositories: {
    user?: IUserRepository;
    project?: IProjectRepository;
    requirement?: IRequirementRepository;
    task?: ITaskRepository;
    customer?: ICustomerRepository;
    inputData?: IInputDataRepository;
    activity?: IActivityRepository;
    invite?: IInviteRepository;
    workflow?: IWorkflowRepository;
  };
  
  /**
   * Creates a new RepositoryFactory instance
   * 
   * @param db - The database connection to inject into repositories
   */
  constructor(db: PgDatabase) {
    this._db = db;
    this._repositories = {};
  }
  
  /**
   * Get the User repository
   * 
   * @returns An implementation of IUserRepository
   */
  getUserRepository(): IUserRepository {
    if (!this._repositories.user) {
      this._repositories.user = new PostgresUserRepository(this._db);
    }
    return this._repositories.user;
  }
  
  /**
   * Get the Project repository
   * 
   * @returns An implementation of IProjectRepository
   */
  getProjectRepository(): IProjectRepository {
    if (!this._repositories.project) {
      this._repositories.project = new PostgresProjectRepository(this._db);
    }
    return this._repositories.project;
  }
  
  /**
   * Get the Requirement repository
   * 
   * @returns An implementation of IRequirementRepository
   */
  getRequirementRepository(): IRequirementRepository {
    if (!this._repositories.requirement) {
      this._repositories.requirement = new PostgresRequirementRepository(this._db);
    }
    return this._repositories.requirement;
  }
  
  /**
   * Get the Task repository
   * 
   * @returns An implementation of ITaskRepository
   */
  getTaskRepository(): ITaskRepository {
    if (!this._repositories.task) {
      this._repositories.task = new PostgresTaskRepository(this._db);
    }
    return this._repositories.task;
  }
  
  /**
   * Get the Customer repository
   * 
   * @returns An implementation of ICustomerRepository
   */
  getCustomerRepository(): ICustomerRepository {
    if (!this._repositories.customer) {
      this._repositories.customer = new PostgresCustomerRepository(this._db);
    }
    return this._repositories.customer;
  }
  
  /**
   * Get the InputData repository
   * 
   * @returns An implementation of IInputDataRepository
   */
  getInputDataRepository(): IInputDataRepository {
    if (!this._repositories.inputData) {
      this._repositories.inputData = new PostgresInputDataRepository(this._db);
    }
    return this._repositories.inputData;
  }
  
  /**
   * Get the Activity repository
   * 
   * @returns An implementation of IActivityRepository
   */
  getActivityRepository(): IActivityRepository {
    if (!this._repositories.activity) {
      this._repositories.activity = new PostgresActivityRepository(this._db);
    }
    return this._repositories.activity;
  }
  
  /**
   * Get the Invite repository
   * 
   * @returns An implementation of IInviteRepository
   */
  getInviteRepository(): IInviteRepository {
    if (!this._repositories.invite) {
      this._repositories.invite = new PostgresInviteRepository(this._db);
    }
    return this._repositories.invite;
  }
  
  /**
   * Get the Workflow repository
   * 
   * @returns An implementation of IWorkflowRepository
   */
  getWorkflowRepository(): IWorkflowRepository {
    if (!this._repositories.workflow) {
      this._repositories.workflow = new PostgresWorkflowRepository(this._db);
    }
    return this._repositories.workflow;
  }
}

/**
 * Singleton instance of the repository factory
 * 
 * Provides global access to repositories with proper dependency injection.
 */
export const repositoryFactory = new RepositoryFactory(db);