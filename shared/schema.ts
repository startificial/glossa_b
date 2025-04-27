/**
 * Database Schema Module
 * 
 * This module defines the PostgreSQL database schema using Drizzle ORM.
 * It includes table definitions, relations, and Zod validation schemas.
 * 
 * The schema is organized into logical sections:
 * 1. Core entities (users, customers)
 * 2. Project management (projects, requirements, activities)
 * 3. Implementation entities (tasks, workflows)
 * 4. Document management (templates, documents, field mappings)
 */
import { pgTable, text, serial, integer, boolean, timestamp, jsonb, primaryKey, foreignKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { Template as PDFMeTemplate } from "@pdfme/common";

/**
 * Type definition for database relations
 * This improves type checking for relationships between tables
 */
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

/**
 * User Table - Core entity for authentication and user management
 * 
 * Represents a user in the system with authentication details,
 * profile information, and role-based access control.
 * 
 * Relationships:
 * - One-to-many with Projects (a user can own multiple projects)
 * - One-to-many with Activities (a user can have multiple activities)
 * - Self-referential for tracking user invitations
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(), // Should be stored as a hash in a production environment
  firstName: text("first_name"),
  lastName: text("last_name"),
  email: text("email").unique(),
  company: text("company"),
  avatarUrl: text("avatar_url"),
  role: text("role").default("user").notNull(), // Valid values: 'user', 'admin'
  isDemo: boolean("is_demo").default(false), // Flag to identify demo accounts
  invitedBy: integer("invited_by"), // Self-reference to track who invited this user
  resetPasswordToken: text("reset_password_token"), // Token for password reset
  resetPasswordExpires: timestamp("reset_password_expires"), // Expiration for reset token
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * User insert validation schema
 * Defines required and optional fields for creating a new user
 */
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  firstName: true,
  lastName: true,
  email: true,
  company: true,
  avatarUrl: true,
  role: true,
  isDemo: true,
  invitedBy: true,
});

/**
 * TypeScript type definitions for ORM models
 */
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

/**
 * Customers Table - Organizations that use the system
 * 
 * Represents client organizations for which projects are executed.
 * Stores company details and contact information.
 * 
 * Relationships:
 * - One-to-many with Projects (a customer can have multiple projects)
 */
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // Company name
  description: text("description"), // Brief description of the customer
  industry: text("industry"), // Customer's industry sector
  backgroundInfo: text("background_info"), // Additional background information
  website: text("website"), // Company website URL
  contactEmail: text("contact_email"), // Primary contact email
  contactPhone: text("contact_phone"), // Primary contact phone number
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Customer insert validation schema
 * Defines fields required when creating a new customer
 */
export const insertCustomerSchema = createInsertSchema(customers).pick({
  name: true,
  description: true,
  industry: true,
  backgroundInfo: true,
  website: true,
  contactEmail: true,
  contactPhone: true,
});

/**
 * Invites Table - User invitation system
 * 
 * Tracks invitations sent to new users to join the system.
 * Each invite has a unique token and tracks status.
 * 
 * Relationships:
 * - Many-to-one with User (invites are created by a user)
 */
