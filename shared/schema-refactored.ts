/**
 * Database Schema Module (Refactored)
 * 
 * This module defines the PostgreSQL database schema using Drizzle ORM.
 * It implements a clean, modular approach to schema definition with proper type safety.
 * 
 * The schema follows domain-driven design principles by organizing entities into
 * logical domains with clear relationships and constraints.
 */
import { 
  pgTable, 
  text, 
  serial, 
  integer, 
  boolean, 
  timestamp, 
  jsonb, 
  primaryKey, 
  foreignKey,
  uuid,
  uniqueIndex
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";

/******************************************************************************
 * Core Domain: Authentication & User Management
 ******************************************************************************/

/**
 * User Entity - Core domain entity for authentication and user management
 * 
 * Represents a user in the system with authentication details,
 * profile information, and role-based access control.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  email: text("email").unique(),
  company: text("company"),
  avatarUrl: text("avatar_url"),
  // Use enum values for role to ensure type safety
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  isDemo: boolean("is_demo").default(false),
  invitedBy: integer("invited_by").references(() => users.id),
  resetPasswordToken: text("reset_password_token"),
  resetPasswordExpires: timestamp("reset_password_expires"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Type-safe Zod schema for user insertion
export const insertUserSchema = createInsertSchema(users)
  .omit({ id: true, createdAt: true, updatedAt: true });

// Type-safe TypeScript types for ORM models
export type User = InferSelectModel<typeof users>;
export type InsertUser = z.infer<typeof insertUserSchema>;

/**
 * Invite Entity - Tracks user invitation system
 * 
 * Manages invitations sent to new users to join the system.
 * Each invite has a unique token and tracks status.
 */
export const invites = pgTable("invites", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  email: text("email"),
  createdById: integer("created_by_id").references(() => users.id),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Type-safe Zod schema for invite insertion
export const insertInviteSchema = createInsertSchema(invites)
  .omit({ id: true, createdAt: true });

// Type-safe TypeScript types for ORM models
export type Invite = InferSelectModel<typeof invites>;
export type InsertInvite = z.infer<typeof insertInviteSchema>;

/******************************************************************************
 * Project Domain: Customer & Project Management
 ******************************************************************************/

/**
 * Customer Entity - Organizations that use the system
 * 
 * Represents client organizations for which projects are executed.
 * Stores company details and contact information.
 */
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

// Type-safe Zod schema for customer insertion
export const insertCustomerSchema = createInsertSchema(customers)
  .omit({ id: true, createdAt: true, updatedAt: true });

// Type-safe TypeScript types for ORM models
export type Customer = InferSelectModel<typeof customers>;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

/**
 * Project Entity - Central entity for requirement management
 * 
 * Represents a customer project with source and target system details
 * and all associated requirements and implementation tasks.
 */
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  // Use enum values for project type to ensure type safety
  type: text("type", { 
    enum: ["migration", "implementation", "analysis"] 
  }).notNull(),
  // Use enum values for project stage to ensure type safety
  stage: text("stage", { 
    enum: ["discovery", "planning", "implementation", "closed/won", "closed/lost"] 
  }).default("discovery"),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade" // Add referential integrity constraint
    }),
  customerId: integer("customer_id")
    .references(() => customers.id, {
      onDelete: "set null" // Add referential integrity constraint
    }),
  customer: text("customer"), // Legacy field for backward compatibility
  sourceSystem: text("source_system"),
  targetSystem: text("target_system"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Type-safe Zod schema for project insertion
export const insertProjectSchema = createInsertSchema(projects)
  .omit({ id: true, createdAt: true, updatedAt: true });

// Type-safe TypeScript types for ORM models
export type Project = InferSelectModel<typeof projects>;
export type InsertProject = z.infer<typeof insertProjectSchema>;

/**
 * Input Data Entity - Stores uploaded files and source content
 * 
 * Represents files uploaded by users that serve as the source material
 * for AI-assisted requirement generation.
 */
export const inputData = pgTable("input_data", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  // Use enum values for content type to ensure type safety
  type: text("type", { 
    enum: ["audio", "video", "text", "image"] 
  }).notNull(),
  contentType: text("content_type").default("general"),
  size: integer("size").notNull(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, {
      onDelete: "cascade" // Add referential integrity constraint
    }),
  // Use enum values for status to ensure type safety
  status: text("status", { 
    enum: ["processing", "completed", "failed"] 
  }).notNull().default("processing"),
  metadata: jsonb("metadata"),
  processed: boolean("processed").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  filePath: text("file_path").notNull(),
  fileType: text("file_type").notNull(),
});

// Type-safe Zod schema for input data insertion
export const insertInputDataSchema = createInsertSchema(inputData)
  .omit({ id: true, createdAt: true });

// Type-safe TypeScript types for ORM models
export type InputData = InferSelectModel<typeof inputData>;
export type InsertInputData = z.infer<typeof insertInputDataSchema>;

/******************************************************************************
 * Requirements Domain: Requirements Management
 ******************************************************************************/

/**
 * Requirement Entity - Core entity for project requirements management
 * 
 * Represents a single requirement with its metadata, priority, and 
 * references to source input data.
 */
export const requirements = pgTable("requirements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  // Use enum values for category to ensure type safety
  category: text("category", { 
    enum: ["functional", "non-functional", "technical", "business"] 
  }).notNull(),
  // Use enum values for priority to ensure type safety
  priority: text("priority", { 
    enum: ["high", "medium", "low"] 
  }).notNull().default("medium"),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, {
      onDelete: "cascade" // Add referential integrity constraint
    }),
  inputDataId: integer("input_data_id")
    .references(() => inputData.id, {
      onDelete: "set null" // Add referential integrity constraint
    }),
  acceptanceCriteria: jsonb("acceptance_criteria").default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  codeId: text("code_id"),
  source: text("source"),
  videoScenes: jsonb("video_scenes").default([]),
  textReferences: jsonb("text_references").default([]),
  audioTimestamps: jsonb("audio_timestamps").default([]),
  expertReview: jsonb("expert_review"),
});

// Type-safe Zod schema for requirement insertion
export const insertRequirementSchema = createInsertSchema(requirements)
  .omit({ id: true, createdAt: true, updatedAt: true });

// Type-safe TypeScript types for ORM models
export type Requirement = InferSelectModel<typeof requirements>;
export type InsertRequirement = z.infer<typeof insertRequirementSchema>;

// More entity definitions would follow in the same pattern...
// This is a partial implementation to demonstrate the approach