/**
 * Requirements Hook (Optimized Version)
 * 
 * Custom hook for managing requirements data with performance optimizations:
 * - Proper memoization of query keys
 * - Intelligent stale times based on data volatility
 * - Smart cache invalidation
 * - Pagination with cursor support
 * - Optimistic updates
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';
import { Requirement, InsertRequirement } from '@shared/schema';
import * as requirementService from '@/services/api/requirementService';
import { createQueryKeys } from '@/lib/query-client-optimized';

// Query keys with appropriate stale times
export const requirementKeys = {
  // Requirements list is relatively stable (cached for 2 minutes)
  all: createQueryKeys.reference('/api/requirements'),
  
  // Filtered queries are more dynamic (cached for 30 seconds)
  filtered: (filters: any) => createQueryKeys.dynamic('/api/requirements/filtered', filters),
  
  // Single requirement details (cached for 2 minutes)
  details: (id: number) => createQueryKeys.reference('/api/requirements', id),
  
  // High priority requirements (cached for 1 minute)
  highPriority: (projectId: number) => 
    createQueryKeys.dynamic('/api/projects', projectId, 'requirements/high-priority'),
  
  // Requirements by project (cached for 2 minutes)
  byProject: (projectId: number) => 
    createQueryKeys.reference('/api/projects', projectId, 'requirements'),
  
  // Requirements by category (cached for 2 minutes)
  byCategory: (projectId: number, category: string) => 
    createQueryKeys.reference('/api/projects', projectId, 'requirements/category', category),
  
  // Requirements metrics (cached for 5 minutes as they change less frequently)
  metrics: (projectId: number) => 
    createQueryKeys.static('/api/projects', projectId, 'requirements/metrics'),
};

/**
 * Hook for paginated requirements list by project with cursor pagination
 * This is more efficient than offset pagination for large datasets
 */
export function useProjectRequirements(
  projectId: number, 
  options: { 
    pageSize?: number,
    cursor?: string,
    filters?: { 
      priority?: string, 
      category?: string, 
      status?: string 
    }
  } = {}
) {
  const { pageSize = 10, cursor, filters } = options;
  
  // Generate a stable query key based on all parameters
  const queryKey = [
    ...requirementKeys.byProject(projectId).queryKey,
    pageSize,
    cursor,
    JSON.stringify(filters)
  ];
  
  const query = useQuery<{
    requirements: Requirement[],
    nextCursor: string | null,
    totalCount: number
  }>({
    queryKey,
    queryFn: () => requirementService.getRequirementsByProject(
      projectId, 
      pageSize, 
      cursor, 
      filters
    ),
    staleTime: requirementKeys.byProject(projectId).staleTime,
    // Keep previous data to avoid loading states during pagination
    keepPreviousData: true
  });
  
  return {
    ...query,
    requirements: query.data?.requirements || [],
    nextCursor: query.data?.nextCursor || null,
    totalCount: query.data?.totalCount || 0,
    hasNextPage: !!query.data?.nextCursor
  };
}

/**
 * Hook for single requirement details with optimized data fetching
 */
export function useRequirement(requirementId: number) {
  const { toast } = useToast();
  
  const query = useQuery<Requirement>({
    ...requirementKeys.details(requirementId),
    queryFn: () => requirementService.getRequirementById(requirementId),
    // Show error toast on failure
    onError: (error: Error) => {
      toast({
        title: 'Error loading requirement',
        description: error.message || 'Failed to load requirement details',
        variant: 'destructive',
      });
    }
  });
  
  return {
    ...query,
    requirement: query.data,
  };
}

/**
 * Hook for requirement creation with optimistic updates
 */