export const invites = pgTable("invites", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(), // Unique token for validating invite links
  email: text("email"), // Recipient email address
  createdById: integer("created_by_id").references(() => users.id), // User who created the invite
  expiresAt: timestamp("expires_at").notNull(), // Expiration timestamp
  used: boolean("used").default(false).notNull(), // Whether the invite has been used
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Invite insert validation schema
 * Defines the fields required when creating a new invite
 */
export const insertInviteSchema = createInsertSchema(invites).pick({
  token: true,
  email: true,
  createdById: true,
  expiresAt: true,
});

/**
 * Project Table - Central entity for requirement management
 * 
 * Represents a customer project with source and target system details
 * and all associated requirements and implementation tasks.
 * 
 * Relationships:
 * - Many-to-one with User (a project is owned by one user)
 * - Many-to-one with Customer (a project belongs to one customer)
 * - One-to-many with Input Data (a project can have multiple input files)
 * - One-to-many with Requirements (a project has multiple requirements)
 * - One-to-many with Activities (a project has activity logs)
 * - One-to-many with Workflows (a project can have multiple workflow definitions)
 */
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // Type of project (e.g., 'migration', 'implementation', 'analysis')
  stage: text("stage").default("discovery"), // Project stage (e.g., 'discovery', 'planning', 'implementation', 'closed/won', 'closed/lost')
  userId: integer("user_id").notNull().references(() => users.id),
  customerId: integer("customer_id").references(() => customers.id),
  customer: text("customer"), // Legacy field for backward compatibility
  sourceSystem: text("source_system"), // System being migrated from
  targetSystem: text("target_system"), // System being migrated to
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Project insert validation schema
 * Defines the fields required when creating a new project
 */
export const insertProjectSchema = createInsertSchema(projects).pick({
  name: true,
  description: true,
  type: true,
  stage: true,
  userId: true,
  customerId: true,
  customer: true, 
  sourceSystem: true,
  targetSystem: true,
});

/**
 * Input Data Table - Stores uploaded files and source content
 * 
 * Represents files uploaded by users that serve as the source material
 * for AI-assisted requirement generation. Tracks processing status
 * and metadata about the content.
 * 
 * Relationships:
 * - Many-to-one with Project (input data belongs to a project)
 * - One-to-many with Requirements (input data can generate multiple requirements)
 */
export const inputData = pgTable("input_data", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // File type: 'audio', 'video', 'text', 'image', etc.
  contentType: text("content_type").default("general"), // Content category: 'workflow', 'user_feedback', 'documentation', 'specifications', etc.
  size: integer("size").notNull(), // File size in bytes
  projectId: integer("project_id").notNull().references(() => projects.id),
  status: text("status").notNull().default("processing"), // Processing status: 'processing', 'completed', 'failed'
  metadata: jsonb("metadata"), // Additional structured information about the file
  processed: boolean("processed").default(false), // Flag indicating if AI processing is complete
  createdAt: timestamp("created_at").defaultNow().notNull(),
  // Use snake_case to match the actual database structure
  filePath: text("file_path").notNull(), // Path to the uploaded file
  fileType: text("file_type").notNull(), // Type of file (mimetype)
});

/**
 * Input Data insert validation schema
 * Defines fields required when uploading new input data
 */
export const insertInputDataSchema = createInsertSchema(inputData).pick({
  name: true,
  type: true,
  contentType: true,
  size: true,
  projectId: true,
  status: true,
  metadata: true,
  filePath: true,
  fileType: true,
});

/**
 * Requirements Table - Core entity for project requirements management
 * 
 * Represents a single requirement with its metadata, priority, and 
 * references to source input data. Requirements are the central focus
 * of the application's functionality.
 * 
 * Relationships:
 * - Many-to-one with Project (requirements belong to one project)
 * - Many-to-one with InputData (requirements may be derived from input files)
 * - One-to-many with ImplementationTasks (requirements can have multiple implementation tasks)
 */
export const requirements = pgTable("requirements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // Valid values: 'functional', 'non-functional', 'technical', 'business', etc.
  priority: text("priority").notNull().default("medium"), // Valid values: 'high', 'medium', 'low'
  projectId: integer("project_id").notNull().references(() => projects.id),
  inputDataId: integer("input_data_id").references(() => inputData.id), // Optional, if derived from input data
  acceptanceCriteria: jsonb("acceptance_criteria").default([]), // Array of acceptance criteria items in Gherkin format
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  codeId: text("code_id"), // Requirement identifier (e.g., REQ-001, REQ-002)
  source: text("source"), // Source of the requirement (e.g., 'stakeholder', 'document', 'interview')
  // Multimedia reference storage fields
  videoScenes: jsonb("video_scenes").default([]), // Array of video scene references (timestamps, etc.)
  textReferences: jsonb("text_references").default([]), // Array of text passage references
  audioTimestamps: jsonb("audio_timestamps").default([]), // Array of audio timestamp references
  // AI Expert review data
  expertReview: jsonb("expert_review"), // Contains AI expert evaluation of the requirement quality
});

