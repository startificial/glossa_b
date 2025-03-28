import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema remains untouched
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Project schema
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(),
  userId: integer("user_id").notNull(),
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
  text: text("text").notNull(),
  category: text("category").notNull(), // functional, non-functional, etc.
  priority: text("priority").notNull().default("medium"), // high, medium, low
  projectId: integer("project_id").notNull(),
  inputDataId: integer("input_data_id"), // Optional, if derived from input data
  acceptanceCriteria: jsonb("acceptance_criteria").default([]), // Array of acceptance criteria items
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  codeId: text("code_id").notNull(), // REQ-001, REQ-002, etc.
  source: text("source"), // Source of the requirement
});

export const insertRequirementSchema = createInsertSchema(requirements).pick({
  text: true,
  category: true,
  priority: true,
  projectId: true,
  inputDataId: true,
  acceptanceCriteria: true,
  codeId: true,
  source: true,
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
});

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

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
