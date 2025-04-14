/**
 * Base Repository Interfaces
 * 
 * Defines interfaces for repository implementations to follow.
 * These provide a consistent API for accessing data regardless of storage.
 */
import { User, Project, Requirement } from '@shared/schema';

// Custom Task interface (can be expanded based on actual schema)
export interface Task {
  id: number;
  title: string;
  description: string;
  requirementId: number;
  projectId?: number;
  assigneeId?: number;
  status: string;
  priority: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Generic base repository interface
 * @template T The entity type
 * @template ID The ID type (usually number)
 */
export interface IBaseRepository<T, ID> {
  findAll(): Promise<T[]>;
  findById(id: ID): Promise<T | null>;
  create(entity: any): Promise<T>;
  update(id: ID, entity: Partial<T>): Promise<T>;
  delete(id: ID): Promise<boolean>;
}

/**
 * User repository interface
 */
export interface UserRepository extends IBaseRepository<User, number> {
  findByUsername(username: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
}

/**
 * Project repository interface
 */
export interface ProjectRepository extends IBaseRepository<Project, number> {
  findByUserId(userId: number): Promise<Project[]>;
  findRecent(limit: number): Promise<Project[]>;
  search(query: string): Promise<Project[]>;
}

/**
 * Requirement repository interface
 */
export interface RequirementRepository extends IBaseRepository<Requirement, number> {
  findByProjectId(projectId: number): Promise<Requirement[]>;
  findHighPriorityByProjectId(projectId: number, limit?: number): Promise<Requirement[]>;
  findByCategoryAndProjectId(projectId: number, category: string): Promise<Requirement[]>;
  findByIdWithProject(id: number): Promise<{ requirement: Requirement; project: Project } | null>;
}

/**
 * Task repository interface
 */
export interface TaskRepository extends IBaseRepository<Task, number> {
  findByRequirementId(requirementId: number): Promise<Task[]>;
  findByProjectId(projectId: number): Promise<Task[]>;
  findByAssigneeId(assigneeId: number): Promise<Task[]>;
}