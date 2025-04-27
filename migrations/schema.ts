import { pgTable, serial, text, timestamp, integer, varchar, jsonb, foreignKey, unique, boolean, doublePrecision } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const customers = pgTable("customers", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	industry: text(),
	backgroundInfo: text("background_info"),
	website: text(),
	contactEmail: text("contact_email"),
	contactPhone: text("contact_phone"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const activities = pgTable("activities", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id"),
	userId: integer("user_id"),
	type: text().default('system').notNull(),
	description: text().default('System activity').notNull(),
	relatedEntityId: integer("related_entity_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const session = pgTable("session", {
	sid: varchar().primaryKey().notNull(),
	sess: jsonb().notNull(),
	expire: timestamp({ precision: 6, mode: 'string' }).notNull(),
});

export const projects = pgTable("projects", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	type: text().default('migration').notNull(),
	userId: integer("user_id").notNull(),
	customerId: integer("customer_id"),
	customer: text(),
	sourceSystem: text("source_system"),
	targetSystem: text("target_system"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	stage: text().default('discovery'),
});

export const invites = pgTable("invites", {
	id: serial().primaryKey().notNull(),
	token: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 255 }),
	createdById: integer("created_by_id"),
	used: boolean().default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.createdById],
			foreignColumns: [users.id],
			name: "invites_created_by_id_fkey"
		}).onDelete("set null"),
	unique("invites_token_key").on(table.token),
]);

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	username: varchar({ length: 255 }).notNull(),
	password: varchar({ length: 255 }).notNull(),
	firstName: varchar("first_name", { length: 255 }),
	lastName: varchar("last_name", { length: 255 }),
	email: varchar({ length: 255 }),
	company: varchar({ length: 255 }),
	avatarUrl: varchar("avatar_url", { length: 255 }),
	role: varchar({ length: 50 }).default('user').notNull(),
	invitedBy: integer("invited_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	resetPasswordToken: text("reset_password_token"),
	resetPasswordExpires: timestamp("reset_password_expires", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	isDemo: boolean("is_demo"),
}, (table) => [
	unique("users_username_key").on(table.username),
]);

export const inputData = pgTable("input_data", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	filePath: varchar("file_path", { length: 255 }).notNull(),
	fileType: varchar("file_type", { length: 50 }).notNull(),
	contentType: varchar("content_type", { length: 50 }),
	status: varchar({ length: 50 }).default('processing').notNull(),
	processed: boolean().default(false).notNull(),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	type: text(),
	size: integer(),
	filePath: text(),
	fileType: text(),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "input_data_project_id_fkey"
		}).onDelete("cascade"),
]);

export const implementationTasks = pgTable("implementation_tasks", {
	id: serial().primaryKey().notNull(),
	requirementId: integer("requirement_id").notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text().notNull(),
	system: varchar({ length: 50 }).notNull(),
	status: varchar({ length: 50 }).default('pending'),
	priority: varchar({ length: 50 }).default('medium'),
	estimatedHours: doublePrecision("estimated_hours"),
	complexity: varchar({ length: 50 }),
	assignee: varchar({ length: 255 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	taskType: text("task_type").default('implementation'),
	sfDocumentationLinks: jsonb("sf_documentation_links").default([]),
	implementationSteps: jsonb("implementation_steps").default([]),
	overallDocumentationLinks: jsonb("overall_documentation_links").default([]),
}, (table) => [
	foreignKey({
			columns: [table.requirementId],
			foreignColumns: [requirements.id],
			name: "implementation_tasks_requirement_id_fkey"
		}).onDelete("cascade"),
]);

export const workflows = pgTable("workflows", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	projectId: integer("project_id").notNull(),
	version: integer().default(1).notNull(),
	status: text().default('draft').notNull(),
	nodes: jsonb().default([]).notNull(),
	edges: jsonb().default([]).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "workflows_project_id_fkey"
		}).onDelete("cascade"),
]);

export const projectRoles = pgTable("project_roles", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	roleType: varchar("role_type", { length: 50 }).notNull(),
	locationType: varchar("location_type", { length: 50 }).notNull(),
	seniorityLevel: varchar("seniority_level", { length: 50 }).notNull(),
	description: text(),
	costRate: varchar("cost_rate", { length: 50 }).notNull(),
	costUnit: varchar("cost_unit", { length: 50 }).notNull(),
	currency: varchar({ length: 10 }).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "project_roles_project_id_fkey"
		}).onDelete("cascade"),
]);

export const requirementRoleEfforts = pgTable("requirement_role_efforts", {
	id: serial().primaryKey().notNull(),
	requirementId: integer("requirement_id").notNull(),
	roleId: integer("role_id").notNull(),
	estimatedEffort: varchar("estimated_effort", { length: 50 }).notNull(),
	effortUnit: varchar("effort_unit", { length: 50 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.requirementId],
			foreignColumns: [requirements.id],
			name: "requirement_role_efforts_requirement_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.roleId],
			foreignColumns: [projectRoles.id],
			name: "requirement_role_efforts_role_id_fkey"
		}).onDelete("cascade"),
]);

export const taskRoleEfforts = pgTable("task_role_efforts", {
	id: serial().primaryKey().notNull(),
	taskId: integer("task_id").notNull(),
	roleId: integer("role_id").notNull(),
	estimatedEffort: varchar("estimated_effort", { length: 50 }).notNull(),
	effortUnit: varchar("effort_unit", { length: 50 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.taskId],
			foreignColumns: [implementationTasks.id],
			name: "task_role_efforts_task_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.roleId],
			foreignColumns: [projectRoles.id],
			name: "task_role_efforts_role_id_fkey"
		}).onDelete("cascade"),
]);

export const applicationSettings = pgTable("application_settings", {
	id: serial().primaryKey().notNull(),
	settings: jsonb().default({}).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedBy: integer("updated_by"),
	version: integer().default(1).notNull(),
	description: text(),
}, (table) => [
	foreignKey({
			columns: [table.updatedBy],
			foreignColumns: [users.id],
			name: "application_settings_updated_by_fkey"
		}),
]);

export const requirements = pgTable("requirements", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	inputDataId: integer("input_data_id"),
	title: varchar({ length: 255 }).notNull(),
	description: text().notNull(),
	category: varchar({ length: 100 }).notNull(),
	priority: varchar({ length: 50 }).default('medium'),
	source: varchar({ length: 255 }),
	codeId: text("code_id"),
	acceptanceCriteria: jsonb("acceptance_criteria"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	videoScenes: jsonb("video_scenes").default([]),
	textReferences: jsonb("text_references").default([]),
	audioTimestamps: jsonb("audio_timestamps").default([]),
	expertReview: jsonb("expert_review"),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "requirements_project_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.inputDataId],
			foreignColumns: [inputData.id],
			name: "requirements_input_data_id_fkey"
		}).onDelete("set null"),
]);

export const projectRoleTemplates = pgTable("project_role_templates", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	roleType: text("role_type").notNull(),
	locationType: text("location_type").notNull(),
	seniorityLevel: text("seniority_level").notNull(),
	description: text(),
	costRate: text("cost_rate").notNull(),
	costUnit: text("cost_unit").notNull(),
	currency: text().notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});
