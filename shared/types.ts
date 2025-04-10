// Structured Gherkin components
export interface GherkinStructure {
  scenario: string;
  given: string;
  when: string;
  and: string[];
  then: string;
  andThen: string[];
}

// AcceptanceCriterion interface to be used across client and server
export interface AcceptanceCriterion {
  id: string;
  description: string; // Gherkin formatted text with Scenario, Given, When, Then structure
  gherkin?: GherkinStructure; // Structured Gherkin components (optional for backward compatibility)
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
}

// Workflow Node type for workflow builder
export interface WorkflowNode {
  id: string;
  type: 'task' | 'userTask' | 'decision' | 'start' | 'end' | 'subprocess' | 'parallel' | 'wait' | 'message' | 'error' | 'annotation';
  position: { x: number; y: number };
  data: {
    label: string;
    description?: string;
    requirementId?: number;
    taskId?: number;
    properties?: Record<string, any>;
  };
}

// Workflow Edge type for workflow builder
export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: 'default' | 'conditional' | 'exception' | 'message' | 'annotation' | 'timeout';
  animated?: boolean;
  style?: Record<string, any>;
  data?: Record<string, any>;
}