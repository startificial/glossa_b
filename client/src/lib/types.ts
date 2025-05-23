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

export interface Customer {
  id: number;
  name: string;
  description: string | null;
  industry: string | null;
  backgroundInfo: string | null;
  website: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  createdAt: string;
  updatedAt: string;
  // Additional fields for UI display
  projects?: Project[];
  successRate?: number;
  collaborators?: number;
}

export interface Project {
  id: number;
  name: string;
  description: string | null;
  type: string;
  stage: string | null;
  userId: number;
  customerId: number | null;
  customer: string | Customer | null; // Can be a string or Customer object
  customerDetails?: Customer; // For joined data
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

export interface GherkinStructure {
  scenario: string;
  given: string;
  when: string;
  and: string[];
  then: string;
  andThen: string[];
}

export interface AcceptanceCriterion {
  id: string;
  description: string;
  gherkin?: GherkinStructure; // structured Gherkin components
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

export interface ExpertReview {
  evaluation: {
    rating: 'good' | 'good with caveats' | 'bad';
    explanation: string;
    follow_up_questions: string[];
  }
}

export interface Requirement {
  id: number;
  title: string;
  description: string;
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
  expertReview?: ExpertReview;
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

export interface CreateCustomerFormData {
  name: string;
  description: string;  // React form input needs string (we'll handle null conversion)
  industry: string;
  backgroundInfo: string;
  website: string;
  contactEmail: string;
  contactPhone: string;
}

export interface CreateProjectFormData {
  name: string;
  description: string;  // React form input needs string (we'll handle null conversion)
  type: string;
  stage: string;  // Project stage (e.g., 'discovery', 'planning', 'implementation')
  customerId?: string;  // String in the form, will be converted to number when submitting
  customer?: string;  // Legacy field for backward compatibility
  sourceSystem?: string;  // React form input needs string (we'll handle null conversion)
  targetSystem?: string;  // React form input needs string (we'll handle null conversion)
  roleTemplateIds?: string[];  // IDs of role templates to apply to the project
}

export interface CreateRequirementFormData {
  title: string;
  description: string;
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
    title: string;
    description: string;
    category: string;
    priority: string;
    source: string | null;
    textReferences?: TextReference[];
    audioTimestamps?: AudioTimestamp[];
    videoScenes?: VideoScene[];
  }[];
}

export interface SfDocumentationLink {
  title: string;
  url: string;
}

export interface ImplementationStep {
  stepNumber: number;
  stepDescription: string;
  relevantDocumentationLinks?: string[];
}

export interface ImplementationTask {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
  system: 'source' | 'target';
  requirementId: number;
  projectId?: number; // Added to support UI navigation
  estimatedHours: number | null;
  complexity: string | null;
  assignee: string | null;
  taskType?: string;
  sfDocumentationLinks?: SfDocumentationLink[];
  implementationSteps?: ImplementationStep[];
  overallDocumentationLinks?: string[];
  createdAt: string;
  updatedAt: string;
}

// Workflow types for the visual workflow builder
export interface WorkflowNode {
  id: string;
  type: 'task' | 'decision' | 'start' | 'end' | 'subprocess';
  position: { x: number; y: number };
  data: {
    label: string;
    description?: string;
    requirementId?: number;
    taskId?: number;
    properties?: Record<string, any>;
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: 'default' | 'conditional' | 'exception';
  animated?: boolean;
  style?: Record<string, any>;
  data?: Record<string, any>;
}

export interface Workflow {
  id: number;
  name: string;
  description: string | null;
  projectId: number;
  version: number;
  status: 'draft' | 'published' | 'archived';
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  createdAt: string;
  updatedAt: string;
}

// Project Roles and Effort Estimation Types

export interface ProjectRole {
  id: number;
  name: string;
  roleType: string;
  locationType: string;
  seniorityLevel: string;
  projectId: number;
  description: string | null;
  costRate: string;
  costUnit: string;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RequirementRoleEffort {
  id: number;
  requirementId: number;
  roleId: number;
  estimatedEffort: string;
  effortUnit: string;
  createdAt: string;
  updatedAt: string;
  // For UI display
  role?: ProjectRole;
}

export interface TaskRoleEffort {
  id: number;
  taskId: number;
  roleId: number;
  estimatedEffort: string;
  effortUnit: string;
  createdAt: string;
  updatedAt: string;
  // For UI display
  role?: ProjectRole;
}

export interface CreateProjectRoleFormData {
  name: string;
  roleType: string;
  locationType: string;
  seniorityLevel: string;
  description: string;
  costRate: string;
  costUnit: string;
  currency: string;
  isActive: boolean;
}

export interface ProjectRoleTemplate {
  id?: string;
  name: string;
  roleType: string;
  locationType: string;
  seniorityLevel: string;
  description: string;
  costRate: string;
  costUnit: string;
  currency: string;
  isActive: boolean;
}
