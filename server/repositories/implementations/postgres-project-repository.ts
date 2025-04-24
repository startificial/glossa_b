/**
 * PostgreSQL Project Repository Implementation
 * 
 * This file contains the PostgreSQL implementation of the IProjectRepository interface.
 * It extends the base PostgreSQL repository and adds project-specific functionality.
 */
import { eq, and, like, or, count, sql } from 'drizzle-orm';
import { type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { projects, users, requirements, implementationTasks, inputData, type Project, type InsertProject } from '@shared/schema';
import { IProjectRepository } from '../interfaces/project-repository';
import { BasePostgresRepository } from './base-postgres-repository';

/**
 * PostgreSQL implementation of IProjectRepository
 * 
 * Extends the base PostgreSQL repository and implements project-specific methods.
 */
export class PostgresProjectRepository 
  extends BasePostgresRepository<Project, number, InsertProject>
  implements IProjectRepository {
  
  /**
   * Creates a new PostgresProjectRepository
   * 
   * @param db - The Drizzle database instance
   */
  constructor(db: PostgresJsDatabase<any>) {
    super(db, projects, projects.id, 'Project');
  }

  /**
   * Find projects by user ID
   * 
   * @param userId - The ID of the user who owns the projects
   * @returns Array of projects belonging to the user
   */
  async findByUserId(userId: number): Promise<Project[]> {
    try {
      const result = await this.db.select()
        .from(projects)
        .where(eq(projects.userId, userId))
        .orderBy(projects.updatedAt);
      
      return result;
    } catch (error) {
      this.handleError('findByUserId', error);
      return [];
    }
  }

  /**
   * Find projects by customer ID
   * 
   * @param customerId - The ID of the customer associated with the projects
   * @returns Array of projects for the customer
   */
  async findByCustomerId(customerId: number): Promise<Project[]> {
    try {
      const result = await this.db.select()
        .from(projects)
        .where(eq(projects.customerId, customerId))
        .orderBy(projects.updatedAt);
      
      return result;
    } catch (error) {
      this.handleError('findByCustomerId', error);
      return [];
    }
  }
  
  /**
   * Search projects by name or description
   * 
   * @param query - The search query string
   * @param userId - Optional user ID to limit the search to a specific user's projects
   * @param limit - Optional maximum number of results
   * @returns Array of matching projects
   */
  async search(query: string, userId?: number, limit?: number): Promise<Project[]> {
    try {
      // Build the search condition
      let searchCondition = or(
        like(projects.name, `%${query}%`),
        like(projects.description || '', `%${query}%`),
        like(projects.sourceSystem || '', `%${query}%`),
        like(projects.targetSystem || '', `%${query}%`)
      );
      
      // If userId is provided, add it to the condition
      if (userId) {
        searchCondition = and(
          searchCondition,
          eq(projects.userId, userId)
        );
      }
      
      // Build the query
      const selectQuery = this.db.select()
        .from(projects)
        .where(searchCondition)
        .orderBy(projects.updatedAt);
      
      // Add limit if provided
      if (limit) {
        selectQuery.limit(limit);
      }
      
      const result = await selectQuery;
      return result;
    } catch (error) {
      this.handleError('search', error);
      return [];
    }
  }
  
  /**
   * Find projects by stage
   * 
   * @param stage - The project stage to filter by
   * @param userId - Optional user ID to limit the search to a specific user's projects
   * @returns Array of projects in the specified stage
   */
  async findByStage(stage: string, userId?: number): Promise<Project[]> {
    try {
      // Build the condition
      let condition = eq(projects.stage, stage);
      
      // If userId is provided, add it to the condition
      if (userId) {
        condition = and(
          condition,
          eq(projects.userId, userId)
        );
      }
      
      const result = await this.db.select()
        .from(projects)
        .where(condition)
        .orderBy(projects.updatedAt);
      
      return result;
    } catch (error) {
      this.handleError('findByStage', error);
      return [];
    }
  }
  
  /**
   * Get project statistics
   * 
   * @param projectId - The ID of the project
   * @returns Statistics about the project
   */
  async getStatistics(projectId: number): Promise<{
    requirementsCount: number;
    tasksCount: number;
    completedTasksCount: number;
    inputDataCount: number;
  }> {
    try {
      // Get requirements count
      const [requirementsResult] = await this.db
        .select({ count: count() })
        .from(requirements)
        .where(eq(requirements.projectId, projectId));
      
      // Get tasks count
      const [tasksResult] = await this.db
        .select({ count: count() })
        .from(implementationTasks)
        .rightJoin(requirements, eq(implementationTasks.requirementId, requirements.id))
        .where(eq(requirements.projectId, projectId));
      
      // Get completed tasks count
      const [completedTasksResult] = await this.db
        .select({ count: count() })
        .from(implementationTasks)
        .rightJoin(requirements, eq(implementationTasks.requirementId, requirements.id))
        .where(
          and(
            eq(requirements.projectId, projectId),
            eq(implementationTasks.status, 'completed')
          )
        );
      
      // Get input data count
      const [inputDataResult] = await this.db
        .select({ count: count() })
        .from(inputData)
        .where(eq(inputData.projectId, projectId));
      
      return {
        requirementsCount: requirementsResult?.count || 0,
        tasksCount: tasksResult?.count || 0,
        completedTasksCount: completedTasksResult?.count || 0,
        inputDataCount: inputDataResult?.count || 0,
      };
    } catch (error) {
      this.handleError('getStatistics', error);
      return {
        requirementsCount: 0,
        tasksCount: 0,
        completedTasksCount: 0,
        inputDataCount: 0,
      };
    }
  }
  
  /**
   * Override create method to add project creation timestamp
   * 
   * @param data - The project data to insert
   * @returns The created project
   */
  async create(data: InsertProject): Promise<Project> {
    try {
      const now = new Date();
      const [newProject] = await this.db.insert(projects)
        .values({
          ...data,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      
      return newProject;
    } catch (error) {
      this.handleError('create', error);
      throw new Error('Failed to create project');
    }
  }
  
  /**
   * Override update method to update the updatedAt timestamp
   * 
   * @param id - The ID of the project to update
   * @param data - The project data to update
   * @returns The updated project if found, null otherwise
   */
  async update(id: number, data: Partial<InsertProject>): Promise<Project | null> {
    try {
      const [updatedProject] = await this.db.update(projects)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, id))
        .returning();
      
      return updatedProject || null;
    } catch (error) {
      this.handleError('update', error);
      return null;
    }
  }
}