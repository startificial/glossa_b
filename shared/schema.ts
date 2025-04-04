import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
  // Updated fields for the new structure
  highLevelDescription: text("high_level_description"), // Brief overview of the task
  implementationSteps: jsonb("implementation_steps").default([]), // Array of implementation steps
  documentationLinks: jsonb("documentation_links").default([]), // Array of documentation links
  sfDocumentationLinks: jsonb("sf_documentation_links").default([]), // Keeping for backward compatibility
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
  // New fields
  highLevelDescription: true,
  implementationSteps: true,
  documentationLinks: true,
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
