/**
 * Application Settings Hook
 * 
 * Provides access to application-wide settings with proper typing
 * and handles cases where settings might be missing.
 */
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

// Import from application-settings.tsx if needed
import { ProjectRoleTemplate } from '@/lib/types';

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
  projectRoleTemplates: ProjectRoleTemplate[];
  defaultTaskType: string;
  defaultComplexity: 'low' | 'medium' | 'high';
  enableTemplateLibrary: boolean;
}

interface RoleTemplateSettings {
  projectRoleTemplates: ProjectRoleTemplate[];
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

/**
 * Hook specifically for project role templates (convenience wrapper)
 */
export function useProjectRoleTemplates() {
  // We need to handle the case where templates might not exist yet
  const { 
    data: templateSettings, 
    isLoading, 
    isError,
    error
  } = useApplicationSettings<TemplateSettings>('templates');
  
  // Default templates to use if none are defined
  const defaultTemplates: ProjectRoleTemplate[] = [
    {
      id: 'default-1',
      name: 'Onshore Senior Developer',
      roleType: 'Developer',
      locationType: 'Onshore',
      seniorityLevel: 'Senior',
      description: 'Experienced developer working in client timezone',
      costRate: '120',
      costUnit: 'Hour',
      currency: 'USD',
      isActive: true
    },
    {
      id: 'default-2',
      name: 'Offshore Junior QA',
      roleType: 'QA',
      locationType: 'Offshore',
      seniorityLevel: 'Junior',
      description: 'Entry-level quality assurance specialist working remotely',
      costRate: '40',
      costUnit: 'Hour',
      currency: 'USD',
      isActive: true
    },
    {
      id: 'default-3',
      name: 'Onshore Business Analyst',
      roleType: 'Business Analyst',
      locationType: 'Onshore',
      seniorityLevel: 'Mid-Level',
      description: 'Requirements gathering and analysis specialist',
      costRate: '95',
      costUnit: 'Hour',
      currency: 'USD',
      isActive: true
    }
  ];
  
  // Return templates or defaults if not available
  return {
    templates: templateSettings?.projectRoleTemplates || defaultTemplates,
    isLoading,
    isError,
    error
  };
}