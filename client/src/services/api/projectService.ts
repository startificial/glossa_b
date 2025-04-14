/**
 * Project API Service
 * 
 * Handles all API requests related to projects
 */
import { get, post, patch, del } from './apiClient';
import { Project, InsertProject } from '@shared/schema';

const BASE_URL = '/api/projects';

/**
 * Get all projects
 */
export const getAllProjects = (): Promise<Project[]> => {
  return get<Project[]>(BASE_URL);
};

/**
 * Get a project by ID
 */
export const getProjectById = (projectId: number): Promise<Project> => {
  return get<Project>(`${BASE_URL}/${projectId}`);
};

/**
 * Create a new project
 */
export const createProject = (projectData: InsertProject): Promise<Project> => {
  return post<Project, InsertProject>(BASE_URL, projectData);
};

/**
 * Update a project
 */
export const updateProject = (
  projectId: number, 
  projectData: Partial<InsertProject>
): Promise<Project> => {
  return patch<Project, Partial<InsertProject>>(`${BASE_URL}/${projectId}`, projectData);
};

/**
 * Delete a project
 */
export const deleteProject = (projectId: number): Promise<void> => {
  return del<void>(`${BASE_URL}/${projectId}`);
};

/**
 * Get project metrics
 */
export const getProjectMetrics = (projectId: number): Promise<any> => {
  return get<any>(`${BASE_URL}/${projectId}/metrics`);
};

/**
 * Get project activity
 */
export const getProjectActivity = (projectId: number): Promise<any> => {
  return get<any>(`${BASE_URL}/${projectId}/activity`);
};