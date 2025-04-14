/**
 * Repository Factory
 * 
 * Factory for creating repository instances.
 * Centralizes repository creation and handles configuration.
 */
// Mock database import for now - will be replaced with actual database connection
const db = {};

import {
  UserRepository,
  ProjectRepository,
  RequirementRepository,
  TaskRepository
} from './base-repository';

// Import implementations when they exist
// import { PostgresUserRepository } from './implementations/postgres-user-repository';
// import { PostgresProjectRepository } from './implementations/postgres-project-repository';
// import { PostgresRequirementRepository } from './implementations/postgres-requirement-repository';
// import { PostgresTaskRepository } from './implementations/postgres-task-repository';

/**
 * Repository Factory
 * 
 * Provides methods to get repository instances.
 * This allows easy swapping of implementations.
 */
class RepositoryFactory {
  private _userRepository: UserRepository | null = null;
  private _projectRepository: ProjectRepository | null = null;
  private _requirementRepository: RequirementRepository | null = null;
  private _taskRepository: TaskRepository | null = null;
  
  /**
   * Get the user repository
   * @returns UserRepository instance
   */
  getUserRepository(): UserRepository {
    if (!this._userRepository) {
      // For now, create a mock implementation
      // When PostgresUserRepository is implemented, use:
      // this._userRepository = new PostgresUserRepository(db);
      this._userRepository = this.createMockUserRepository();
    }
    
    return this._userRepository;
  }
  
  /**
   * Get the project repository
   * @returns ProjectRepository instance
   */
  getProjectRepository(): ProjectRepository {
    if (!this._projectRepository) {
      // For now, create a mock implementation
      // When PostgresProjectRepository is implemented, use:
      // this._projectRepository = new PostgresProjectRepository(db);
      this._projectRepository = this.createMockProjectRepository();
    }
    
    return this._projectRepository;
  }
  
  /**
   * Get the requirement repository
   * @returns RequirementRepository instance
   */
  getRequirementRepository(): RequirementRepository {
    if (!this._requirementRepository) {
      // For now, create a mock implementation
      // When PostgresRequirementRepository is implemented, use:
      // this._requirementRepository = new PostgresRequirementRepository(db);
      this._requirementRepository = this.createMockRequirementRepository();
    }
    
    return this._requirementRepository;
  }
  
  /**
   * Get the task repository
   * @returns TaskRepository instance
   */
  getTaskRepository(): TaskRepository {
    if (!this._taskRepository) {
      // For now, create a mock implementation
      // When PostgresTaskRepository is implemented, use:
      // this._taskRepository = new PostgresTaskRepository(db);
      this._taskRepository = this.createMockTaskRepository();
    }
    
    return this._taskRepository;
  }
  
  /**
   * Create a mock user repository for development
   * @returns Mock UserRepository
   */
  private createMockUserRepository(): UserRepository {
    return {
      findAll: async () => [],
      findById: async (id) => ({ id: id, username: 'demo', password: 'password', email: 'demo@example.com' } as any),
      findByUsername: async (username) => ({ id: 1, username, password: 'password', email: 'demo@example.com' } as any),
      findByEmail: async (email) => ({ id: 1, username: 'demo', password: 'password', email } as any),
      create: async (entity) => ({ id: 1, ...entity }),
      update: async (id, entity) => ({ id, ...entity }),
      delete: async () => true
    };
  }
  
  /**
   * Create a mock project repository for development
   * @returns Mock ProjectRepository
   */
  private createMockProjectRepository(): ProjectRepository {
    return {
      findAll: async () => [],
      findById: async (id) => ({ id: id, name: 'Sample Project', description: 'Sample description', userId: 1 } as any),
      findByUserId: async () => [{ id: 1, name: 'Sample Project', description: 'Sample description', userId: 1 }] as any,
      findRecent: async () => [{ id: 1, name: 'Sample Project', description: 'Sample description', userId: 1 }] as any,
      search: async () => [{ id: 1, name: 'Sample Project', description: 'Sample description', userId: 1 }] as any,
      create: async (entity) => ({ id: 1, ...entity }),
      update: async (id, entity) => ({ id, ...entity }),
      delete: async () => true
    };
  }
  
  /**
   * Create a mock requirement repository for development
   * @returns Mock RequirementRepository
   */
  private createMockRequirementRepository(): RequirementRepository {
    return {
      findAll: async () => [],
      findById: async (id) => ({ id: id, title: 'Sample Requirement', description: 'Sample description', projectId: 1 } as any),
      findByProjectId: async () => [{ id: 1, title: 'Sample Requirement', description: 'Sample description', projectId: 1 }] as any,
      findHighPriorityByProjectId: async () => [{ id: 1, title: 'High Priority', description: 'Important', projectId: 1, priority: 'high' }] as any,
      findByCategoryAndProjectId: async () => [{ id: 1, title: 'Sample Requirement', description: 'Sample description', projectId: 1, category: 'functional' }] as any,
      findByIdWithProject: async (id) => ({ 
        requirement: { id, title: 'Sample Requirement', description: 'Sample description', projectId: 1 },
        project: { id: 1, name: 'Sample Project', description: 'Sample description', userId: 1 }
      } as any),
      create: async (entity) => ({ id: 1, ...entity }),
      update: async (id, entity) => ({ id, ...entity }),
      delete: async () => true
    };
  }
  
  /**
   * Create a mock task repository for development
   * @returns Mock TaskRepository
   */
  private createMockTaskRepository(): TaskRepository {
    return {
      findAll: async () => [],
      findById: async (id) => ({ id: id, title: 'Sample Task', description: 'Sample description', requirementId: 1 } as any),
      findByRequirementId: async () => [{ id: 1, title: 'Sample Task', description: 'Sample description', requirementId: 1 }] as any,
      findByProjectId: async () => [{ id: 1, title: 'Sample Task', description: 'Sample description', requirementId: 1, projectId: 1 }] as any,
      findByAssigneeId: async () => [{ id: 1, title: 'Sample Task', description: 'Sample description', requirementId: 1, assigneeId: 1 }] as any,
      create: async (entity) => ({ id: 1, ...entity }),
      update: async (id, entity) => ({ id, ...entity }),
      delete: async () => true
    };
  }
}

// Create a singleton instance of the factory
export const repositoryFactory = new RepositoryFactory();