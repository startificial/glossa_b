/**
 * Project Service
 * 
 * Handles business logic related to project management.
 */
import { ProjectRepository } from '../repositories/base-repository';
import { Project, InsertProject } from '@shared/schema';
import { NotFoundError, ForbiddenError } from '../error/api-error';

/**
 * Service for managing projects
 */
export class ProjectService {
  private projectRepository: ProjectRepository;
  
  /**
   * Create a ProjectService instance
   * @param projectRepository Repository for project data access
   */
  constructor(projectRepository: ProjectRepository) {
    this.projectRepository = projectRepository;
  }
  
  /**
   * Get all projects
   * @returns Array of all projects
   */
  async getAllProjects(): Promise<Project[]> {
    return this.projectRepository.findAll();
  }
  
  /**
   * Get projects by user ID
   * @param userId User ID to filter by
   * @returns Array of projects belonging to the user
   */
  async getProjectsByUser(userId: number): Promise<Project[]> {
    return this.projectRepository.findByUserId(userId);
  }
  
  /**
   * Get a project by ID
   * @param projectId ID of the project to retrieve
   * @returns Project with the specified ID
   */
  async getProjectById(projectId: number): Promise<Project> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new NotFoundError(`Project with ID ${projectId} not found`);
    }
    return project;
  }
  
  /**
   * Create a new project
   * @param projectData Project data to create
   * @returns Created project
   */
  async createProject(projectData: InsertProject): Promise<Project> {
    // Set creation and update timestamps
    const now = new Date();
    const dataWithTimestamps = {
      ...projectData,
      createdAt: now,
      updatedAt: now
    };
    
    return this.projectRepository.create(dataWithTimestamps);
  }
  
  /**
   * Update a project
   * @param projectId ID of the project to update
   * @param projectData Project data to update
   * @returns Updated project
   */
  async updateProject(projectId: number, projectData: Partial<Project>): Promise<Project> {
    // Get existing project
    const existingProject = await this.getProjectById(projectId);
    
    // Update the updatedAt timestamp
    const dataWithTimestamp = {
      ...projectData,
      updatedAt: new Date()
    };
    
    // Update and return the project
    return this.projectRepository.update(projectId, dataWithTimestamp);
  }
  
  /**
   * Delete a project
   * @param projectId ID of the project to delete
   * @returns True if the project was deleted
   */
  async deleteProject(projectId: number): Promise<boolean> {
    // Verify project exists
    await this.getProjectById(projectId);
    
    // Delete the project
    return this.projectRepository.delete(projectId);
  }
  
  /**
   * Check if a user has access to a project
   * @param projectId ID of the project to check
   * @param userId ID of the user to check
   * @returns True if the user has access to the project
   */
  async checkUserAccess(projectId: number, userId: number): Promise<boolean> {
    const project = await this.getProjectById(projectId);
    
    // Currently, only the project owner has access
    return project.userId === userId;
  }
  
  /**
   * Verify a user has access to a project, throw ForbiddenError if not
   * @param projectId ID of the project to check
   * @param userId ID of the user to check
   */
  async verifyUserAccess(projectId: number, userId: number): Promise<void> {
    const hasAccess = await this.checkUserAccess(projectId, userId);
    if (!hasAccess) {
      throw new ForbiddenError('You do not have access to this project');
    }
  }
  
  /**
   * Search projects by query
   * @param query Search query string 
   * @returns Array of projects matching the query
   */
  async searchProjects(query: string): Promise<Project[]> {
    return this.projectRepository.search(query);
  }
  
  /**
   * Get recent projects
   * @param limit Maximum number of projects to return
   * @returns Array of recent projects
   */
  async getRecentProjects(limit: number = 10): Promise<Project[]> {
    return this.projectRepository.findRecent(limit);
  }
}