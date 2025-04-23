/**
 * PostgreSQL Project Repository Implementation
 * 
 * Implements the project repository interface using PostgreSQL and Drizzle ORM.
 */
import { IProjectRepository } from '../project-repository';
import { Project, InsertProject, projects } from '@shared/schema';
import { db } from '../../db';
import { and, desc, eq, or, like } from 'drizzle-orm';

export class PostgresProjectRepository implements IProjectRepository {
  /**
   * Find a project by its ID
   */
  async findById(id: number): Promise<Project | undefined> {
    try {
      const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error fetching project by ID:', error);
      return undefined;
    }
  }
  
  /**
   * Find all projects
   */
  async findAll(limit?: number): Promise<Project[]> {
    try {
      let query = db.select().from(projects).orderBy(desc(projects.updatedAt));
      
      if (limit) {
        query = query.limit(limit);
      }
      
      return await query;
    } catch (error) {
      console.error('Error fetching all projects:', error);
      return [];
    }
  }
  
  /**
   * Create a new project
   */
  async create(data: InsertProject): Promise<Project> {
    try {
      const result = await db.insert(projects).values(data).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating project:', error);
      throw new Error(`Failed to create project: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Update an existing project
   */
  async update(id: number, data: Partial<InsertProject>): Promise<Project | undefined> {
    try {
      const result = await db.update(projects)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(projects.id, id))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error('Error updating project:', error);
      return undefined;
    }
  }
  
  /**
   * Delete a project by ID
   */
  async delete(id: number): Promise<boolean> {
    try {
      const result = await db.delete(projects).where(eq(projects.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting project:', error);
      return false;
    }
  }
  
  /**
   * Find projects by user ID
   */
  async findByUser(userId: number): Promise<Project[]> {
    try {
      return await db.select()
        .from(projects)
        .where(eq(projects.userId, userId))
        .orderBy(desc(projects.updatedAt));
    } catch (error) {
      console.error('Error fetching projects by user:', error);
      return [];
    }
  }

  /**
   * Find projects by user ID (alias for findByUser to match ProjectRepository interface)
   */
  async findByUserId(userId: number): Promise<Project[]> {
    return this.findByUser(userId);
  }
  
  /**
   * Find projects by customer ID
   */
  async findByCustomer(customerId: number): Promise<Project[]> {
    try {
      return await db.select()
        .from(projects)
        .where(eq(projects.customerId, customerId))
        .orderBy(desc(projects.updatedAt));
    } catch (error) {
      console.error('Error fetching projects by customer:', error);
      return [];
    }
  }
  
  /**
   * Find projects by type
   */
  async findByType(type: string): Promise<Project[]> {
    try {
      return await db.select()
        .from(projects)
        .where(eq(projects.type, type))
        .orderBy(desc(projects.updatedAt));
    } catch (error) {
      console.error('Error fetching projects by type:', error);
      return [];
    }
  }
  
  /**
   * Search projects by name or description
   */
  async search(query: string): Promise<Project[]> {
    try {
      return await db.select()
        .from(projects)
        .where(
          or(
            like(projects.name, `%${query}%`),
            like(projects.description || '', `%${query}%`) // Handle null description values
          )
        )
        .orderBy(desc(projects.updatedAt));
    } catch (error) {
      console.error('Error searching projects:', error);
      return [];
    }
  }
  
  /**
   * Get recently updated projects
   */
  async findRecent(limit: number = 10): Promise<Project[]> {
    try {
      return await db.select()
        .from(projects)
        .orderBy(desc(projects.updatedAt))
        .limit(limit);
    } catch (error) {
      console.error('Error fetching recent projects:', error);
      return [];
    }
  }
}