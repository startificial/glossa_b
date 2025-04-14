/**
 * PostgreSQL Requirement Repository Implementation
 * 
 * Implements the requirement repository interface using PostgreSQL and Drizzle ORM.
 */
import { IRequirementRepository } from '../requirement-repository';
import { Requirement, InsertRequirement, requirements } from '@shared/schema';
import { db } from '../../db';
import { and, desc, eq, like } from 'drizzle-orm';

export class PostgresRequirementRepository implements IRequirementRepository {
  /**
   * Find a requirement by its ID
   */
  async findById(id: number): Promise<Requirement | undefined> {
    try {
      const result = await db.select().from(requirements).where(eq(requirements.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error fetching requirement by ID:', error);
      return undefined;
    }
  }
  
  /**
   * Find all requirements
   */
  async findAll(limit?: number): Promise<Requirement[]> {
    try {
      let query = db.select().from(requirements).orderBy(desc(requirements.updatedAt));
      
      if (limit) {
        query = query.limit(limit);
      }
      
      return await query;
    } catch (error) {
      console.error('Error fetching all requirements:', error);
      return [];
    }
  }
  
  /**
   * Create a new requirement
   */
  async create(data: InsertRequirement): Promise<Requirement> {
    try {
      const result = await db.insert(requirements).values(data).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating requirement:', error);
      throw new Error(`Failed to create requirement: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Update an existing requirement
   */
  async update(id: number, data: Partial<InsertRequirement>): Promise<Requirement | undefined> {
    try {
      const result = await db.update(requirements)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(requirements.id, id))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error('Error updating requirement:', error);
      return undefined;
    }
  }
  
  /**
   * Delete a requirement by ID
   */
  async delete(id: number): Promise<boolean> {
    try {
      const result = await db.delete(requirements).where(eq(requirements.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting requirement:', error);
      return false;
    }
  }
  
  /**
   * Find requirements by project ID
   */
  async findByProject(projectId: number): Promise<Requirement[]> {
    try {
      return await db.select()
        .from(requirements)
        .where(eq(requirements.projectId, projectId))
        .orderBy(desc(requirements.updatedAt));
    } catch (error) {
      console.error('Error fetching requirements by project:', error);
      return [];
    }
  }
  
  /**
   * Find requirements associated with a specific input data ID
   */
  async findByInputData(inputDataId: number): Promise<Requirement[]> {
    try {
      return await db.select()
        .from(requirements)
        .where(eq(requirements.inputDataId, inputDataId))
        .orderBy(desc(requirements.updatedAt));
    } catch (error) {
      console.error('Error fetching requirements by input data:', error);
      return [];
    }
  }
  
  /**
   * Get high priority requirements for a project
   */
  async findHighPriority(projectId: number, limit?: number): Promise<Requirement[]> {
    try {
      let query = db.select()
        .from(requirements)
        .where(and(
          eq(requirements.projectId, projectId),
          eq(requirements.priority, 'high')
        ))
        .orderBy(desc(requirements.updatedAt));
      
      if (limit) {
        query = query.limit(limit);
      }
      
      return await query;
    } catch (error) {
      console.error('Error fetching high priority requirements:', error);
      return [];
    }
  }
  
  /**
   * Find requirements by category
   */
  async findByCategory(projectId: number, category: string): Promise<Requirement[]> {
    try {
      return await db.select()
        .from(requirements)
        .where(and(
          eq(requirements.projectId, projectId),
          eq(requirements.category, category)
        ))
        .orderBy(desc(requirements.updatedAt));
    } catch (error) {
      console.error('Error fetching requirements by category:', error);
      return [];
    }
  }
  
  /**
   * Check if a requirement exists by title
   */
  async existsByTitle(projectId: number, title: string): Promise<boolean> {
    try {
      const result = await db.select({ count: db.fn.count() })
        .from(requirements)
        .where(and(
          eq(requirements.projectId, projectId),
          like(requirements.title, title)
        ));
      
      return Number(result[0].count) > 0;
    } catch (error) {
      console.error('Error checking if requirement exists by title:', error);
      return false;
    }
  }
  
  /**
   * Invalidate cache for a requirement (optional method implementation)
   */
  invalidateCache(id: number): void {
    // No caching implemented yet
    // This would be implemented when we add caching layer
    console.log(`Cache invalidation requested for requirement ${id}`);
  }
}