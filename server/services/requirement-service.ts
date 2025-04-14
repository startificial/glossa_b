/**
 * Requirement Service
 * 
 * Handles business logic related to requirement management.
 */
import { RequirementRepository, ProjectRepository } from '../repositories/base-repository';
import { Requirement, InsertRequirement } from '@shared/schema';
import { NotFoundError, ForbiddenError, BadRequestError } from '../error/api-error';

/**
 * Service for managing requirements
 */
export class RequirementService {
  private requirementRepository: RequirementRepository;
  private projectRepository: ProjectRepository;
  
  /**
   * Create a RequirementService instance
   * @param requirementRepository Repository for requirement data access
   * @param projectRepository Repository for project data access (needed for validation)
   */
  constructor(
    requirementRepository: RequirementRepository,
    projectRepository: ProjectRepository
  ) {
    this.requirementRepository = requirementRepository;
    this.projectRepository = projectRepository;
  }
  
  /**
   * Get all requirements
   * @returns Array of all requirements
   */
  async getAllRequirements(): Promise<Requirement[]> {
    return this.requirementRepository.findAll();
  }
  
  /**
   * Get requirements by project ID
   * @param projectId Project ID to filter by
   * @returns Array of requirements for the project
   */
  async getRequirementsByProject(projectId: number): Promise<Requirement[]> {
    // Verify project exists
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new NotFoundError(`Project with ID ${projectId} not found`);
    }
    
    return this.requirementRepository.findByProjectId(projectId);
  }
  
  /**
   * Get a requirement by ID
   * @param requirementId ID of the requirement to retrieve
   * @returns Requirement with the specified ID
   */
  async getRequirementById(requirementId: number): Promise<Requirement> {
    const requirement = await this.requirementRepository.findById(requirementId);
    if (!requirement) {
      throw new NotFoundError(`Requirement with ID ${requirementId} not found`);
    }
    
    return requirement;
  }
  
  /**
   * Get a requirement by ID with project access check
   * @param requirementId ID of the requirement to retrieve
   * @param projectId Project ID to check for access
   * @returns Requirement if it belongs to the specified project
   */
  async getRequirementWithProjectCheck(requirementId: number, projectId: number): Promise<Requirement> {
    const requirement = await this.getRequirementById(requirementId);
    
    // Check if the requirement belongs to the specified project
    if (requirement.projectId !== projectId) {
      throw new ForbiddenError('This requirement does not belong to the specified project');
    }
    
    return requirement;
  }
  
  /**
   * Create a new requirement
   * @param requirementData Requirement data to create
   * @returns Created requirement
   */
  async createRequirement(requirementData: InsertRequirement): Promise<Requirement> {
    // Verify project exists
    const project = await this.projectRepository.findById(requirementData.projectId);
    if (!project) {
      throw new BadRequestError(`Project with ID ${requirementData.projectId} not found`);
    }
    
    // Set creation and update timestamps
    const now = new Date();
    const dataWithTimestamps = {
      ...requirementData,
      createdAt: now,
      updatedAt: now
    };
    
    return this.requirementRepository.create(dataWithTimestamps);
  }
  
  /**
   * Update a requirement
   * @param requirementId ID of the requirement to update
   * @param requirementData Requirement data to update
   * @returns Updated requirement
   */
  async updateRequirement(requirementId: number, requirementData: Partial<Requirement>): Promise<Requirement> {
    // Get existing requirement
    const existingRequirement = await this.getRequirementById(requirementId);
    
    // Update the updatedAt timestamp
    const dataWithTimestamp = {
      ...requirementData,
      updatedAt: new Date()
    };
    
    // Update and return the requirement
    return this.requirementRepository.update(requirementId, dataWithTimestamp);
  }
  
  /**
   * Delete a requirement
   * @param requirementId ID of the requirement to delete
   * @returns True if the requirement was deleted
   */
  async deleteRequirement(requirementId: number): Promise<boolean> {
    // Verify requirement exists
    await this.getRequirementById(requirementId);
    
    // Delete the requirement
    return this.requirementRepository.delete(requirementId);
  }
  
  /**
   * Get high priority requirements for a project
   * @param projectId Project ID to filter by
   * @param limit Maximum number of requirements to return
   * @returns Array of high priority requirements
   */
  async getHighPriorityRequirements(projectId: number, limit?: number): Promise<Requirement[]> {
    // Verify project exists
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new NotFoundError(`Project with ID ${projectId} not found`);
    }
    
    return this.requirementRepository.findHighPriorityByProjectId(projectId, limit);
  }
  
  /**
   * Get requirements by category for a project
   * @param projectId Project ID to filter by
   * @param category Category to filter by
   * @returns Array of requirements with the specified category
   */
  async getRequirementsByCategory(projectId: number, category: string): Promise<Requirement[]> {
    // Verify project exists
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new NotFoundError(`Project with ID ${projectId} not found`);
    }
    
    return this.requirementRepository.findByCategoryAndProjectId(projectId, category);
  }
}