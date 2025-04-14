/**
 * Requirement API Service
 * 
 * Handles all API requests related to requirements
 */
import { get, post, patch, del } from './apiClient';
import { Requirement, InsertRequirement } from '@shared/schema';

const BASE_URL = '/api/requirements';

/**
 * Get all requirements
 */
export const getAllRequirements = (): Promise<Requirement[]> => {
  return get<Requirement[]>(BASE_URL);
};

/**
 * Get requirements by project ID
 */
export const getRequirementsByProjectId = (projectId: number): Promise<Requirement[]> => {
  return get<Requirement[]>(`/api/projects/${projectId}/requirements`);
};

/**
 * Get a requirement by ID
 */
export const getRequirementById = (requirementId: number): Promise<Requirement> => {
  return get<Requirement>(`${BASE_URL}/${requirementId}`);
};

/**
 * Create a new requirement
 */
export const createRequirement = (requirementData: InsertRequirement): Promise<Requirement> => {
  return post<Requirement, InsertRequirement>(BASE_URL, requirementData);
};

/**
 * Update a requirement
 */
export const updateRequirement = (
  requirementId: number, 
  requirementData: Partial<InsertRequirement>
): Promise<Requirement> => {
  return patch<Requirement, Partial<InsertRequirement>>(
    `${BASE_URL}/${requirementId}`, 
    requirementData
  );
};

/**
 * Delete a requirement
 */
export const deleteRequirement = (requirementId: number): Promise<void> => {
  return del<void>(`${BASE_URL}/${requirementId}`);
};

/**
 * Get priority requirements for a project
 */
export const getPriorityRequirements = (projectId: number): Promise<Requirement[]> => {
  return get<Requirement[]>(`/api/projects/${projectId}/priority-requirements`);
};

/**
 * Analyze requirements for contradictions
 */
export const analyzeContradictions = (projectId: number): Promise<any> => {
  return post<any>(`/api/projects/${projectId}/analyze-contradictions`);
};