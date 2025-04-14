/**
 * Requirements Hook
 * 
 * Custom hook for managing requirements data and operations
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';
import { Requirement, InsertRequirement } from '@shared/schema';
import * as requirementService from '@/services/api/requirementService';

// Query keys
export const requirementKeys = {
  all: ['/api/requirements'] as const,
  details: (id: number) => [`/api/requirements/${id}`] as const,
  byProject: (projectId: number) => [`/api/projects/${projectId}/requirements`] as const,
  priority: (projectId: number) => [`/api/projects/${projectId}/priority-requirements`] as const,
  contradictions: (projectId: number) => [`/api/projects/${projectId}/contradictions`] as const,
};

/**
 * Hook for all requirements
 */
export function useAllRequirements() {
  const query = useQuery<Requirement[]>({
    queryKey: requirementKeys.all,
    queryFn: () => requirementService.getAllRequirements(),
  });
  
  return {
    ...query,
    requirements: query.data,
  };
}

/**
 * Hook for requirements by project
 */
export function useProjectRequirements(projectId: number) {
  const query = useQuery<Requirement[]>({
    queryKey: requirementKeys.byProject(projectId),
    queryFn: () => requirementService.getRequirementsByProjectId(projectId),
  });
  
  return {
    ...query,
    requirements: query.data,
  };
}

/**
 * Hook for single requirement details
 */
export function useRequirement(requirementId: number) {
  const query = useQuery<Requirement>({
    queryKey: requirementKeys.details(requirementId),
    queryFn: () => requirementService.getRequirementById(requirementId),
  });
  
  return {
    ...query,
    requirement: query.data,
  };
}

/**
 * Hook for creating requirements
 */
export function useCreateRequirement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (requirementData: InsertRequirement) => 
      requirementService.createRequirement(requirementData),
    onSuccess: (newRequirement) => {
      // Invalidate all requirements
      queryClient.invalidateQueries({ queryKey: requirementKeys.all });
      
      // Invalidate project requirements
      if (newRequirement.projectId) {
        queryClient.invalidateQueries({ 
          queryKey: requirementKeys.byProject(newRequirement.projectId) 
        });
      }
      
      toast({
        title: 'Requirement created',
        description: `Requirement "${newRequirement.title}" was created successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create requirement',
        description: error.message || 'An error occurred while creating the requirement.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook for updating requirements
 */
export function useUpdateRequirement(requirementId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (requirementData: Partial<InsertRequirement>) => 
      requirementService.updateRequirement(requirementId, requirementData),
    onSuccess: (updatedRequirement) => {
      // Invalidate requirement detail
      queryClient.invalidateQueries({ 
        queryKey: requirementKeys.details(requirementId) 
      });
      
      // Invalidate project requirements
      if (updatedRequirement.projectId) {
        queryClient.invalidateQueries({ 
          queryKey: requirementKeys.byProject(updatedRequirement.projectId) 
        });
      }
      
      // Invalidate all requirements
      queryClient.invalidateQueries({ queryKey: requirementKeys.all });
      
      toast({
        title: 'Requirement updated',
        description: `Requirement "${updatedRequirement.title}" was updated successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update requirement',
        description: error.message || 'An error occurred while updating the requirement.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook for deleting requirements
 */
export function useDeleteRequirement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (params: { requirementId: number; projectId?: number }) => {
      return requirementService.deleteRequirement(params.requirementId)
        .then(() => params);
    },
    onSuccess: ({ requirementId, projectId }) => {
      // Invalidate requirement detail
      queryClient.invalidateQueries({ 
        queryKey: requirementKeys.details(requirementId) 
      });
      
      // Invalidate project requirements if project ID is provided
      if (projectId) {
        queryClient.invalidateQueries({ 
          queryKey: requirementKeys.byProject(projectId) 
        });
      }
      
      // Invalidate all requirements
      queryClient.invalidateQueries({ queryKey: requirementKeys.all });
      
      toast({
        title: 'Requirement deleted',
        description: 'Requirement was deleted successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete requirement',
        description: error.message || 'An error occurred while deleting the requirement.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook for priority requirements
 */
export function usePriorityRequirements(projectId: number) {
  const query = useQuery<Requirement[]>({
    queryKey: requirementKeys.priority(projectId),
    queryFn: () => requirementService.getPriorityRequirements(projectId),
  });
  
  return {
    ...query,
    priorityRequirements: query.data,
  };
}

/**
 * Hook for analyzing contradictions
 */
export function useAnalyzeContradictions(projectId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: () => requirementService.analyzeContradictions(projectId),
    onSuccess: (result) => {
      // Invalidate requirements for this project
      queryClient.invalidateQueries({ 
        queryKey: requirementKeys.byProject(projectId) 
      });
      
      toast({
        title: 'Contradiction analysis complete',
        description: 'Requirements have been analyzed for contradictions.',
      });
      
      return result;
    },
    onError: (error: Error) => {
      toast({
        title: 'Analysis failed',
        description: error.message || 'An error occurred during contradiction analysis.',
        variant: 'destructive',
      });
    },
  });
}