/**
 * Requirement insert validation schema
 * Defines the fields required when creating a new requirement
 */
export const insertRequirementSchema = createInsertSchema(requirements).pick({
  title: true,
  description: true,
  category: true,
  priority: true,
  projectId: true,
  inputDataId: true,
  acceptanceCriteria: true,
  codeId: true,
  source: true,
  videoScenes: true,
  textReferences: true,
  audioTimestamps: true,
  expertReview: true,
});

/**
 * Activities Table - Audit log for user and system events
 * 
 * Records all significant activities performed by users and automated
 * processes within the system. Used for tracking project history and
 * providing an audit trail.
 * 
 * Relationships:
 * - Many-to-one with User (activities are performed by a user)
 * - Many-to-one with Project (activities occur within a project)
 */
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // Activity type: 'created_project', 'updated_requirement', 'generated_tasks', etc.
  description: text("description").notNull(), // Human-readable description of the activity
  userId: integer("user_id").notNull().references(() => users.id),
  projectId: integer("project_id").notNull().references(() => projects.id),
  relatedEntityId: integer("related_entity_id"), // Optional ID of the entity being acted upon (requirement, task, etc.)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Activity insert validation schema
 * Defines fields required when recording a new activity
 */
export const insertActivitySchema = createInsertSchema(activities).pick({
  type: true,
  description: true,
  userId: true,
  projectId: true,
  relatedEntityId: true,
});

/**
 * Implementation Tasks Table - Detailed work items derived from requirements
 * 
 * Represents specific implementation tasks that need to be completed to
 * fulfill a requirement. Includes tracking for status, priority, complexity,
 * and implementation details.
 * 
 * Relationships:
 * - Many-to-one with Requirement (tasks implement a requirement)
 */
