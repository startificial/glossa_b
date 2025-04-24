/**
 * Base Repository Interface
 * 
 * This file defines the generic base repository interface that all entity-specific
 * repositories will extend. It provides the common CRUD operations that should be
 * available for every entity type.
 */

/**
 * Generic base repository interface
 * 
 * Defines the standard CRUD operations that all repositories should implement.
 * 
 * @template T - The entity type this repository manages
 * @template ID - The type of the entity's ID field (typically number or string)
 * @template CreateDTO - The data transfer object type for creating entities
 * @template UpdateDTO - The data transfer object type for updating entities
 */
export interface IBaseRepository<T, ID, CreateDTO, UpdateDTO = Partial<CreateDTO>> {
  /**
   * Find an entity by its ID
   * 
   * @param id - The unique identifier of the entity
   * @returns The entity if found, null otherwise
   */
  findById(id: ID): Promise<T | null>;
  
  /**
   * Find all entities, optionally limited
   * 
   * @param limit - Optional maximum number of entities to return
   * @returns Array of entities
   */
  findAll(limit?: number): Promise<T[]>;
  
  /**
   * Create a new entity
   * 
   * @param data - The data to create the entity with
   * @returns The created entity
   * @throws Error if entity creation fails
   */
  create(data: CreateDTO): Promise<T>;
  
  /**
   * Update an existing entity
   * 
   * @param id - The ID of the entity to update
   * @param data - The data to update the entity with
   * @returns The updated entity if found and updated, null otherwise
   */
  update(id: ID, data: UpdateDTO): Promise<T | null>;
  
  /**
   * Delete an entity
   * 
   * @param id - The ID of the entity to delete
   * @returns True if entity was deleted, false otherwise
   */
  delete(id: ID): Promise<boolean>;
}