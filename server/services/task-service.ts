/**
 * Task Service
 * 
 * This service provides optimized methods for working with implementation tasks.
 * It focuses on performance through batching, caching, and optimized queries.
 */
import { db } from '../db';
import { eq, and, inArray, desc, asc } from 'drizzle-orm';
import { implementationTasks, requirements, projects } from '@shared/schema';
import { ImplementationTask } from '@shared/schema';
import { ExtendedImplementationTask } from '../extended-types';
import { cacheService } from './cache-service';

// Cache keys
export const TASK_CACHE_KEYS = {
  TASK_BY_ID: (id: number) => `task:${id}`,
  TASKS_BY_REQUIREMENT: (requirementId: number) => `tasks:requirement:${requirementId}`,
  TASKS_BY_PROJECT: (projectId: number) => `tasks:project:${projectId}`,
};

/**
 * Cache TTL values (in milliseconds)
 */
const CACHE_TTL = {
  SHORT: 60 * 1000,             // 1 minute
  MEDIUM: 5 * 60 * 1000,        // 5 minutes
  LONG: 30 * 60 * 1000,         // 30 minutes
};

/**
 * Get a single task by ID with caching
 * @param taskId Task ID
 * @returns Task with project ID if found
 */
export async function getTaskById(taskId: number): Promise<ExtendedImplementationTask | undefined> {
  const cacheKey = TASK_CACHE_KEYS.TASK_BY_ID(taskId);
  
  return cacheService.getOrSet(cacheKey, async () => {
    try {
      // Single optimized query that joins tasks with requirements to get projectId
      const result = await db.select({
        task: implementationTasks,
        projectId: requirements.projectId,
      })
      .from(implementationTasks)
      .leftJoin(requirements, eq(implementationTasks.requirementId, requirements.id))
      .where(eq(implementationTasks.id, taskId))
      .limit(1);
      
      if (result.length === 0) return undefined;
      
      // Create extended task with project ID
      const extendedTask: ExtendedImplementationTask = {
        ...result[0].task,
        projectId: result[0].projectId
      };
      
      return extendedTask;
    } catch (error) {
      console.error('Error in getTaskById:', error);
      return undefined;
    }
  }, CACHE_TTL.MEDIUM);
}

/**
 * Get all tasks for a requirement with optimized query and caching
 * @param requirementId Requirement ID
 * @returns Array of tasks with project IDs
 */
export async function getTasksByRequirementId(requirementId: number): Promise<ExtendedImplementationTask[]> {
  const cacheKey = TASK_CACHE_KEYS.TASKS_BY_REQUIREMENT(requirementId);
  
  return cacheService.getOrSet(cacheKey, async () => {
    try {
      // First, get the project ID for the requirement in a single query
      const reqResult = await db.select({
        id: requirements.id,
        projectId: requirements.projectId
      })
      .from(requirements)
      .where(eq(requirements.id, requirementId))
      .limit(1);
      
      if (reqResult.length === 0) {
        return [];
      }
      
      const projectId = reqResult[0].projectId;
      
      // Then get all tasks for this requirement
      const tasksResult = await db.select()
        .from(implementationTasks)
        .where(eq(implementationTasks.requirementId, requirementId))
        .orderBy(asc(implementationTasks.id));
      
      // Add project ID to all tasks
      return tasksResult.map(task => ({
        ...task,
        projectId
      }));
    } catch (error) {
      console.error('Error in getTasksByRequirementId:', error);
      return [];
    }
  }, CACHE_TTL.MEDIUM);
}

/**
 * Get all tasks for a project with batch loading and caching
 * @param projectId Project ID
 * @returns Array of tasks with extended information
 */
export async function getTasksByProjectId(projectId: number): Promise<ExtendedImplementationTask[]> {
  const cacheKey = TASK_CACHE_KEYS.TASKS_BY_PROJECT(projectId);
  
  return cacheService.getOrSet(cacheKey, async () => {
    try {
      // Get all requirements for this project in a single query
      const requirementsResult = await db.select({
        id: requirements.id,
        title: requirements.title,
        category: requirements.category
      })
      .from(requirements)
      .where(eq(requirements.projectId, projectId));
      
      if (requirementsResult.length === 0) {
        return [];
      }
      
      const requirementIds = requirementsResult.map(req => req.id);
      const requirementMap = new Map();
      
      // Create a map of requirement details for quick lookup
      requirementsResult.forEach(req => {
        requirementMap.set(req.id, {
          id: req.id,
          title: req.title,
          category: req.category
        });
      });
      
      // Get all tasks for all requirements in a single query
      const tasksResult = await db.select()
        .from(implementationTasks)
        .where(inArray(implementationTasks.requirementId, requirementIds))
        .orderBy(desc(implementationTasks.updatedAt));
      
      // Add project ID and requirement details to all tasks
      return tasksResult.map(task => ({
        ...task,
        projectId,
        requirement: requirementMap.get(task.requirementId) || null
      }));
    } catch (error) {
      console.error('Error in getTasksByProjectId:', error);
      return [];
    }
  }, CACHE_TTL.MEDIUM);
}

