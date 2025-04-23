CREATE TABLE "activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"user_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"related_entity_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "application_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" integer,
	"version" integer DEFAULT 1 NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"industry" text,
	"background_info" text,
	"website" text,
	"contact_email" text,
	"contact_phone" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"is_global" boolean DEFAULT true NOT NULL,
	"user_id" integer NOT NULL,
	"project_id" integer,
	"template" jsonb NOT NULL,
	"schema" jsonb NOT NULL,
	"thumbnail" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"template_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"data" jsonb NOT NULL,
	"pdf_path" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "field_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" text NOT NULL,
	"template_id" integer NOT NULL,
	"field_key" text NOT NULL,
	"data_source" text,
	"data_path" text,
	"column_field" text,
	"prompt" text,
	"default_value" text,
	"selection_mode" text DEFAULT 'single',
	"record_id" text,
	"selection_filter" text,
	"include_project" boolean DEFAULT true,
	"include_requirements" boolean DEFAULT true,
	"include_tasks" boolean DEFAULT true,
	"include_customer" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "implementation_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"system" text NOT NULL,
	"requirement_id" integer NOT NULL,
	"estimated_hours" integer,
	"complexity" text DEFAULT 'medium',
	"assignee" text,
	"task_type" text,
	"sf_documentation_links" jsonb DEFAULT '[]'::jsonb,
	"implementation_steps" jsonb DEFAULT '[]'::jsonb,
	"overall_documentation_links" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "input_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"content_type" text DEFAULT 'general',
	"size" integer NOT NULL,
	"project_id" integer NOT NULL,
	"status" text DEFAULT 'processing' NOT NULL,
	"metadata" jsonb,
	"processed" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"file_path" text NOT NULL,
	"file_type" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invites" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"email" text,
	"created_by_id" integer,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "project_role_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"role_type" text NOT NULL,
	"location_type" text NOT NULL,
	"seniority_level" text NOT NULL,
	"description" text,
	"cost_rate" text NOT NULL,
	"cost_unit" text NOT NULL,
	"currency" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"role_type" text NOT NULL,
	"location_type" text NOT NULL,
	"seniority_level" text NOT NULL,
	"project_id" integer NOT NULL,
	"description" text,
	"cost_rate" text NOT NULL,
	"cost_unit" text NOT NULL,
	"currency" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" text NOT NULL,
	"stage" text DEFAULT 'discovery',
	"user_id" integer NOT NULL,
	"customer_id" integer,
	"customer" text,
	"source_system" text,
	"target_system" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "requirement_comparison_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"total_comparisons" integer DEFAULT 0 NOT NULL,
	"completed_comparisons" integer DEFAULT 0 NOT NULL,
	"current_requirement_1" integer,
	"current_requirement_2" integer,
	"error" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"is_current" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "requirement_comparisons" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"requirement_id_1" integer NOT NULL,
	"requirement_id_2" integer NOT NULL,
	"requirement_text_1" text NOT NULL,
	"requirement_text_2" text NOT NULL,
	"similarity_score" integer NOT NULL,
	"nli_contradiction_score" integer NOT NULL,
	"is_contradiction" boolean DEFAULT false NOT NULL,
	"compared_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "requirement_role_efforts" (
	"id" serial PRIMARY KEY NOT NULL,
	"requirement_id" integer NOT NULL,
	"role_id" integer NOT NULL,
	"estimated_effort" text NOT NULL,
	"effort_unit" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "requirements" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"project_id" integer NOT NULL,
	"input_data_id" integer,
	"acceptance_criteria" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"code_id" text,
	"source" text,
	"video_scenes" jsonb DEFAULT '[]'::jsonb,
	"text_references" jsonb DEFAULT '[]'::jsonb,
	"audio_timestamps" jsonb DEFAULT '[]'::jsonb,
	"expert_review" jsonb
);
--> statement-breakpoint
CREATE TABLE "task_role_efforts" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"role_id" integer NOT NULL,
	"estimated_effort" text NOT NULL,
	"effort_unit" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"email" text,
	"company" text,
	"avatar_url" text,
	"role" text DEFAULT 'user' NOT NULL,
	"is_demo" boolean DEFAULT false,
	"invited_by" integer,
	"reset_password_token" text,
	"reset_password_expires" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "workflows" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"project_id" integer NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"nodes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"edges" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_settings" ADD CONSTRAINT "application_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_template_id_document_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."document_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_mappings" ADD CONSTRAINT "field_mappings_template_id_document_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."document_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "implementation_tasks" ADD CONSTRAINT "implementation_tasks_requirement_id_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."requirements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "input_data" ADD CONSTRAINT "input_data_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_roles" ADD CONSTRAINT "project_roles_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_comparison_tasks" ADD CONSTRAINT "requirement_comparison_tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_comparisons" ADD CONSTRAINT "requirement_comparisons_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_comparisons" ADD CONSTRAINT "requirement_comparisons_requirement_id_1_requirements_id_fk" FOREIGN KEY ("requirement_id_1") REFERENCES "public"."requirements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_comparisons" ADD CONSTRAINT "requirement_comparisons_requirement_id_2_requirements_id_fk" FOREIGN KEY ("requirement_id_2") REFERENCES "public"."requirements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_role_efforts" ADD CONSTRAINT "requirement_role_efforts_requirement_id_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."requirements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_role_efforts" ADD CONSTRAINT "requirement_role_efforts_role_id_project_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."project_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_input_data_id_input_data_id_fk" FOREIGN KEY ("input_data_id") REFERENCES "public"."input_data"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_role_efforts" ADD CONSTRAINT "task_role_efforts_task_id_implementation_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."implementation_tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_role_efforts" ADD CONSTRAINT "task_role_efforts_role_id_project_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."project_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;