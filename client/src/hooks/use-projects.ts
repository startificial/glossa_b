/**
 * Projects Hook
 * 
 * Custom hook for managing projects data and operations
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';
import { Project, InsertProject } from '@shared/schema';
import * as projectService from '@/services/api/projectService';

// Query keys
export const projectKeys = {
  all: ['/api/projects'] as const,
  details: (id: number) => [`/api/projects/${id}`] as const,
  metrics: (id: number) => [`/api/projects/${id}/metrics`] as const,
  activity: (id: number) => [`/api/projects/${id}/activity`] as const,
};

/**
 * Hook for listing projects
 */
export function useProjects() {
  const { toast } = useToast();
  
  const query = useQuery<Project[]>({
    queryKey: projectKeys.all,
    queryFn: () => projectService.getAllProjects(),
  });
  
  return {
    ...query,
    projects: query.data,
  };
}

/**
 * Hook for single project details
 */
export function useProject(projectId: number) {
  const { toast } = useToast();
  
  const query = useQuery<Project>({
    queryKey: projectKeys.details(projectId),
    queryFn: () => projectService.getProjectById(projectId),
  });
  
  return {
    ...query,
    project: query.data,
  };
}

/**
 * Hook for project creation
 */
export function useCreateProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (projectData: InsertProject) => 
      projectService.createProject(projectData),
    onSuccess: (newProject) => {
      // Invalidate projects list
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      
      toast({
        title: 'Project created',
        description: `Project "${newProject.name}" was created successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create project',
        description: error.message || 'An error occurred while creating the project.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook for project update
 */
export function useUpdateProject(projectId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (projectData: Partial<InsertProject>) => 
      projectService.updateProject(projectId, projectData),
    onSuccess: (updatedProject) => {
      // Invalidate specific project
      queryClient.invalidateQueries({ queryKey: projectKeys.details(projectId) });
      // Invalidate projects list
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      
      toast({
        title: 'Project updated',
        description: `Project "${updatedProject.name}" was updated successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update project',
        description: error.message || 'An error occurred while updating the project.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook for project deletion
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (projectId: number) => 
      projectService.deleteProject(projectId),
    onSuccess: (_, projectId) => {
      // Invalidate projects list
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      
      toast({
        title: 'Project deleted',
        description: 'Project was deleted successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete project',
        description: error.message || 'An error occurred while deleting the project.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook for project metrics
 */
export function useProjectMetrics(projectId: number) {
  const query = useQuery({
    queryKey: projectKeys.metrics(projectId),
    queryFn: () => projectService.getProjectMetrics(projectId),
  });
  
  return {
    ...query,
    metrics: query.data,
  };
}

/**
 * Hook for project activity
 */
export function useProjectActivity(projectId: number) {
  const query = useQuery({
    queryKey: projectKeys.activity(projectId),
    queryFn: () => projectService.getProjectActivity(projectId),
  });
  
  return {
    ...query,
    activity: query.data,
  };
}