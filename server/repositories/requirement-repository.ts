/**
 * Requirement Repository Interface
 * 
 * Defines the operations specific to requirement management beyond the base repository.
 */
import { Requirement, InsertRequirement } from '@shared/schema';
import { IBaseRepository } from './base-repository';

export interface IRequirementRepository extends IBaseRepository<Requirement, InsertRequirement, Partial<InsertRequirement>> {
  /**
   * Find requirements by project ID
   */
  findByProject(projectId: number): Promise<Requirement[]>;
  
  /**
   * Find requirements associated with a specific input data ID
   */
  findByInputData(inputDataId: number): Promise<Requirement[]>;
  
  /**
   * Get high priority requirements for a project
   * @param limit Optional limit on the number of results
   */
  findHighPriority(projectId: number, limit?: number): Promise<Requirement[]>;
  
  /**
   * Find requirements by category
   */
  findByCategory(projectId: number, category: string): Promise<Requirement[]>;
  
  /**
   * Check if a requirement exists by title
   */
  existsByTitle(projectId: number, title: string): Promise<boolean>;
  
  /**
   * Optional method to invalidate any cached requirement data
   */
  invalidateCache?(id: number): void;
}