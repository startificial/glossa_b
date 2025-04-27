/**
 * Project Repository Interface
 * 
 * This file defines the project repository interface that extends the base repository
 * with project-specific operations.
 */
import { IBaseRepository } from './base-repository';
import { Project, InsertProject } from '@shared/schema';

/**
 * Project Repository Interface
 * 
 * Defines operations specific to project entities, extending the base repository
 * with methods for project management and filtering.
 */
export interface IProjectRepository extends IBaseRepository<Project, number, InsertProject> {
  /**
   * Find projects by user ID
   * 
   * @param userId - The ID of the user who owns the projects
   * @returns Array of projects belonging to the user
   */
  findByUserId(userId: number): Promise<Project[]>;

  /**
   * Find projects by customer ID
   * 
   * @param customerId - The ID of the customer associated with the projects
   * @returns Array of projects for the customer
   */
  findByCustomerId(customerId: number): Promise<Project[]>;
  
  /**
   * Search projects by name or description
   * 
   * @param query - The search query string
   * @param userId - Optional user ID to limit the search to a specific user's projects
   * @param limit - Optional maximum number of results
   * @returns Array of matching projects
   */
  search(query: string, userId?: number, limit?: number): Promise<Project[]>;
  
  /**
   * Find projects by stage
   * 
   * @param stage - The project stage to filter by
   * @param userId - Optional user ID to limit the search to a specific user's projects
   * @returns Array of projects in the specified stage
   */
  findByStage(stage: string, userId?: number): Promise<Project[]>;
  
  /**
   * Get project statistics
   * 
   * @param projectId - The ID of the project
   * @returns Statistics about the project (e.g., count of requirements, tasks, etc.)
   */
  getStatistics(projectId: number): Promise<{
    requirementsCount: number;
    tasksCount: number;
    completedTasksCount: number;
    inputDataCount: number;
  }>;
}