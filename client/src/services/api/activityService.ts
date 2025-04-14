/**
 * Activity API Service
 * 
 * Handles all API requests related to activity logs
 */
import { get } from './apiClient';
import { Activity } from '@shared/schema';

/**
 * Get all activities (global)
 */
export const getAllActivities = (limit?: number): Promise<Activity[]> => {
  const url = limit ? `/api/activities?limit=${limit}` : '/api/activities';
  return get<Activity[]>(url);
};

/**
 * Get activities by project
 */
export const getProjectActivities = (projectId: number, limit?: number): Promise<Activity[]> => {
  const url = limit 
    ? `/api/projects/${projectId}/activities?limit=${limit}` 
    : `/api/projects/${projectId}/activities`;
  return get<Activity[]>(url);
};

/**
 * Get activities by user
 */
export const getUserActivities = (userId: number, limit?: number): Promise<Activity[]> => {
  const url = limit 
    ? `/api/users/${userId}/activities?limit=${limit}` 
    : `/api/users/${userId}/activities`;
  return get<Activity[]>(url);
};