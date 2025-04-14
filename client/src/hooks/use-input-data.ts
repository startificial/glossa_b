/**
 * Input Data Hook
 * 
 * Custom hook for managing input data operations
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';
import { InputData } from '@shared/schema';
import * as inputDataService from '@/services/api/inputDataService';
import { requirementKeys } from './use-requirements';

// Query keys
export const inputDataKeys = {
  all: ['/api/input-data'] as const,
  details: (id: number) => [`/api/input-data/${id}`] as const,
  byProject: (projectId: number) => [`/api/projects/${projectId}/input-data`] as const,
};

/**
 * Hook for input data by project
 */
export function useProjectInputData(projectId: number) {
  const query = useQuery<InputData[]>({
    queryKey: inputDataKeys.byProject(projectId),
    queryFn: () => inputDataService.getInputDataByProjectId(projectId),
  });
  
  return {
    ...query,
    inputDataList: query.data,
  };
}

/**
 * Hook for single input data item
 */
export function useInputData(inputDataId: number) {
  const query = useQuery<InputData>({
    queryKey: inputDataKeys.details(inputDataId),
    queryFn: () => inputDataService.getInputDataById(inputDataId),
  });
  
  return {
    ...query,
    inputData: query.data,
  };
}

/**
 * Hook for uploading file input data
 */
export function useUploadFileInputData(projectId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (formData: FormData) => 
      inputDataService.uploadFileInputData(projectId, formData),
    onSuccess: (newInputData) => {
      // Invalidate project input data
      queryClient.invalidateQueries({ 
        queryKey: inputDataKeys.byProject(projectId) 
      });
      
      toast({
        title: 'File uploaded',
        description: `"${newInputData.name}" was uploaded successfully and is being processed.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Upload failed',
        description: error.message || 'An error occurred while uploading the file.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook for creating URL input data
 */
export function useCreateURLInputData(projectId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (data: { url: string; name?: string; description?: string }) => 
      inputDataService.createURLInputData(projectId, data),
    onSuccess: (newInputData) => {
      // Invalidate project input data
      queryClient.invalidateQueries({ 
        queryKey: inputDataKeys.byProject(projectId) 
      });
      
      toast({
        title: 'URL added',
        description: `"${newInputData.name || newInputData.url}" was added successfully and is being processed.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to add URL',
        description: error.message || 'An error occurred while adding the URL.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook for creating text input data
 */
export function useCreateTextInputData(projectId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (data: { content: string; name: string; description?: string }) => 
      inputDataService.createTextInputData(projectId, data),
    onSuccess: (newInputData) => {
      // Invalidate project input data
      queryClient.invalidateQueries({ 
        queryKey: inputDataKeys.byProject(projectId) 
      });
      
      toast({
        title: 'Text added',
        description: `"${newInputData.name}" was added successfully and is being processed.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to add text',
        description: error.message || 'An error occurred while adding the text.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook for updating input data
 */
export function useUpdateInputData(inputDataId: number, projectId?: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (data: Partial<InputData>) => 
      inputDataService.updateInputData(inputDataId, data),
    onSuccess: (updatedInputData) => {
      // Invalidate input data detail
      queryClient.invalidateQueries({ 
        queryKey: inputDataKeys.details(inputDataId) 
      });
      
      // Invalidate project input data if project ID is provided
      if (projectId) {
        queryClient.invalidateQueries({ 
          queryKey: inputDataKeys.byProject(projectId) 
        });
      }
      
      toast({
        title: 'Input data updated',
        description: `"${updatedInputData.name}" was updated successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Update failed',
        description: error.message || 'An error occurred while updating the input data.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook for deleting input data
 */
export function useDeleteInputData() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (params: { inputDataId: number; projectId?: number }) => {
      return inputDataService.deleteInputData(params.inputDataId)
        .then(() => params);
    },
    onSuccess: ({ inputDataId, projectId }) => {
      // Invalidate input data detail
      queryClient.invalidateQueries({ 
        queryKey: inputDataKeys.details(inputDataId) 
      });
      
      // Invalidate project input data if project ID is provided
      if (projectId) {
        queryClient.invalidateQueries({ 
          queryKey: inputDataKeys.byProject(projectId) 
        });
      }
      
      toast({
        title: 'Input data deleted',
        description: 'Input data was deleted successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Delete failed',
        description: error.message || 'An error occurred while deleting the input data.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook for processing input data
 */
export function useProcessInputData(inputDataId: number, projectId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: () => inputDataService.processInputData(inputDataId),
    onSuccess: () => {
      // Invalidate input data detail
      queryClient.invalidateQueries({ 
        queryKey: inputDataKeys.details(inputDataId) 
      });
      
      // Invalidate project input data
      queryClient.invalidateQueries({ 
        queryKey: inputDataKeys.byProject(projectId) 
      });
      
      // Invalidate requirements for this project since processing likely creates new ones
      queryClient.invalidateQueries({ 
        queryKey: requirementKeys.byProject(projectId) 
      });
      
      toast({
        title: 'Processing started',
        description: 'Input data is being processed to generate requirements.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Processing failed',
        description: error.message || 'An error occurred while processing the input data.',
        variant: 'destructive',
      });
    },
  });
}