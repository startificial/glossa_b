/**
 * Requirement Service
 * 
 * Handles business logic related to requirement management.
 * Acts as intermediary between controllers and repositories.
 */
import { Requirement, InsertRequirement } from '@shared/schema';
import { repositoryFactory } from '../repositories/repository-factory';
import { NotFoundError, BadRequestError } from '../error/api-error';

/**
 * Requirement Service provides business logic for requirement-related operations
 */
export class RequirementService {
  private requirementRepository = repositoryFactory.getRequirementRepository();
  
  /**
   * Get a requirement by ID
   * @param id Requirement ID
   * @throws NotFoundError if requirement does not exist
   */
  async getRequirementById(id: number): Promise<Requirement> {
    const requirement = await this.requirementRepository.findById(id);
    
    if (!requirement) {
      throw new NotFoundError(`Requirement with ID ${id} not found`);
    }
    
    return requirement;
  }
  
  /**
   * Get a requirement by ID with project check for access control
   * @param id Requirement ID
   * @param projectId Project ID that should own this requirement
   * @throws NotFoundError if requirement does not exist or doesn't belong to project
   */
  async getRequirementWithProjectCheck(id: number, projectId: number): Promise<Requirement> {
    const requirement = await this.requirementRepository.findById(id);
    
    if (!requirement) {
      throw new NotFoundError(`Requirement with ID ${id} not found`);
    }
    
    if (requirement.projectId !== projectId) {
      throw new NotFoundError(`Requirement with ID ${id} does not belong to project ${projectId}`);
    }
    
    return requirement;
  }
  
  /**
   * Get all requirements for a project
   * @param projectId Project ID
   */
  async getRequirementsByProject(projectId: number): Promise<Requirement[]> {
    return this.requirementRepository.findByProject(projectId);
  }
  
  /**
   * Get all requirements for an input data source
   * @param inputDataId Input data ID
   */
  async getRequirementsByInputData(inputDataId: number): Promise<Requirement[]> {
    return this.requirementRepository.findByInputData(inputDataId);
  }
  
  /**
   * Get high priority requirements for a project
   * @param projectId Project ID
   * @param limit Optional limit on the number of results
   */
  async getHighPriorityRequirements(projectId: number, limit?: number): Promise<Requirement[]> {
    return this.requirementRepository.findHighPriority(projectId, limit);
  }
  
  /**
   * Create a new requirement
   * @param requirementData Requirement data to create
   * @throws BadRequestError for invalid data
   */
  async createRequirement(requirementData: InsertRequirement): Promise<Requirement> {
    // Additional validation beyond schema validation could go here
    
    // Check if a requirement with the same title already exists in this project
    if (requirementData.title && requirementData.projectId) {
      const exists = await this.requirementRepository.existsByTitle(
        requirementData.projectId, 
        requirementData.title
      );
      
      if (exists) {
        throw new BadRequestError(`A requirement with title "${requirementData.title}" already exists in this project`);
      }
    }
    
    // Create the requirement
    try {
      return await this.requirementRepository.create(requirementData);
    } catch (error) {
      throw new BadRequestError(`Failed to create requirement: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Update a requirement
   * @param id Requirement ID
   * @param requirementData Data to update
   * @throws NotFoundError if requirement does not exist
   */
  async updateRequirement(id: number, requirementData: Partial<InsertRequirement>): Promise<Requirement> {
    // Ensure requirement exists
    const existingRequirement = await this.requirementRepository.findById(id);
    if (!existingRequirement) {
      throw new NotFoundError(`Requirement with ID ${id} not found`);
    }
    
    // If title is being changed, check for duplicates
    if (requirementData.title && 
        requirementData.title !== existingRequirement.title && 
        existingRequirement.projectId) {
      const exists = await this.requirementRepository.existsByTitle(
        existingRequirement.projectId, 
        requirementData.title
      );
      
      if (exists) {
        throw new BadRequestError(`A requirement with title "${requirementData.title}" already exists in this project`);
      }
    }
    
    // Update the requirement
    const updatedRequirement = await this.requirementRepository.update(id, requirementData);
    
    // This should never happen if we checked existence above
    if (!updatedRequirement) {
      throw new NotFoundError(`Requirement with ID ${id} not found during update`);
    }
    
    // Invalidate cache if the repository supports it
    if (this.requirementRepository.invalidateCache) {
      this.requirementRepository.invalidateCache(id);
    }
    
    return updatedRequirement;
  }
  
  /**
   * Delete a requirement
   * @param id Requirement ID
   * @throws NotFoundError if requirement does not exist
   */
  async deleteRequirement(id: number): Promise<boolean> {
    // Ensure requirement exists
    const existingRequirement = await this.requirementRepository.findById(id);
    if (!existingRequirement) {
      throw new NotFoundError(`Requirement with ID ${id} not found`);
    }
    
    // Delete the requirement
    const success = await this.requirementRepository.delete(id);
    
    if (!success) {
      throw new BadRequestError(`Failed to delete requirement with ID ${id}`);
    }
    
    // Invalidate cache if the repository supports it
    if (this.requirementRepository.invalidateCache) {
      this.requirementRepository.invalidateCache(id);
    }
    
    return true;
  }
  
  /**
   * Find requirements by category
   * @param projectId Project ID
   * @param category Category to search for
   */
  async getRequirementsByCategory(projectId: number, category: string): Promise<Requirement[]> {
    return this.requirementRepository.findByCategory(projectId, category);
  }
}