export const implementationTasks = pgTable("implementation_tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("pending"), // Valid values: 'pending', 'in-progress', 'completed', 'blocked'
  priority: text("priority").notNull().default("medium"), // Valid values: 'high', 'medium', 'low'
  system: text("system").notNull(), // Valid values: 'source', 'target', 'both'
  requirementId: integer("requirement_id").notNull().references(() => requirements.id),
  estimatedHours: integer("estimated_hours"), // Estimated effort in hours
  complexity: text("complexity").default("medium"), // Valid values: 'low', 'medium', 'high'
  assignee: text("assignee"), // Name or identifier of person assigned
  taskType: text("task_type"), // Type of task: 'data-mapping', 'workflow', 'ui', 'integration', etc.
  
  // Documentation and implementation guidance
  sfDocumentationLinks: jsonb("sf_documentation_links").default([]), // Array of Salesforce documentation links
  implementationSteps: jsonb("implementation_steps").default([]), // Array of detailed implementation steps
  overallDocumentationLinks: jsonb("overall_documentation_links").default([]), // Array of general documentation links
  
  // Audit fields
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Implementation Task insert validation schema
 * Defines fields required when creating a new implementation task
 */
export const insertImplementationTaskSchema = createInsertSchema(implementationTasks).pick({
  title: true,
  description: true,
  status: true,
  priority: true,
  system: true,
  requirementId: true,
  estimatedHours: true,
  complexity: true,
  assignee: true,
  taskType: true,
  sfDocumentationLinks: true,
  implementationSteps: true,
  overallDocumentationLinks: true,
});

/**
 * Project Role Templates Table - Reusable templates for project roles
 * 
 * Represents predefined role templates that can be automatically applied to new projects.
 * These templates define standard project roles with their associated costs and responsibilities.
 * 
 * Relationships:
 * - None (standalone reference table)
 * - Used as a template source for creating ProjectRole records
 */
export const projectRoleTemplates = pgTable("project_role_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // User-friendly descriptive name (e.g., "Onshore Senior Developer")
  roleType: text("role_type").notNull(), // Functional type (e.g., "Developer", "BA", "QA", "PM", "Architect")
  locationType: text("location_type").notNull(), // Location category (e.g., "Onshore", "Offshore", "Nearshore")
  seniorityLevel: text("seniority_level").notNull(), // Experience level (e.g., "Junior", "Mid-Level", "Senior", "Lead", "Principal")
  description: text("description"), // Detailed description of responsibilities and skills
  costRate: text("cost_rate").notNull(), // Cost associated with this role per unit of effort
  costUnit: text("cost_unit").notNull(), // Unit for the cost rate (e.g., "Hour", "Day", "Story Point", "Sprint")
  currency: text("currency").notNull(), // Currency for the cost rate (e.g., "USD", "EUR")
  isActive: boolean("is_active").default(true).notNull(), // Whether the template is currently available for use
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Project Role Template insert validation schema
 * Defines fields required when creating a new project role template
 */
export const insertProjectRoleTemplateSchema = createInsertSchema(projectRoleTemplates).pick({
  name: true,
  roleType: true,
  locationType: true,
  seniorityLevel: true,
  description: true,
  costRate: true,
  costUnit: true,
  currency: true,
  isActive: true,
});

/**
 * Project Roles Table - Define project personnel roles
 * 
 * Represents the descriptive roles of personnel involved in a migration project.
 * These are used for scoping, costing, and associating with requirements/tasks.
 * Note that these are descriptive labels, not system access roles like 'admin', 'user'.
 * 
 * Relationships:
 * - Many-to-one with Project (a project role belongs to a project)
 * - One-to-many with RequirementRoleEffort (a role can be associated with many requirements)
 * - One-to-many with TaskRoleEffort (a role can be associated with many tasks)
 */
export const projectRoles = pgTable("project_roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // User-friendly descriptive name (e.g., "Onshore Senior Developer")
  roleType: text("role_type").notNull(), // Functional type (e.g., "Developer", "BA", "QA", "PM", "Architect")
  locationType: text("location_type").notNull(), // Location category (e.g., "Onshore", "Offshore", "Nearshore")
  seniorityLevel: text("seniority_level").notNull(), // Experience level (e.g., "Junior", "Mid-Level", "Senior", "Lead", "Principal")
  projectId: integer("project_id").notNull().references(() => projects.id),
  description: text("description"), // Detailed description of responsibilities and skills
  costRate: text("cost_rate").notNull(), // Cost associated with this role per unit of effort
  costUnit: text("cost_unit").notNull(), // Unit for the cost rate (e.g., "Hour", "Day", "Story Point", "Sprint")
  currency: text("currency").notNull(), // Currency for the cost rate (e.g., "USD", "EUR")
  isActive: boolean("is_active").default(true).notNull(), // Whether the role is currently available for assignment
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Project Role insert validation schema
 * Defines fields required when creating a new project role
 */
export const insertProjectRoleSchema = createInsertSchema(projectRoles).pick({
  name: true,
  roleType: true,
  locationType: true,
  seniorityLevel: true,
  projectId: true,
  description: true,
  costRate: true,
  costUnit: true,
  currency: true,
  isActive: true,
});

/**
 * Requirement Role Effort Table - Associate roles with requirements for effort estimation
 * 
 * Represents the effort required from specific roles to implement a requirement.
 * This is used for scoping, planning, and cost estimation.
 * 
 * Relationships:
 * - Many-to-one with Requirement (effort is associated with a requirement)
 * - Many-to-one with ProjectRole (effort is for a specific role)
 */
export const requirementRoleEfforts = pgTable("requirement_role_efforts", {
  id: serial("id").primaryKey(),
  requirementId: integer("requirement_id").notNull().references(() => requirements.id),
  roleId: integer("role_id").notNull().references(() => projectRoles.id),
  estimatedEffort: text("estimated_effort").notNull(), // Estimated effort amount
  effortUnit: text("effort_unit").notNull(), // Unit of effort (e.g., "Hour", "Day", "Story Point", "Sprint")
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Requirement Role Effort insert validation schema
 * Defines fields required when creating a new requirement role effort
 */
export const insertRequirementRoleEffortSchema = createInsertSchema(requirementRoleEfforts).pick({
  requirementId: true,
  roleId: true,
  estimatedEffort: true,
  effortUnit: true,
});

/**
 * Task Role Effort Table - Associate roles with tasks for effort estimation
 * 
 * Represents the effort required from specific roles to implement a task.
 * This is used for detailed planning and cost estimation.
 * 
 * Relationships:
 * - Many-to-one with ImplementationTask (effort is associated with a task)
 * - Many-to-one with ProjectRole (effort is for a specific role)
 */
export const taskRoleEfforts = pgTable("task_role_efforts", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => implementationTasks.id),
  roleId: integer("role_id").notNull().references(() => projectRoles.id),
  estimatedEffort: text("estimated_effort").notNull(), // Estimated effort amount
  effortUnit: text("effort_unit").notNull(), // Unit of effort (e.g., "Hour", "Day", "Story Point", "Sprint")
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Task Role Effort insert validation schema
 * Defines fields required when creating a new task role effort
 */
export const insertTaskRoleEffortSchema = createInsertSchema(taskRoleEfforts).pick({
  taskId: true,
  roleId: true,
  estimatedEffort: true,
  effortUnit: true,
});

/**
 * Application Settings Table - Global application configuration
 * 
 * Stores application-wide settings in a flexible JSON structure.
 * Uses a single row with a JSONB column for maximum flexibility in adding
 * new settings without requiring schema changes.
 * 
 * This approach allows for:
 * 1. Adding new setting categories without schema changes
 * 2. Hierarchical settings organization
 * 3. Type-specific settings validation via Zod
 * 
 * The settings JSON structure is organized by category, for example:
 * {
 *   general: { applicationName: "...", companyName: "...", ... },
 *   auth: { passwordPolicy: { ... }, sessionTimeout: 60, ... },
 *   notifications: { emailNotificationsEnabled: true, ... },
 *   integrations: { aiProvider: "google", aiModel: "gemini-pro", ... },
 *   appearance: { theme: "light", accentColor: "#4F46E5", ... },
 *   security: { ipAllowlist: ["..."], auditLogRetention: 90, ... },
 *   emailConfig: { smtpServer: "...", smtpPort: 587, ... }
 * }
 */
export const applicationSettings = pgTable("application_settings", {
  id: serial("id").primaryKey(),
  settings: jsonb("settings").notNull().default({}), // Flexible JSON structure for all settings
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: integer("updated_by").references(() => users.id), // User who last updated the settings
  version: integer("version").default(1).notNull(), // Schema version for tracking changes
  description: text("description"), // Optional description of the settings configuration
});

/**
 * Application settings insert validation schema
 * Defines the fields required when creating or updating application settings
 */
export const insertApplicationSettingsSchema = createInsertSchema(applicationSettings).pick({
  settings: true,
  updatedBy: true,
  version: true,
  description: true,
});

// Type exports
export type User = InferSelectModel<typeof users>;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export type Invite = typeof invites.$inferSelect;
export type InsertInvite = z.infer<typeof insertInviteSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type InputData = typeof inputData.$inferSelect;
export type InsertInputData = z.infer<typeof insertInputDataSchema>;

export type Requirement = typeof requirements.$inferSelect;
export type InsertRequirement = z.infer<typeof insertRequirementSchema>;

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

export type ImplementationTask = typeof implementationTasks.$inferSelect;
export type InsertImplementationTask = z.infer<typeof insertImplementationTaskSchema>;

export type ProjectRoleTemplate = typeof projectRoleTemplates.$inferSelect;
export type InsertProjectRoleTemplate = z.infer<typeof insertProjectRoleTemplateSchema>;

export type ProjectRole = typeof projectRoles.$inferSelect;
export type InsertProjectRole = z.infer<typeof insertProjectRoleSchema>;

export type RequirementRoleEffort = typeof requirementRoleEfforts.$inferSelect;
export type InsertRequirementRoleEffort = z.infer<typeof insertRequirementRoleEffortSchema>;

export type TaskRoleEffort = typeof taskRoleEfforts.$inferSelect;
export type InsertTaskRoleEffort = z.infer<typeof insertTaskRoleEffortSchema>;

export type ApplicationSettings = typeof applicationSettings.$inferSelect;
export type InsertApplicationSettings = z.infer<typeof insertApplicationSettingsSchema>;

/**
 * Document Templates Table - Reusable document design templates
 * 
 * Stores templates for generating standardized project documents like
 * statements of work, implementation plans, and requirements specifications.
 * 
 * Relationships:
 * - Many-to-one with User (templates are created by a user)
 * - Many-to-one with Project (optional, for project-specific templates)
 * - One-to-many with Documents (templates are used to generate documents)
 * - One-to-many with FieldMappings (templates have field mappings for data population)
 */
export const documentTemplates = pgTable("document_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // Document category: 'sow', 'implementation-plan', 'requirement-spec', etc.
  isGlobal: boolean("is_global").default(true).notNull(), // Flag indicating if template can be used by any project
  userId: integer("user_id").notNull().references(() => users.id),
  projectId: integer("project_id").references(() => projects.id), // null if global template
  template: jsonb("template").notNull(), // PDFMe template structure JSON
  schema: jsonb("schema").notNull(), // Schema definition for template fields
  thumbnail: text("thumbnail"), // Base64 encoded thumbnail image
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Document Template insert validation schema
 * Defines fields required when creating a new document template
 */
export const insertDocumentTemplateSchema = createInsertSchema(documentTemplates).pick({
  name: true,
  description: true,
  category: true,
  isGlobal: true,
  userId: true,
  projectId: true,
  template: true,
  schema: true,
  thumbnail: true,
});

/**
 * Documents Table - Generated project documents
 * 
 * Stores documents generated from templates with custom data.
 * These are the final deliverables like SOWs, implementation plans, etc.
 * 
 * Relationships:
 * - Many-to-one with DocumentTemplate (documents are based on a template)
 * - Many-to-one with Project (documents belong to a project)
 * - Many-to-one with User (documents are created by a user)
 */
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  templateId: integer("template_id").references(() => documentTemplates.id).notNull(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  data: jsonb("data").notNull(), // Form data used to populate the document
  pdfPath: text("pdf_path"), // File path to the generated PDF
  status: text("status").default("draft").notNull(), // Document status: 'draft', 'final', 'archived'
  version: integer("version").default(1).notNull(), // Document version number
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Document insert validation schema
 * Defines fields required when creating a new document
 */
export const insertDocumentSchema = createInsertSchema(documents).pick({
  name: true,
  description: true,
  templateId: true,
  projectId: true,
  userId: true,
  data: true,
  pdfPath: true,
  status: true,
  version: true,
});

/**
 * Field Mappings Table - Maps template fields to data sources
 * 
 * Defines how fields in document templates are populated with data
 * from the system (database) or AI-generated content.
 * 
 * Relationships:
 * - Many-to-one with DocumentTemplate (mappings belong to a template)
 */
export const fieldMappings = pgTable("field_mappings", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // Mapping type: 'database', 'ai-generated'
  templateId: integer("template_id").references(() => documentTemplates.id).notNull(),
  fieldKey: text("field_key").notNull(), // Template field identifier
  
  // Data source configuration
  dataSource: text("data_source"), // Table name or AI prompt type
  dataPath: text("data_path"), // Legacy: JSON path or column name
  columnField: text("column_field"), // Specific column name from the table
  prompt: text("prompt"), // AI prompt template for generated content
  defaultValue: text("default_value"), // Default value if data not found
  
  // Selection configuration
  selectionMode: text("selection_mode").default("single"), // How to handle multiple records: 'single', 'all', 'custom'
  recordId: text("record_id"), // ID of specific record if selectionMode is 'single'
  selectionFilter: text("selection_filter"), // Filter expression if selectionMode is 'custom'
  
  // AI content generation configuration
  includeProject: boolean("include_project").default(true), // Include project data in context
  includeRequirements: boolean("include_requirements").default(true), // Include requirements data in context
  includeTasks: boolean("include_tasks").default(true), // Include implementation tasks in context
  includeCustomer: boolean("include_customer").default(true), // Include customer data in context
  
  // Audit fields
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Field Mapping insert validation schema
 * Defines fields required when creating a new field mapping
 */
export const insertFieldMappingSchema = createInsertSchema(fieldMappings).pick({
  name: true,
  description: true,
  type: true,
  templateId: true,
  fieldKey: true,
  dataSource: true,
  dataPath: true,
  columnField: true,
  prompt: true,
  defaultValue: true,
  selectionMode: true,
  recordId: true,
  selectionFilter: true,
  // AI-specific data source flags
  includeProject: true,
  includeRequirements: true,
  includeTasks: true,
  includeCustomer: true,
});

export type DocumentTemplate = typeof documentTemplates.$inferSelect;
export type InsertDocumentTemplate = z.infer<typeof insertDocumentTemplateSchema>;

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

export type FieldMapping = typeof fieldMappings.$inferSelect;
export type InsertFieldMapping = z.infer<typeof insertFieldMappingSchema>;

/**
 * Workflows Table - Visual process definitions
 * 
 * Stores workflow diagrams that represent business processes, implementation
 * sequences, or other procedural designs. Used for planning and documentation.
 * 
 * Relationships:
 * - Many-to-one with Project (workflows belong to a project)
 */
export const workflows = pgTable("workflows", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  projectId: integer("project_id").notNull().references(() => projects.id),
  version: integer("version").default(1).notNull(), // Version number for tracking changes
  status: text("status").default("draft").notNull(), // Workflow status: 'draft', 'published', 'archived'
  
  // Workflow diagram structure (ReactFlow format)
  nodes: jsonb("nodes").default([]).notNull(), // Array of workflow nodes (tasks, decisions, etc.)
  edges: jsonb("edges").default([]).notNull(), // Array of connections between nodes
  
  // Audit fields
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Workflow insert validation schema
 * Defines fields required when creating a new workflow
 */
export const insertWorkflowSchema = createInsertSchema(workflows).pick({
  name: true,
  description: true,
  projectId: true,
  version: true,
  status: true,
  nodes: true,
  edges: true,
});

/**
 * WorkflowNode Interface - Defines node structure in workflow diagrams
 * 
 * Represents a single step, decision, or endpoint in a workflow diagram.
 * Used for visual representation and may reference project requirements or tasks.
 */
export interface WorkflowNode {
  id: string;
  type: 'task' | 'decision' | 'start' | 'end' | 'subprocess';
  position: { x: number; y: number };
  data: {
    label: string;
    description?: string;
    requirementId?: number; // Optional reference to a requirement
    taskId?: number; // Optional reference to an implementation task
    properties?: Record<string, any>; // Additional custom properties
  };
}

/**
 * WorkflowEdge Interface - Defines edge structure in workflow diagrams
 * 
 * Represents a connection between nodes in a workflow diagram, showing
 * the flow path and conditional logic.
 */
export interface WorkflowEdge {
  id: string;
  source: string; // ID of source node
  target: string; // ID of target node
  label?: string; // Optional label for the connection (e.g., "Yes", "No", "On success")
  type?: 'default' | 'conditional' | 'exception'; // Type of edge connection
  animated?: boolean; // Visual property for animation of the edge line
  style?: Record<string, any>; // Visual styling properties
  data?: Record<string, any>; // Additional data for the edge
}

export type Workflow = typeof workflows.$inferSelect;
export type InsertWorkflow = z.infer<typeof insertWorkflowSchema>;

/**
 * Requirement Comparisons Table - Stores NLI comparison results between requirements
 * 
 * Persists the results of Natural Language Inference comparisons between pairs of
 * requirements, allowing for asynchronous processing and tracking changes over time.
 * 
 * Relationships:
 * - Many-to-one with Project (comparisons belong to a project)
 * - References to Requirements (stored as requirement_id_1 and requirement_id_2)
 */
export const requirementComparisons = pgTable("requirement_comparisons", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  requirementId1: integer("requirement_id_1").notNull().references(() => requirements.id),
  requirementId2: integer("requirement_id_2").notNull().references(() => requirements.id),
  requirementText1: text("requirement_text_1").notNull(), // Store the text at comparison time
  requirementText2: text("requirement_text_2").notNull(), // Store the text at comparison time
  similarityScore: integer("similarity_score").notNull(), // Stored as integer 0-100
  nliContradictionScore: integer("nli_contradiction_score").notNull(), // Stored as integer 0-100
  isContradiction: boolean("is_contradiction").notNull().default(false),
  comparedAt: timestamp("compared_at").defaultNow().notNull(),
});

/**
 * Requirement Comparison insert validation schema
 * Defines fields required when creating a new comparison record
 */
export const insertRequirementComparisonSchema = createInsertSchema(requirementComparisons).pick({
  projectId: true,
  requirementId1: true,
  requirementId2: true,
  requirementText1: true,
  requirementText2: true,
  similarityScore: true,
  nliContradictionScore: true,
  isContradiction: true,
});

export type RequirementComparison = typeof requirementComparisons.$inferSelect;
export type InsertRequirementComparison = z.infer<typeof insertRequirementComparisonSchema>;

/**
 * Requirement Comparison Tasks Table - Tracks async comparison job status
 * 
 * Stores the status of asynchronous processing jobs for requirement comparisons,
 * allowing for progress tracking and result persistence.
 * 
 * Relationships:
 * - Many-to-one with Project (jobs belong to a project)
 */
export const requirementComparisonTasks = pgTable("requirement_comparison_tasks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  status: text("status").notNull().default("pending"), // Valid values: 'pending', 'processing', 'completed', 'failed'
  progress: integer("progress").notNull().default(0), // Progress percentage (0-100)
  totalComparisons: integer("total_comparisons").notNull().default(0), // Total number of comparisons to make
  completedComparisons: integer("completed_comparisons").notNull().default(0), // Number of completed comparisons
  currentRequirement1: integer("current_requirement_1"), // Current requirement being processed (id)
  currentRequirement2: integer("current_requirement_2"), // Current requirement being compared (id)
  error: text("error"), // Error message if status is 'failed'
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"), // Null if not completed
  isCurrent: boolean("is_current").notNull().default(true), // Flag to indicate if this is the most recent task
});

/**
 * Requirement Comparison Task insert validation schema
 * Defines fields required when creating a new comparison task
 */
export const insertRequirementComparisonTaskSchema = createInsertSchema(requirementComparisonTasks).pick({
  projectId: true,
  status: true,
  progress: true,
  totalComparisons: true,
  completedComparisons: true,
  currentRequirement1: true,
  currentRequirement2: true,
  error: true,
  completedAt: true,
  isCurrent: true,
});

export type RequirementComparisonTask = typeof requirementComparisonTasks.$inferSelect;
export type InsertRequirementComparisonTask = z.infer<typeof insertRequirementComparisonTaskSchema>;
