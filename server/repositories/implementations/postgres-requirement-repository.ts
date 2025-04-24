/**
 * PostgreSQL Requirement Repository Implementation
 * 
 * This file contains the PostgreSQL implementation of the IRequirementRepository interface.
 * It extends the base PostgreSQL repository and adds requirement-specific functionality.
 */
import { eq, and, desc, count } from 'drizzle-orm';
import { type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { requirements, type Requirement, type InsertRequirement } from '@shared/schema';
import { IRequirementRepository } from '../interfaces/requirement-repository';
import { BasePostgresRepository } from './base-postgres-repository';

/**
 * PostgreSQL implementation of IRequirementRepository
 * 
 * Extends the base PostgreSQL repository and implements requirement-specific methods.
 */
export class PostgresRequirementRepository
  extends BasePostgresRepository<Requirement, number, InsertRequirement>
  implements IRequirementRepository {
  
  /**
   * Creates a new PostgresRequirementRepository
   * 
   * @param db - The Drizzle database instance
   */
  constructor(db: PostgresJsDatabase<any>) {
    super(db, requirements, requirements.id, 'Requirement');
  }

  /**
   * Find requirements by project ID
   * 
   * @param projectId - The ID of the project
   * @returns Array of requirements in the project
   */
  async findByProjectId(projectId: number): Promise<Requirement[]> {
    try {
      const result = await this.db.select()
        .from(requirements)
        .where(eq(requirements.projectId, projectId))
        .orderBy(requirements.createdAt);
      
      return result;
    } catch (error) {
      this.handleError('findByProjectId', error);
      return [];
    }
  }
  
  /**
   * Find high priority requirements for a project
   * 
   * @param projectId - The ID of the project
   * @param limit - Optional maximum number of requirements to return
   * @returns Array of high priority requirements
   */
  async findHighPriority(projectId: number, limit?: number): Promise<Requirement[]> {
    try {
      const query = this.db.select()
        .from(requirements)
        .where(
          and(
            eq(requirements.projectId, projectId),
            eq(requirements.priority, 'high')
          )
        )
        .orderBy(desc(requirements.updatedAt));
      
      if (limit) {
        query.limit(limit);
      }
      
      const result = await query;
      return result;
    } catch (error) {
      this.handleError('findHighPriority', error);
      return [];
    }
  }
  
  /**
   * Find requirements by input data ID
   * 
   * @param inputDataId - The ID of the input data
   * @returns Array of requirements associated with the input data
   */
  async findByInputDataId(inputDataId: number): Promise<Requirement[]> {
    try {
      const result = await this.db.select()
        .from(requirements)
        .where(eq(requirements.inputDataId, inputDataId))
        .orderBy(requirements.createdAt);
      
      return result;
    } catch (error) {
      this.handleError('findByInputDataId', error);
      return [];
    }
  }
  
  /**
   * Verify that a requirement belongs to a project
   * 
   * @param requirementId - The ID of the requirement
   * @param projectId - The ID of the project
   * @returns The requirement if it belongs to the project, null otherwise
   */
  async verifyProjectRequirement(requirementId: number, projectId: number): Promise<Requirement | null> {
    try {
      const [result] = await this.db.select()
        .from(requirements)
        .where(
          and(
            eq(requirements.id, requirementId),
            eq(requirements.projectId, projectId)
          )
        )
        .limit(1);
      
      return result || null;
    } catch (error) {
      this.handleError('verifyProjectRequirement', error);
      return null;
    }
  }
  
  /**
   * Override create method to add timestamp
   * 
   * @param data - The requirement data to insert
   * @returns The created requirement
   */
  async create(data: InsertRequirement): Promise<Requirement> {
    try {
      const now = new Date();
      const [result] = await this.db.insert(requirements)
        .values({
          ...data,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      
      return result;
    } catch (error) {
      this.handleError('create', error);
      throw new Error('Failed to create requirement');
    }
  }
  
  /**
   * Override update method to update timestamp
   * 
   * @param id - The ID of the requirement to update
   * @param data - The requirement data to update
   * @returns The updated requirement if found, null otherwise
   */
  async update(id: number, data: Partial<InsertRequirement>): Promise<Requirement | null> {
    try {
      const [updatedRequirement] = await this.db.update(requirements)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(requirements.id, id))
        .returning();
      
      return updatedRequirement || null;
    } catch (error) {
      this.handleError('update', error);
      return null;
    }
  }
}