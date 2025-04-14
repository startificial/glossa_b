/**
 * Tasks Hook
 * 
 * Custom hook for managing implementation tasks data and operations
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';
import { ImplementationTask, InsertImplementationTask } from '@shared/schema';
import * as taskService from '@/services/api/taskService';

// Query keys
export const taskKeys = {
  all: ['/api/tasks'] as const,
  details: (id: number) => [`/api/tasks/${id}`] as const,
  byProject: (projectId: number) => [`/api/projects/${projectId}/tasks`] as const,
  byRequirement: (requirementId: number) => [`/api/requirements/${requirementId}/tasks`] as const,
};

/**
 * Hook for tasks by project
 */
export function useProjectTasks(projectId: number) {
  const query = useQuery<ImplementationTask[]>({
    queryKey: taskKeys.byProject(projectId),
    queryFn: () => taskService.getTasksByProjectId(projectId),
  });
  
  return {
    ...query,
    tasks: query.data,
  };
}

/**
 * Hook for tasks by requirement
 */
export function useRequirementTasks(requirementId: number) {
  const query = useQuery<ImplementationTask[]>({
    queryKey: taskKeys.byRequirement(requirementId),
    queryFn: () => taskService.getTasksByRequirementId(requirementId),
  });
  
  return {
    ...query,
    tasks: query.data,
  };
}

/**
 * Hook for task details
 */
export function useTask(taskId: number) {
  const query = useQuery<ImplementationTask>({
    queryKey: taskKeys.details(taskId),
    queryFn: () => taskService.getTaskById(taskId),
  });
  
  return {
    ...query,
    task: query.data,
  };
}

/**
 * Hook for creating a task
 */
export function useCreateTask() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (taskData: InsertImplementationTask) => 
      taskService.createTask(taskData),
    onSuccess: (newTask) => {
      // Invalidate relevant queries
      if (newTask.projectId) {
        queryClient.invalidateQueries({ 
          queryKey: taskKeys.byProject(newTask.projectId) 
        });
      }
      
      if (newTask.requirementId) {
        queryClient.invalidateQueries({ 
          queryKey: taskKeys.byRequirement(newTask.requirementId) 
        });
      }
      
      toast({
        title: 'Task created',
        description: `Task "${newTask.title}" was created successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create task',
        description: error.message || 'An error occurred while creating the task.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook for updating a task
 */
export function useUpdateTask(taskId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (taskData: Partial<InsertImplementationTask>) => 
      taskService.updateTask(taskId, taskData),
    onSuccess: (updatedTask) => {
      // Invalidate the specific task
      queryClient.invalidateQueries({ 
        queryKey: taskKeys.details(taskId) 
      });
      
      // Invalidate relevant lists
      if (updatedTask.projectId) {
        queryClient.invalidateQueries({ 
          queryKey: taskKeys.byProject(updatedTask.projectId) 
        });
      }
      
      if (updatedTask.requirementId) {
        queryClient.invalidateQueries({ 
          queryKey: taskKeys.byRequirement(updatedTask.requirementId) 
        });
      }
      
      toast({
        title: 'Task updated',
        description: `Task "${updatedTask.title}" was updated successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update task',
        description: error.message || 'An error occurred while updating the task.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook for deleting a task
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (params: { 
      taskId: number; 
      projectId?: number; 
      requirementId?: number;
    }) => {
      return taskService.deleteTask(params.taskId)
        .then(() => params);
    },
    onSuccess: ({ taskId, projectId, requirementId }) => {
      // Invalidate the specific task
      queryClient.invalidateQueries({ 
        queryKey: taskKeys.details(taskId) 
      });
      
      // Invalidate relevant lists
      if (projectId) {
        queryClient.invalidateQueries({ 
          queryKey: taskKeys.byProject(projectId) 
        });
      }
      
      if (requirementId) {
        queryClient.invalidateQueries({ 
          queryKey: taskKeys.byRequirement(requirementId) 
        });
      }
      
      toast({
        title: 'Task deleted',
        description: 'Task was deleted successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete task',
        description: error.message || 'An error occurred while deleting the task.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook for generating tasks for a requirement
 */
export function useGenerateTasksForRequirement(requirementId: number, projectId?: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: () => taskService.generateTasksForRequirement(requirementId),
    onSuccess: (generatedTasks) => {
      // Invalidate tasks for this requirement
      queryClient.invalidateQueries({ 
        queryKey: taskKeys.byRequirement(requirementId) 
      });
      
      // Invalidate project tasks if projectId is provided
      if (projectId) {
        queryClient.invalidateQueries({ 
          queryKey: taskKeys.byProject(projectId) 
        });
      }
      
      toast({
        title: 'Tasks generated',
        description: `${generatedTasks.length} implementation ${
          generatedTasks.length === 1 ? 'task was' : 'tasks were'
        } generated.`,
      });
      
      return generatedTasks;
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to generate tasks',
        description: error.message || 'An error occurred while generating implementation tasks.',
        variant: 'destructive',
      });
    },
  });
}