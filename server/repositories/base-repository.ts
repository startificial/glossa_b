/**
 * Base Repository Interface
 * 
 * Defines the common operations that all repositories should implement.
 * This provides a consistent pattern for data access across the application.
 */

/**
 * Generic base repository interface
 * 
 * @template T - The entity type returned by the repository
 * @template CreateT - The type used for creating entities
 * @template UpdateT - The type used for updating entities
 * @template IdT - The type of the entity's ID field
 */
export interface IBaseRepository<T, CreateT, UpdateT, IdT = number> {
  /**
   * Find an entity by its ID
   */
  findById(id: IdT): Promise<T | undefined>;
  
  /**
   * Get all entities
   * @param limit Optional limit on the number of results
   */
  findAll(limit?: number): Promise<T[]>;
  
  /**
   * Create a new entity
   */
  create(data: CreateT): Promise<T>;
  
  /**
   * Update an existing entity
   */
  update(id: IdT, data: UpdateT): Promise<T | undefined>;
  
  /**
   * Delete an entity by ID
   */
  delete(id: IdT): Promise<boolean>;
}