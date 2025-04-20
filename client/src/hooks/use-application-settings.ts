/**
 * Application Settings Hook
 * 
 * Provides access to application-wide settings with proper typing
 * and handles cases where settings might be missing.
 */
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

// Import from application-settings.tsx if needed
interface TaskTemplate {
  name: string;
  description: string;
  estimatedHours: number;
  complexity: 'low' | 'medium' | 'high';
  taskType: string;
  implementationSteps: string[];
}

interface TemplateSettings {
  implementationTaskTemplates: TaskTemplate[];
  defaultTaskType: string;
  defaultComplexity: 'low' | 'medium' | 'high';
  enableTemplateLibrary: boolean;
}

/**
 * Hook to access all application settings or a specific category
 */
export function useApplicationSettings<T = any>(category?: string) {
  const [settings, setSettings] = useState<T | null>(null);
  
  // Fetch application settings from API
  const { 
    data: allSettings, 
    isLoading, 
    isError, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['/api/application-settings'],
    refetchOnWindowFocus: false
  });
  
  // Process settings data when available
  useEffect(() => {
    if (allSettings) {
      if (category) {
        // Return specific category if requested
        setSettings((allSettings[category] || null) as T);
      } else {
        // Return all settings
        setSettings(allSettings as T);
      }
    }
  }, [allSettings, category]);
  
  return {
    data: settings,
    isLoading,
    isError,
    error,
    refetch
  };
}

/**
 * Hook specifically for task templates (convenience wrapper)
 */
export function useTaskTemplates() {
  // We need to handle the case where templates might not exist yet
  const { 
    data: templateSettings, 
    isLoading, 
    isError,
    error
  } = useApplicationSettings<TemplateSettings>('templates');
  
  // Default templates to use if none are defined
  const defaultTemplates: TaskTemplate[] = [
    {
      name: 'Basic Implementation',
      description: 'Standard implementation task for basic features',
      estimatedHours: 4,
      complexity: 'medium',
      taskType: 'implementation',
      implementationSteps: ['Analyze requirements', 'Design solution', 'Implement code', 'Test functionality']
    },
    {
      name: 'Complex Integration',
      description: 'Integration task requiring multiple systems',
      estimatedHours: 8,
      complexity: 'high',
      taskType: 'integration',
      implementationSteps: ['Analyze integration points', 'Design data flow', 'Implement adapters', 'Configure endpoints', 'Test end-to-end flow']
    },
    {
      name: 'Bug Fix',
      description: 'Task for fixing identified issues',
      estimatedHours: 2,
      complexity: 'low',
      taskType: 'bug-fix',
      implementationSteps: ['Reproduce issue', 'Identify root cause', 'Implement fix', 'Verify resolution']
    }
  ];
  
  // Return templates or defaults if not available
  return {
    templates: templateSettings?.implementationTaskTemplates || defaultTemplates,
    defaultTaskType: templateSettings?.defaultTaskType || 'implementation',
    defaultComplexity: templateSettings?.defaultComplexity || 'medium',
    enableTemplateLibrary: templateSettings?.enableTemplateLibrary || true,
    isLoading,
    isError,
    error
  };
}