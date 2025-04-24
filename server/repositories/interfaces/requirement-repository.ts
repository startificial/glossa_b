/**
 * Requirement Repository Interface
 * 
 * This file defines the interface for requirement repositories.
 * It extends the base repository interface and adds requirement-specific functionality.
 */
import { Requirement, InsertRequirement } from '@shared/schema';
import { IBaseRepository } from './base-repository';

/**
 * Interface for requirement repositories
 * 
 * Defines the contract that all requirement repositories must implement.
 */
export interface IRequirementRepository extends IBaseRepository<Requirement, number, InsertRequirement> {
  /**
   * Find requirements by project ID
   * 
   * @param projectId - The ID of the project
   * @returns Array of requirements in the project
   */
  findByProjectId(projectId: number): Promise<Requirement[]>;
  
  /**
   * Find high priority requirements for a project
   * 
   * @param projectId - The ID of the project
   * @param limit - Optional maximum number of requirements to return
   * @returns Array of high priority requirements
   */
  findHighPriority(projectId: number, limit?: number): Promise<Requirement[]>;
  
  /**
   * Find requirements by input data ID
   * 
   * @param inputDataId - The ID of the input data
   * @returns Array of requirements associated with the input data
   */
  findByInputDataId(inputDataId: number): Promise<Requirement[]>;
  
  /**
   * Verify that a requirement belongs to a project
   * 
   * @param requirementId - The ID of the requirement
   * @param projectId - The ID of the project
   * @returns The requirement if it belongs to the project, null otherwise
   */
  verifyProjectRequirement(requirementId: number, projectId: number): Promise<Requirement | null>;
}