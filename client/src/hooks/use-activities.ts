/**
 * Activities Hook
 * 
 * Custom hook for accessing activity data
 */
import { useQuery } from '@tanstack/react-query';
import { Activity } from '@shared/schema';
import * as activityService from '@/services/api/activityService';

// Query keys
export const activityKeys = {
  all: ['/api/activities'] as const,
  allWithLimit: (limit: number) => [`/api/activities?limit=${limit}`] as const,
  byProject: (projectId: number) => [`/api/projects/${projectId}/activities`] as const,
  byProjectWithLimit: (projectId: number, limit: number) => 
    [`/api/projects/${projectId}/activities?limit=${limit}`] as const,
  byUser: (userId: number) => [`/api/users/${userId}/activities`] as const,
  byUserWithLimit: (userId: number, limit: number) => 
    [`/api/users/${userId}/activities?limit=${limit}`] as const,
};

/**
 * Hook for global activities
 */
export function useActivities(limit?: number) {
  const queryKey = limit 
    ? activityKeys.allWithLimit(limit) 
    : activityKeys.all;
  
  const query = useQuery<Activity[]>({
    queryKey,
    queryFn: () => activityService.getAllActivities(limit),
  });
  
  return {
    ...query,
    activities: query.data,
  };
}

/**
 * Hook for project activities
 */
export function useProjectActivities(projectId: number, limit?: number) {
  const queryKey = limit 
    ? activityKeys.byProjectWithLimit(projectId, limit) 
    : activityKeys.byProject(projectId);
  
  const query = useQuery<Activity[]>({
    queryKey,
    queryFn: () => activityService.getProjectActivities(projectId, limit),
  });
  
  return {
    ...query,
    activities: query.data,
  };
}

/**
 * Hook for user activities
 */
export function useUserActivities(userId: number, limit?: number) {
  const queryKey = limit 
    ? activityKeys.byUserWithLimit(userId, limit) 
    : activityKeys.byUser(userId);
  
  const query = useQuery<Activity[]>({
    queryKey,
    queryFn: () => activityService.getUserActivities(userId, limit),
  });
  
  return {
    ...query,
    activities: query.data,
  };
}