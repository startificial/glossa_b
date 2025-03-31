// Types for frontend use, derived from schema.ts but with additional UI-specific properties

export interface User {
  id: number;
  username: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  company: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
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
  contentType: string | null;
  status: 'processing' | 'completed' | 'failed';
  metadata: Record<string, any> | null;
  processed: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface AcceptanceCriterion {
  id: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
}

export interface VideoScene {
  id: string;
  inputDataId: number;
  startTime: number;
  endTime: number;
  thumbnailPath?: string;
  clipPath?: string;
  relevance?: number;
  label?: string;
}

export interface TextReference {
  id: string;
  inputDataId: number;
  startPosition: number;
  endPosition: number;
  text: string;
  contextBefore?: string;
  contextAfter?: string;
  relevance?: number;
}

export interface AudioTimestamp {
  id: string;
  inputDataId: number;
  startTime: number;
  endTime: number;
  transcript?: string;
  audioClipPath?: string;
  relevance?: number;
}

export interface Requirement {
  id: number;
  text: string;
  name?: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  projectId: number;
  inputDataId: number | null;
  acceptanceCriteria: AcceptanceCriterion[];
  createdAt: string;
  updatedAt: string;
  codeId: string;
  source: string | null;
  videoScenes?: VideoScene[];
  textReferences?: TextReference[];
  audioTimestamps?: AudioTimestamp[];
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
  description: string;  // React form input needs string (we'll handle null conversion)
  type: string;
  sourceSystem?: string;  // React form input needs string (we'll handle null conversion)
  targetSystem?: string;  // React form input needs string (we'll handle null conversion)
}

export interface CreateRequirementFormData {
  text: string;
  name?: string;
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
    name?: string;
    text: string;
    category: string;
    priority: string;
    source: string | null;
    textReferences?: TextReference[];
    audioTimestamps?: AudioTimestamp[];
    videoScenes?: VideoScene[];
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