export function useCreateRequirement(projectId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (requirementData: InsertRequirement) => 
      requirementService.createRequirement(requirementData),
      
    // Optimistic update to immediately show the new requirement in the UI
    onMutate: async (newRequirementData) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ 
        queryKey: requirementKeys.byProject(projectId).queryKey
      });
      
      // Snapshot the previous requirements
      const previousRequirements = queryClient.getQueryData<{
        requirements: Requirement[],
        nextCursor: string | null,
        totalCount: number
      }>(requirementKeys.byProject(projectId).queryKey);
      
      // Optimistically update the UI by adding the new requirement
      if (previousRequirements) {
        queryClient.setQueryData(
          requirementKeys.byProject(projectId).queryKey, 
          {
            ...previousRequirements,
            requirements: [
              // Create a temporary optimistic requirement
              {
                id: Date.now(), // Temporary ID, will be replaced by server
                ...newRequirementData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                // Add any other required fields with defaults
                status: newRequirementData.status || 'draft',
                __optimistic: true // Flag to identify optimistic data
              },
              ...previousRequirements.requirements
            ],
            totalCount: previousRequirements.totalCount + 1
          }
        );
      }
      
      return { previousRequirements };
    },
    
    // If mutation fails, roll back to the saved state
    onError: (error: Error, _variables, context) => {
      if (context?.previousRequirements) {
        queryClient.setQueryData(
          requirementKeys.byProject(projectId).queryKey,
          context.previousRequirements
        );
      }
      
      toast({
        title: 'Failed to create requirement',
        description: error.message || 'An error occurred while creating the requirement',
        variant: 'destructive',
      });
    },
    
    // When the mutation is successful, refetch to get the real data
    onSuccess: (newRequirement) => {
      // Invalidate all relevant query caches
      queryClient.invalidateQueries({ 
        queryKey: requirementKeys.byProject(projectId).queryKey 
      });
      queryClient.invalidateQueries({ 
        queryKey: requirementKeys.metrics(projectId).queryKey 
      });
      
      toast({
        title: 'Requirement created',
        description: `Requirement "${newRequirement.title}" was created successfully`,
      });
    },
  });
}

/**
 * Hook for requirement update with optimistic updates
 */
export function useUpdateRequirement(requirementId: number, projectId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (requirementData: Partial<InsertRequirement>) => 
      requirementService.updateRequirement(requirementId, requirementData),
      
    // Optimistic update to immediately show the update in the UI
    onMutate: async (updateData) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: requirementKeys.details(requirementId).queryKey 
      });
      await queryClient.cancelQueries({ 
        queryKey: requirementKeys.byProject(projectId).queryKey 
      });
      
      // Snapshot the previous requirement detail
      const previousRequirement = queryClient.getQueryData<Requirement>(
        requirementKeys.details(requirementId).queryKey
      );
      
      // Snapshot the previous requirements list
      const previousRequirements = queryClient.getQueryData<{
        requirements: Requirement[],
        nextCursor: string | null,
        totalCount: number
      }>(requirementKeys.byProject(projectId).queryKey);
      
      // Optimistically update the requirement detail
      if (previousRequirement) {
        queryClient.setQueryData(
          requirementKeys.details(requirementId).queryKey, 
          {
            ...previousRequirement,
            ...updateData,
            updatedAt: new Date().toISOString()
          }
        );
      }
      
      // Optimistically update the requirements list if it exists in cache
      if (previousRequirements) {
        queryClient.setQueryData(
          requirementKeys.byProject(projectId).queryKey,
          {
            ...previousRequirements,
            requirements: previousRequirements.requirements.map(req => 
              req.id === requirementId 
                ? { ...req, ...updateData, updatedAt: new Date().toISOString() } 
                : req
            )
          }
        );
      }
      
      return { previousRequirement, previousRequirements };
    },
    
    // If mutation fails, roll back to the saved state
    onError: (error: Error, _variables, context) => {
      if (context?.previousRequirement) {
        queryClient.setQueryData(
          requirementKeys.details(requirementId).queryKey,
          context.previousRequirement
        );
      }
      
      if (context?.previousRequirements) {
        queryClient.setQueryData(
          requirementKeys.byProject(projectId).queryKey,
          context.previousRequirements
        );
      }
      
      toast({
        title: 'Failed to update requirement',
        description: error.message || 'An error occurred while updating the requirement',
        variant: 'destructive',
      });
    },
    
    // When the mutation is successful, update the cache with the real data
    onSuccess: (updatedRequirement) => {
      // Update requirement detail cache with real data
      queryClient.setQueryData(
        requirementKeys.details(requirementId).queryKey,
        updatedRequirement
      );
      
      // Invalidate other potentially affected queries
      queryClient.invalidateQueries({ 
        queryKey: requirementKeys.byProject(projectId).queryKey 
      });
      queryClient.invalidateQueries({ 
        queryKey: requirementKeys.highPriority(projectId).queryKey 
      });
      queryClient.invalidateQueries({ 
        queryKey: requirementKeys.metrics(projectId).queryKey 
      });
      
      toast({
        title: 'Requirement updated',
        description: `Requirement "${updatedRequirement.title}" was updated successfully`,
      });
    },
  });
}

