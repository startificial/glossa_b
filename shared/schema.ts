import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { Template as PDFMeTemplate } from "@pdfme/common";

// User schema with extended profile information
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  email: text("email").unique(),
  company: text("company"),
  avatarUrl: text("avatar_url"),
  role: text("role").default("user").notNull(), // user, admin
  invitedBy: integer("invited_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  firstName: true,
  lastName: true,
  email: true,
  company: true,
  avatarUrl: true,
  role: true,
  invitedBy: true,
});

// Customer schema
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  industry: text("industry"),
  backgroundInfo: text("background_info"),
  website: text("website"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCustomerSchema = createInsertSchema(customers).pick({
  name: true,
  description: true,
  industry: true,
  backgroundInfo: true,
  website: true,
  contactEmail: true,
  contactPhone: true,
});

// Invites schema
export const invites = pgTable("invites", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  email: text("email"),
  createdById: integer("created_by_id").references(() => users.id),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInviteSchema = createInsertSchema(invites).pick({
  token: true,
  email: true,
  createdById: true,
  expiresAt: true,
});

// Project schema
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(),
  userId: integer("user_id").notNull(),
  customerId: integer("customer_id").references(() => customers.id), // Reference to customer table
  customer: text("customer"), // Legacy field for backward compatibility
  sourceSystem: text("source_system"), // System being migrated from
  targetSystem: text("target_system"), // System being migrated to
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertProjectSchema = createInsertSchema(projects).pick({
  name: true,
  description: true,
  type: true,
  userId: true,
  customerId: true,
  customer: true,
  sourceSystem: true,
  targetSystem: true,
});

// Input data schema
export const inputData = pgTable("input_data", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // audio, video, text, etc.
  contentType: text("content_type").default("general"), // workflow, user_feedback, documentation, specifications, etc.
  size: integer("size").notNull(), // in bytes
  projectId: integer("project_id").notNull(),
  status: text("status").notNull().default("processing"), // processing, completed, failed
  metadata: jsonb("metadata"), // Additional info about the file
  processed: boolean("processed").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInputDataSchema = createInsertSchema(inputData).pick({
  name: true,
  type: true,
  contentType: true,
  size: true,
  projectId: true,
  status: true,
  metadata: true,
});

// Requirements schema
export const requirements = pgTable("requirements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // functional, non-functional, etc.
  priority: text("priority").notNull().default("medium"), // high, medium, low
  projectId: integer("project_id").notNull(),
  inputDataId: integer("input_data_id"), // Optional, if derived from input data
  acceptanceCriteria: jsonb("acceptance_criteria").default([]), // Array of acceptance criteria items
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  codeId: text("code_id"), // REQ-001, REQ-002, etc.
  source: text("source"), // Source of the requirement
  videoScenes: jsonb("video_scenes").default([]), // Array of video scene references (timestamps, etc.)
  textReferences: jsonb("text_references").default([]), // Array of text passage references
  audioTimestamps: jsonb("audio_timestamps").default([]), // Array of audio timestamp references
});

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
});

// Activity schema
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // created_project, updated_requirement, etc.
  description: text("description").notNull(),
  userId: integer("user_id").notNull(),
  projectId: integer("project_id").notNull(),
  relatedEntityId: integer("related_entity_id"), // Optional
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertActivitySchema = createInsertSchema(activities).pick({
  type: true,
  description: true,
  userId: true,
  projectId: true,
  relatedEntityId: true,
});

// Implementation Tasks schema
export const implementationTasks = pgTable("implementation_tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("pending"), // pending, in-progress, completed, blocked
  priority: text("priority").notNull().default("medium"), // high, medium, low
  system: text("system").notNull(), // source, target, both
  requirementId: integer("requirement_id").notNull(),
  estimatedHours: integer("estimated_hours"), // Optional
  complexity: text("complexity").default("medium"), // low, medium, high
  assignee: text("assignee"), // Optional
  taskType: text("task_type"), // data-mapping, workflow, ui, integration, etc.
  sfDocumentationLinks: jsonb("sf_documentation_links").default([]), // Array of Salesforce documentation links
  implementationSteps: jsonb("implementation_steps").default([]), // Array of detailed implementation steps
  overallDocumentationLinks: jsonb("overall_documentation_links").default([]), // Array of general documentation links
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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

// Type exports
export type User = typeof users.$inferSelect;
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

// Document Template schema
export const documentTemplates = pgTable("document_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // sow, implementation-plan, requirement-spec, etc.
  isGlobal: boolean("is_global").default(true).notNull(), // true if template can be used by any project
  userId: integer("user_id").notNull(),
  projectId: integer("project_id"), // null if global template
  template: jsonb("template").notNull(), // pdfme template structure
  schema: jsonb("schema").notNull(), // schema for the template fields
  thumbnail: text("thumbnail"), // base64 encoded thumbnail
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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

// Document schema (generated documents based on templates)
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  templateId: integer("template_id").references(() => documentTemplates.id).notNull(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  data: jsonb("data").notNull(), // form data used to generate the document
  pdfPath: text("pdf_path"), // path to the generated PDF
  status: text("status").default("draft").notNull(), // draft, final, archived
  version: integer("version").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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

// Field Mapping schema (maps schema fields to AI or DB data sources)
export const fieldMappings = pgTable("field_mappings", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // database, ai-generated
  templateId: integer("template_id").references(() => documentTemplates.id).notNull(),
  fieldKey: text("field_key").notNull(), // the key in the template
  dataSource: text("data_source"), // table name or AI prompt type
  dataPath: text("data_path"), // Legacy: JSON path or column name
  columnField: text("column_field"), // Specific column name from the table
  prompt: text("prompt"), // AI prompt template if AI-generated
  defaultValue: text("default_value"), // default value if data not found
  selectionMode: text("selection_mode").default("single"), // single, all, or custom - how to handle multiple records
  recordId: text("record_id"), // ID of specific record if selectionMode is single
  selectionFilter: text("selection_filter"), // Filter expression if selectionMode is custom
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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
});

export type DocumentTemplate = typeof documentTemplates.$inferSelect;
export type InsertDocumentTemplate = z.infer<typeof insertDocumentTemplateSchema>;

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

export type FieldMapping = typeof fieldMappings.$inferSelect;
export type InsertFieldMapping = z.infer<typeof insertFieldMappingSchema>;
