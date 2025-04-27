/**
 * Base PostgreSQL Repository Implementation
 * 
 * This abstract class provides a base implementation for PostgreSQL repositories.
 * It includes common functionality that all PostgreSQL repositories can inherit.
 */
import type { PgTable } from 'drizzle-orm/pg-core';
import { eq } from 'drizzle-orm';
import { type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { IBaseRepository } from '../interfaces/base-repository';

/**
 * Abstract base PostgreSQL repository
 * 
 * Provides common functionality for PostgreSQL repositories.
 * 
 * @template T - The entity type this repository manages
 * @template ID - The type of the entity's ID field (typically number or string)
 * @template CreateDTO - The data transfer object type for creating entities
 * @template UpdateDTO - The data transfer object type for updating entities
 * @template TableType - The Drizzle table type
 */
export abstract class BasePostgresRepository<
  T,
  ID extends number | string,
  CreateDTO,
  UpdateDTO = Partial<CreateDTO>,
  TableType extends PgTable = PgTable
> implements IBaseRepository<T, ID, CreateDTO, UpdateDTO> {
  
  /**
   * Creates a new BasePostgresRepository
   * 
   * @param db - The Drizzle database instance
   * @param table - The Drizzle table for this entity
   * @param idColumn - The column representing the entity's ID
   * @param entityName - The name of the entity (for error messages)
   */
  constructor(
    protected readonly db: PostgresJsDatabase<any>,
    protected readonly table: TableType,
    protected readonly idColumn: any, // Using any due to Drizzle's typing complexity
    protected readonly entityName: string
  ) {}

  /**
   * Find an entity by its ID
   * 
   * @param id - The unique identifier of the entity
   * @returns The entity if found, null otherwise
   */
  async findById(id: ID): Promise<T | null> {
    try {
      const result = await this.db.select()
        .from(this.table)
        .where(eq(this.idColumn, id as any))
        .limit(1);
      
      return result[0] as T || null;
    } catch (error) {
      this.handleError('findById', error);
      return null;
    }
  }
  
  /**
   * Find all entities, optionally limited
   * 
   * @param limit - Optional maximum number of entities to return
   * @returns Array of entities
   */
  async findAll(limit?: number): Promise<T[]> {
    try {
      const query = this.db.select().from(this.table);
      
      if (limit) {
        query.limit(limit);
      }
      
      const result = await query;
      return result as T[];
    } catch (error) {
      this.handleError('findAll', error);
      return [];
    }
  }
  
  /**
   * Create a new entity
   * 
   * @param data - The data to create the entity with
   * @returns The created entity
   * @throws Error if entity creation fails
   */
  async create(data: CreateDTO): Promise<T> {
    try {
      const [result] = await this.db.insert(this.table)
        .values(data as any)
        .returning();
      
      return result as T;
    } catch (error) {
      this.handleError('create', error);
      throw new Error(`Failed to create ${this.entityName}`);
    }
  }
  
  /**
   * Update an existing entity
   * 
   * @param id - The ID of the entity to update
   * @param data - The data to update the entity with
   * @returns The updated entity if found and updated, null otherwise
   */
  async update(id: ID, data: UpdateDTO): Promise<T | null> {
    try {
      const [result] = await this.db.update(this.table)
        .set(data as any)
        .where(eq(this.idColumn, id as any))
        .returning();
      
      return result as T || null;
    } catch (error) {
      this.handleError('update', error);
      return null;
    }
  }
  
  /**
   * Delete an entity
   * 
   * @param id - The ID of the entity to delete
   * @returns True if entity was deleted, false otherwise
   */
  async delete(id: ID): Promise<boolean> {
    try {
      const result = await this.db.delete(this.table)
        .where(eq(this.idColumn, id as any))
        .returning({ id: this.idColumn });
      
      return result.length > 0;
    } catch (error) {
      this.handleError('delete', error);
      return false;
    }
  }
  
  /**
   * Handle database errors consistently
   * 
   * @param operation - The name of the operation that failed
   * @param error - The error that occurred
   */
  protected handleError(operation: string, error: unknown): void {
    // Log the error with context about which operation failed
    console.error(`${this.entityName}Repository.${operation} error:`, error);
    
    // In a production system, you might want to:
    // 1. Log to a proper logging service
    // 2. Capture detailed diagnostics
    // 3. Categorize errors (e.g., db connection vs. constraint violation)
    // 4. Alert on critical failures
  }
}