/**
 * Hook for requirement deletion with optimistic updates
 */
export function useDeleteRequirement(projectId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (requirementId: number) => 
      requirementService.deleteRequirement(requirementId),
      
    // Optimistic update to immediately show the removal in the UI
    onMutate: async (requirementId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: requirementKeys.byProject(projectId).queryKey 
      });
      
      // Snapshot the previous requirements
      const previousRequirements = queryClient.getQueryData<{
        requirements: Requirement[],
        nextCursor: string | null,
        totalCount: number
      }>(requirementKeys.byProject(projectId).queryKey);
      
      // Optimistically update the UI by removing the requirement
      if (previousRequirements) {
        queryClient.setQueryData(
          requirementKeys.byProject(projectId).queryKey,
          {
            ...previousRequirements,
            requirements: previousRequirements.requirements.filter(
              requirement => requirement.id !== requirementId
            ),
            totalCount: previousRequirements.totalCount - 1
          }
        );
      }
      
      return { previousRequirements };
    },
    
    // If mutation fails, roll back to the saved state
    onError: (error: Error, _variables, context) => {
      if (context?.previousRequirements) {
        queryClient.setQueryData(
          requirementKeys.byProject(projectId).queryKey,
          context.previousRequirements
        );
      }
      
      toast({
        title: 'Failed to delete requirement',
        description: error.message || 'An error occurred while deleting the requirement',
        variant: 'destructive',
      });
    },
    
    // When the mutation is successful, invalidate affected queries
    onSuccess: (_data, requirementId) => {
      // Remove the specific requirement from detail cache
      queryClient.removeQueries({ 
        queryKey: requirementKeys.details(requirementId).queryKey 
      });
      
      // Invalidate other potentially affected queries
      queryClient.invalidateQueries({ 
        queryKey: requirementKeys.byProject(projectId).queryKey 
      });
      queryClient.invalidateQueries({ 
        queryKey: requirementKeys.highPriority(projectId).queryKey 
      });
      queryClient.invalidateQueries({ 
        queryKey: requirementKeys.metrics(projectId).queryKey 
      });
      
      toast({
        title: 'Requirement deleted',
        description: 'Requirement was deleted successfully',
      });
    },
  });
}

/**
 * Hook for getting high priority requirements with optimized caching
 */
export function useHighPriorityRequirements(projectId: number, limit?: number) {
  const { toast } = useToast();
  
  const query = useQuery<Requirement[]>({
    ...requirementKeys.highPriority(projectId),
    queryFn: () => requirementService.getHighPriorityRequirements(projectId, limit),
    onError: (error: Error) => {
      toast({
        title: 'Error loading priority requirements',
        description: error.message || 'Failed to load priority requirements',
        variant: 'destructive',
      });
    }
  });
  
  return {
    ...query,
    requirements: query.data || [],
  };
}

/**
 * Hook for requirement metrics with long stale time (metrics change infrequently)
 */
export function useRequirementMetrics(projectId: number) {
  const query = useQuery({
    ...requirementKeys.metrics(projectId),
    queryFn: () => requirementService.getRequirementMetrics(projectId),
  });
  
  return {
    ...query,
    metrics: query.data,
  };
}