/**
 * Invalidate task caches when a task is created, updated, or deleted
 * @param taskId Optional task ID
 * @param requirementId Optional requirement ID
 * @param projectId Optional project ID
 */
export function invalidateTaskCaches(taskId?: number, requirementId?: number, projectId?: number): void {
  if (taskId) {
    cacheService.delete(TASK_CACHE_KEYS.TASK_BY_ID(taskId));
  }
  
  if (requirementId) {
    cacheService.delete(TASK_CACHE_KEYS.TASKS_BY_REQUIREMENT(requirementId));
  }
  
  if (projectId) {
    cacheService.delete(TASK_CACHE_KEYS.TASKS_BY_PROJECT(projectId));
  }
  
  // If we don't have specific IDs, clear all task-related caches
  if (!taskId && !requirementId && !projectId) {
    cacheService.clear('task:');
    cacheService.clear('tasks:');
  }
}

/**
 * Preload tasks for multiple requirements efficiently
 * This is useful for the project view where we need tasks for many requirements
 * @param requirementIds Array of requirement IDs
 * @returns Map of requirement ID to array of tasks
 */
export async function batchLoadTasksByRequirements(requirementIds: number[]): Promise<Map<number, ExtendedImplementationTask[]>> {
  if (!requirementIds.length) {
    return new Map();
  }
  
  try {
    // First check what we have in cache
    const resultMap = new Map<number, ExtendedImplementationTask[]>();
    const missingRequirementIds: number[] = [];
    
    // Try to get tasks for each requirement from cache first
    for (const reqId of requirementIds) {
      const cacheKey = TASK_CACHE_KEYS.TASKS_BY_REQUIREMENT(reqId);
      const cachedTasks = cacheService.get<ExtendedImplementationTask[]>(cacheKey);
      
      if (cachedTasks) {
        resultMap.set(reqId, cachedTasks);
      } else {
        missingRequirementIds.push(reqId);
      }
    }
    
    // If all data was in cache, return immediately
    if (missingRequirementIds.length === 0) {
      return resultMap;
    }
    
    // Get requirements and their associated project IDs
    const requirementsData = await db.select({
      id: requirements.id,
      projectId: requirements.projectId
    })
    .from(requirements)
    .where(inArray(requirements.id, missingRequirementIds));
    
    // Create a map of requirement ID to project ID
    const requirementToProjectMap = new Map<number, number>();
    requirementsData.forEach(req => {
      requirementToProjectMap.set(req.id, req.projectId);
    });
    
    // Fetch tasks for all missing requirements in a single query
    const tasksData = await db.select()
      .from(implementationTasks)
      .where(inArray(implementationTasks.requirementId, missingRequirementIds))
      .orderBy(asc(implementationTasks.id));
    
    // Group tasks by requirement ID
    const tasksByRequirement = new Map<number, ImplementationTask[]>();
    tasksData.forEach(task => {
      if (!tasksByRequirement.has(task.requirementId)) {
        tasksByRequirement.set(task.requirementId, []);
      }
      tasksByRequirement.get(task.requirementId)!.push(task);
    });
    
    // Add project ID to tasks and update the result map and cache
    for (const reqId of missingRequirementIds) {
      const tasks = tasksByRequirement.get(reqId) || [];
      const projectId = requirementToProjectMap.get(reqId);
      
      // Create extended tasks with project ID
      const extendedTasks = tasks.map(task => ({
        ...task,
        projectId
      }));
      
      // Update result map
      resultMap.set(reqId, extendedTasks);
      
      // Update cache
      const cacheKey = TASK_CACHE_KEYS.TASKS_BY_REQUIREMENT(reqId);
      cacheService.set(cacheKey, extendedTasks, CACHE_TTL.MEDIUM);
    }
    
    return resultMap;
  } catch (error) {
    console.error('Error in batchLoadTasksByRequirements:', error);
    return new Map();
  }
}