/**
 * Task API Service
 * 
 * Handles all API requests related to implementation tasks
 */
import { get, post, patch, del } from './apiClient';
import { ImplementationTask, InsertImplementationTask } from '@shared/schema';

const BASE_URL = '/api/tasks';

/**
 * Get tasks by project ID
 */
export const getTasksByProjectId = (projectId: number): Promise<ImplementationTask[]> => {
  return get<ImplementationTask[]>(`/api/projects/${projectId}/tasks`);
};

/**
 * Get tasks by requirement ID
 */
export const getTasksByRequirementId = (requirementId: number): Promise<ImplementationTask[]> => {
  return get<ImplementationTask[]>(`/api/requirements/${requirementId}/tasks`);
};

/**
 * Get task by ID
 */
export const getTaskById = (taskId: number): Promise<ImplementationTask> => {
  return get<ImplementationTask>(`${BASE_URL}/${taskId}`);
};

/**
 * Create new task
 */
export const createTask = (taskData: InsertImplementationTask): Promise<ImplementationTask> => {
  return post<ImplementationTask, InsertImplementationTask>(BASE_URL, taskData);
};

/**
 * Update task
 */
export const updateTask = (
  taskId: number, 
  taskData: Partial<InsertImplementationTask>
): Promise<ImplementationTask> => {
  return patch<ImplementationTask, Partial<InsertImplementationTask>>(
    `${BASE_URL}/${taskId}`, 
    taskData
  );
};

/**
 * Delete task
 */
export const deleteTask = (taskId: number): Promise<void> => {
  return del<void>(`${BASE_URL}/${taskId}`);
};

/**
 * Generate implementation tasks for a requirement
 */
export const generateTasksForRequirement = (requirementId: number): Promise<ImplementationTask[]> => {
  return post<ImplementationTask[]>(`/api/requirements/${requirementId}/generate-tasks`);
};