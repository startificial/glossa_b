/**
 * PostgreSQL Task Repository Implementation
 * 
 * This implements the TaskRepository interface using PostgreSQL.
 * Includes performance optimizations like caching and efficient querying.
 */
import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../../database';
import { implementationTasks, requirements } from '../../../shared/schema';
import { TaskRepository } from '../base-repository';
import { cacheService, CACHE_KEYS } from '../../services/cache-service';
import { ImplementationTask, InsertImplementationTask } from '../../../shared/schema';
import { ApiError } from '../../error/api-error';
import { ExtendedImplementationTask } from '../../extended-types';

/**
 * PostgreSQL implementation of the TaskRepository interface
 */
export class PostgresTaskRepository implements TaskRepository {
  /**
   * Find a task by ID with optimized querying and caching
   */
  async findById(id: number): Promise<ExtendedImplementationTask | undefined> {
    // Check cache first
    const cacheKey = `task:${id}`;
    const cachedTask = cacheService.get<ExtendedImplementationTask>(cacheKey);
    if (cachedTask) return cachedTask;
    
    try {
      // Single optimized query to get task and related requirement
      const result = await db.select({
        task: implementationTasks,
        projectId: requirements.projectId,
      })
      .from(implementationTasks)
      .leftJoin(requirements, eq(implementationTasks.requirementId, requirements.id))
      .where(eq(implementationTasks.id, id))
      .limit(1);
      
      if (result.length === 0) return undefined;
      
      // Create the extended task with project ID
      const extendedTask: ExtendedImplementationTask = {
        ...result[0].task,
        projectId: result[0].projectId
      };
      
      // Cache the result
      cacheService.set(cacheKey, extendedTask);
      
      return extendedTask;
    } catch (error) {
      throw new ApiError('Database error', 500, `Error finding task by ID: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Find all tasks with pagination and optional limit
   */
  async findAll(limit?: number): Promise<ExtendedImplementationTask[]> {
    // Add cache with short TTL (1 minute) since task updates are frequent
    const cacheKey = `tasks:all:${limit || 'all'}`;
    
    return cacheService.getOrSet(cacheKey, async () => {
      try {
        // Optimized query joining with requirements to get project IDs
        let query = db.select({
          task: implementationTasks,
          projectId: requirements.projectId,
        })
        .from(implementationTasks)
        .leftJoin(requirements, eq(implementationTasks.requirementId, requirements.id))
        .orderBy(desc(implementationTasks.updatedAt));
        
        if (limit) {
          query = query.limit(limit);
        }
        
        const result = await query;
        
        // Map to extended tasks
        return result.map(row => ({
          ...row.task,
          projectId: row.projectId
        }));
      } catch (error) {
        throw new ApiError('Database error', 500, `Error finding all tasks: ${error instanceof Error ? error.message : String(error)}`);
      }
    }, 60 * 1000); // 1 minute TTL
  }
  
  /**
   * Create a new task
   */
  async create(data: InsertImplementationTask): Promise<ExtendedImplementationTask> {
    try {
      // Insert the task
      const [newTask] = await db.insert(implementationTasks)
        .values(data)
        .returning();
      
      if (!newTask) {
        throw new ApiError('Database error', 500, 'Failed to create task');
      }
      
      // Get the project ID for the extended task
      const requirementResult = await db.select({ projectId: requirements.projectId })
        .from(requirements)
        .where(eq(requirements.id, data.requirementId))
        .limit(1);
      
      const extendedTask: ExtendedImplementationTask = {
        ...newTask,
        projectId: requirementResult[0]?.projectId
      };
      
      // Invalidate relevant caches
      cacheService.invalidatePattern(`tasks:requirement:${data.requirementId}`);
      cacheService.invalidatePattern('tasks:all');
      if (requirementResult[0]?.projectId) {
        cacheService.invalidatePattern(`tasks:project:${requirementResult[0].projectId}`);
      }
      
      return extendedTask;
    } catch (error) {
      throw new ApiError('Database error', 500, `Error creating task: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Update an existing task
   */
  async update(id: number, data: Partial<InsertImplementationTask>): Promise<ExtendedImplementationTask | undefined> {
    try {
      // First find the current task to get requirement ID
      const currentTask = await this.findById(id);
      if (!currentTask) {
        return undefined;
      }
      
      // Update the task
      const [updatedTask] = await db.update(implementationTasks)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(implementationTasks.id, id))
        .returning();
      
      if (!updatedTask) {
        return undefined;
      }
      
      // Create extended task with project ID
      const extendedTask: ExtendedImplementationTask = {
        ...updatedTask,
        projectId: currentTask.projectId
      };
      
      // Invalidate relevant caches
      cacheService.delete(`task:${id}`);
      cacheService.invalidatePattern(`tasks:requirement:${currentTask.requirementId}`);
      cacheService.invalidatePattern('tasks:all');
      if (currentTask.projectId) {
        cacheService.invalidatePattern(`tasks:project:${currentTask.projectId}`);
      }
      
      return extendedTask;
    } catch (error) {
      throw new ApiError('Database error', 500, `Error updating task: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Delete a task by ID
   */
  async delete(id: number): Promise<boolean> {
    try {
      // First find the current task to get requirement ID for cache invalidation
      const currentTask = await this.findById(id);
      if (!currentTask) {
        return false;
      }
      
      // Delete the task
      const result = await db.delete(implementationTasks)
        .where(eq(implementationTasks.id, id))
        .returning({ id: implementationTasks.id });
      
      const success = result.length > 0;
      
      if (success) {
        // Invalidate relevant caches
        cacheService.delete(`task:${id}`);
        cacheService.invalidatePattern(`tasks:requirement:${currentTask.requirementId}`);
        cacheService.invalidatePattern('tasks:all');
        if (currentTask.projectId) {
          cacheService.invalidatePattern(`tasks:project:${currentTask.projectId}`);
        }
      }
      
      return success;
    } catch (error) {
      throw new ApiError('Database error', 500, `Error deleting task: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Find tasks by requirement ID
   */
  async findByRequirement(requirementId: number): Promise<ExtendedImplementationTask[]> {
    const cacheKey = `tasks:requirement:${requirementId}`;
    
    return cacheService.getOrSet(cacheKey, async () => {
      try {
        // Get the project ID for the requirement first (used for the extended task)
        const requirementResult = await db.select({ projectId: requirements.projectId })
          .from(requirements)
          .where(eq(requirements.id, requirementId))
          .limit(1);
        
        const projectId = requirementResult[0]?.projectId;
        
        // Get tasks for the requirement
        const tasks = await db.select()
          .from(implementationTasks)
          .where(eq(implementationTasks.requirementId, requirementId))
          .orderBy(desc(implementationTasks.updatedAt));
        
        // Add project ID to each task
        return tasks.map(task => ({
          ...task,
          projectId
        }));
      } catch (error) {
        throw new ApiError('Database error', 500, `Error finding tasks by requirement: ${error instanceof Error ? error.message : String(error)}`);
      }
    }, 5 * 60 * 1000); // 5 minute cache
  }
  
  /**
   * Find tasks by project ID - with efficient single query
   */
  async findByProject(projectId: number): Promise<ExtendedImplementationTask[]> {
    const cacheKey = `tasks:project:${projectId}`;
    
    return cacheService.getOrSet(cacheKey, async () => {
      try {
        // Single efficient query to get all tasks for a project
        const result = await db.select({
          task: implementationTasks,
        })
        .from(implementationTasks)
        .innerJoin(
          requirements,
          eq(implementationTasks.requirementId, requirements.id)
        )
        .where(eq(requirements.projectId, projectId))
        .orderBy(desc(implementationTasks.updatedAt));
        
        // Map results to extended tasks
        return result.map(row => ({
          ...row.task,
          projectId
        }));
      } catch (error) {
        throw new ApiError('Database error', 500, `Error finding tasks by project: ${error instanceof Error ? error.message : String(error)}`);
      }
    }, 5 * 60 * 1000); // 5 minute cache
  }
  
  /**
   * Find high priority tasks across the system
   */
  async findHighPriorityTasks(limit?: number): Promise<ExtendedImplementationTask[]> {
    const cacheKey = `tasks:high-priority:${limit || 'all'}`;
    
    return cacheService.getOrSet(cacheKey, async () => {
      try {
        let query = db.select({
          task: implementationTasks,
          projectId: requirements.projectId,
        })
        .from(implementationTasks)
        .innerJoin(
          requirements,
          eq(implementationTasks.requirementId, requirements.id)
        )
        .where(eq(implementationTasks.priority, 'high'))
        .orderBy(desc(implementationTasks.updatedAt));
        
        if (limit) {
          query = query.limit(limit);
        }
        
        const result = await query;
        
        // Map results to extended tasks
        return result.map(row => ({
          ...row.task,
          projectId: row.projectId
        }));
      } catch (error) {
        throw new ApiError('Database error', 500, `Error finding high priority tasks: ${error instanceof Error ? error.message : String(error)}`);
      }
    }, 5 * 60 * 1000); // 5 minute cache
  }
}