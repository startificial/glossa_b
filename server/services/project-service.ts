/**
 * Project Service
 * 
 * Handles business logic related to project management.
 * Acts as intermediary between controllers and repositories.
 */
import { Project, InsertProject } from '@shared/schema';
import { repositoryFactory } from '../repositories/repository-factory';
import { NotFoundError, BadRequestError } from '../error/api-error';

/**
 * Project Service provides business logic for project-related operations
 */
export class ProjectService {
  private projectRepository = repositoryFactory.getProjectRepository();
  
  /**
   * Get a project by ID
   * @param id Project ID
   * @throws NotFoundError if project does not exist
   */
  async getProjectById(id: number): Promise<Project> {
    const project = await this.projectRepository.findById(id);
    
    if (!project) {
      throw new NotFoundError(`Project with ID ${id} not found`);
    }
    
    return project;
  }
  
  /**
   * Get all projects for a user
   * @param userId User ID
   */
  async getProjectsByUser(userId: number): Promise<Project[]> {
    return this.projectRepository.findByUser(userId);
  }
  
  /**
   * Get all projects for a customer
   * @param customerId Customer ID
   */
  async getProjectsByCustomer(customerId: number): Promise<Project[]> {
    return this.projectRepository.findByCustomer(customerId);
  }
  
  /**
   * Get all projects
   * @param limit Optional limit on the number of results
   */
  async getAllProjects(limit?: number): Promise<Project[]> {
    return this.projectRepository.findAll(limit);
  }
  
  /**
   * Create a new project
   * @param projectData Project data to create
   * @throws BadRequestError for invalid data
   */
  async createProject(projectData: InsertProject): Promise<Project> {
    // Additional validation beyond schema validation could go here
    
    // Create the project
    try {
      return await this.projectRepository.create(projectData);
    } catch (error) {
      throw new BadRequestError(`Failed to create project: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Update a project
   * @param id Project ID
   * @param projectData Data to update
   * @throws NotFoundError if project does not exist
   */
  async updateProject(id: number, projectData: Partial<InsertProject>): Promise<Project> {
    // Ensure project exists
    const existingProject = await this.projectRepository.findById(id);
    if (!existingProject) {
      throw new NotFoundError(`Project with ID ${id} not found`);
    }
    
    // Update the project
    const updatedProject = await this.projectRepository.update(id, projectData);
    
    // This should never happen if we checked existence above
    if (!updatedProject) {
      throw new NotFoundError(`Project with ID ${id} not found during update`);
    }
    
    return updatedProject;
  }
  
  /**
   * Delete a project
   * @param id Project ID
   * @throws NotFoundError if project does not exist
   */
  async deleteProject(id: number): Promise<boolean> {
    // Ensure project exists
    const existingProject = await this.projectRepository.findById(id);
    if (!existingProject) {
      throw new NotFoundError(`Project with ID ${id} not found`);
    }
    
    // Delete the project
    const success = await this.projectRepository.delete(id);
    
    if (!success) {
      throw new BadRequestError(`Failed to delete project with ID ${id}`);
    }
    
    return true;
  }
  
  /**
   * Search for projects by name or description
   * @param query Search query
   */
  async searchProjects(query: string): Promise<Project[]> {
    return this.projectRepository.search(query);
  }
  
  /**
   * Get recently updated projects
   * @param limit Number of projects to return
   */
  async getRecentProjects(limit: number = 10): Promise<Project[]> {
    return this.projectRepository.findRecent(limit);
  }
}