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

/**
 * Application Settings Types
 * 
 * These interfaces define the structure of application-wide settings.
 * They are organized in a hierarchical way to allow for modular and
 * extensible settings management.
 */

// General application settings
export interface GeneralSettings {
  applicationName: string;
  companyName: string;
  supportEmail: string;
  maxFileUploadSize: number; // In bytes
  defaultLanguage: string;
  timeZone: string;
}

// User and authentication settings
export interface AuthSettings {
  passwordPolicy: {
    minLength: number;
    requireSpecialChars: boolean;
    requireNumbers: boolean;
    requireUppercase: boolean;
    requireLowercase: boolean;
  };
  mfaEnabled: boolean;
  sessionTimeout: number; // In minutes
  allowSelfRegistration: boolean;
  loginAttempts: number; // Max failed login attempts
}

// Notification settings
export interface NotificationSettings {
  emailNotificationsEnabled: boolean;
  systemNotificationsEnabled: boolean;
  defaultReminderTime: number; // In hours before deadline
}

// Integration settings 
export interface IntegrationSettings {
  aiProvider: 'google' | 'openai' | 'anthropic' | 'huggingface';
  aiModel: string;
  aiApiRateLimit: number;
  enableThirdPartyIntegrations: boolean;
}

// Full application settings object
export interface ApplicationSettingsData {
  general: GeneralSettings;
  auth: AuthSettings;
  notifications: NotificationSettings;
  integrations: IntegrationSettings;
  [key: string]: any; // Allow for future extension of settings categories
}

// Application settings section definition for UI navigation
export interface AppSettingsSection {
  id: string;
  title: string;
  description: string;
  icon: string;
  path: string;
}