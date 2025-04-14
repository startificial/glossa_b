/**
 * Project Repository Interface
 * 
 * Defines the operations specific to project management beyond the base repository.
 */
import { Project, InsertProject } from '@shared/schema';
import { IBaseRepository } from './base-repository';

export interface IProjectRepository extends IBaseRepository<Project, InsertProject, Partial<InsertProject>> {
  /**
   * Find projects by user ID
   */
  findByUser(userId: number): Promise<Project[]>;
  
  /**
   * Find projects by customer ID
   */
  findByCustomer(customerId: number): Promise<Project[]>;
  
  /**
   * Find projects by type
   */
  findByType(type: string): Promise<Project[]>;
  
  /**
   * Search projects by name or description
   */
  search(query: string): Promise<Project[]>;
  
  /**
   * Get recently updated projects
   */
  findRecent(limit?: number): Promise<Project[]>;
}