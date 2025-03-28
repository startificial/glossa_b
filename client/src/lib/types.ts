// Types for frontend use, derived from schema.ts but with additional UI-specific properties

export interface User {
  id: number;
  username: string;
}

export interface Project {
  id: number;
  name: string;
  description: string | null;
  type: string;
  userId: number;
  sourceSystem: string | null;
  targetSystem: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InputData {
  id: number;
  name: string;
  type: string;
  size: number;
  projectId: number;
  status: 'processing' | 'completed' | 'failed';
  metadata: Record<string, any> | null;
  processed: boolean;
  createdAt: string;
}

export interface AcceptanceCriterion {
  id: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
}

export interface Requirement {
  id: number;
  text: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  projectId: number;
  inputDataId: number | null;
  acceptanceCriteria: AcceptanceCriterion[];
  createdAt: string;
  updatedAt: string;
  codeId: string;
  source: string | null;
}

export interface Activity {
  id: number;
  type: string;
  description: string;
  userId: number;
  projectId: number;
  relatedEntityId: number | null;
  createdAt: string;
}

export interface ProjectMetrics {
  totalRequirements: number;
  inputDataSources: number;
  highPriorityCount: number;
  lastUpdated: string | null;
}

export interface RequirementsFilter {
  category?: string;
  priority?: string;
  source?: string;
  search?: string;
}

export interface CreateProjectFormData {
  name: string;
  description: string;
  type: string;
}

export interface CreateRequirementFormData {
  text: string;
  category: string;
  priority: string;
  source: string;
  inputDataId?: number;
}

export interface ExportData {
  project: {
    name: string;
    description: string | null;
    type: string;
    exportDate: string;
  };
  requirements: {
    id: string;
    text: string;
    category: string;
    priority: string;
    source: string | null;
  }[];
}

export interface ImplementationTask {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
  system: 'source' | 'target';
  requirementId: number;
  estimatedHours: number | null;
  complexity: string | null;
  assignee: string | null;
  createdAt: string;
  updatedAt: string;
}
