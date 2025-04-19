/**
 * Database Schema Synchronization Script
 * 
 * This script synchronizes the database schema with the Drizzle ORM models.
 * It ensures that the database structure exactly matches what the application requires.
 */
import { neon, neonConfig } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

// Enable fetch connection cache for better performance with Neon
neonConfig.fetchConnectionCache = true;

// Load environment variables
dotenv.config();

// Create SQL client
const sql = neon(process.env.DATABASE_URL);

async function syncDatabase() {
  try {
    console.log('Database schema synchronization starting...');
    
    // Create users table
    console.log('Creating users table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" SERIAL PRIMARY KEY,
        "username" VARCHAR(255) NOT NULL UNIQUE,
        "password" VARCHAR(255) NOT NULL,
        "first_name" VARCHAR(255),
        "last_name" VARCHAR(255),
        "email" VARCHAR(255),
        "company" VARCHAR(255),
        "avatar_url" VARCHAR(255),
        "role" VARCHAR(50) NOT NULL DEFAULT 'user',
        "invited_by" INTEGER,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create invites table
    console.log('Creating invites table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "invites" (
        "id" SERIAL PRIMARY KEY,
        "token" VARCHAR(255) NOT NULL UNIQUE,
        "email" VARCHAR(255),
        "created_by_id" INTEGER,
        "used" BOOLEAN NOT NULL DEFAULT FALSE,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") ON DELETE SET NULL
      )
    `;
    
    // Create customers table
    console.log('Creating customers table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "customers" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "industry" VARCHAR(255),
        "background_info" TEXT,
        "website" VARCHAR(255),
        "contact_email" VARCHAR(255),
        "contact_phone" VARCHAR(50),
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create projects table
    console.log('Creating projects table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "projects" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "type" VARCHAR(50) NOT NULL,
        "user_id" INTEGER NOT NULL,
        "customer_id" INTEGER,
        "customer" VARCHAR(255),
        "source_system" VARCHAR(255),
        "target_system" VARCHAR(255),
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE,
        FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE SET NULL
      )
    `;
    
    // Create input_data table
    console.log('Creating input_data table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "input_data" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(255) NOT NULL,
        "type" VARCHAR(50) NOT NULL,
        "content_type" VARCHAR(50) DEFAULT 'general',
        "size" INTEGER NOT NULL,
        "project_id" INTEGER NOT NULL,
        "status" VARCHAR(50) NOT NULL DEFAULT 'processing',
        "metadata" JSONB,
        "processed" BOOLEAN DEFAULT FALSE,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE
      )
    `;
    
    // Create requirements table
    console.log('Creating requirements table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "requirements" (
        "id" SERIAL PRIMARY KEY,
        "identifier" VARCHAR(50),
        "title" VARCHAR(255) NOT NULL,
        "description" TEXT NOT NULL,
        "category" VARCHAR(50),
        "priority" VARCHAR(50),
        "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
        "source" VARCHAR(255),
        "project_id" INTEGER NOT NULL,
        "input_data_id" INTEGER,
        "acceptance_criteria" JSONB,
        "metadata" JSONB,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE,
        FOREIGN KEY ("input_data_id") REFERENCES "input_data" ("id") ON DELETE SET NULL
      )
    `;
    
    // Create activities table
    console.log('Creating activities table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "activities" (
        "id" SERIAL PRIMARY KEY,
        "project_id" INTEGER,
        "user_id" INTEGER,
        "action" VARCHAR(100) NOT NULL,
        "entity_type" VARCHAR(100) NOT NULL,
        "type" VARCHAR(100),
        "related_entity_id" INTEGER,
        "details" TEXT,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE,
        FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL
      )
    `;
    
    // Create implementation_tasks table
    console.log('Creating implementation_tasks table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "implementation_tasks" (
        "id" SERIAL PRIMARY KEY,
        "title" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
        "priority" VARCHAR(50),
        "assignee" VARCHAR(255),
        "due_date" TIMESTAMP,
        "project_id" INTEGER NOT NULL,
        "requirement_id" INTEGER,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE,
        FOREIGN KEY ("requirement_id") REFERENCES "requirements" ("id") ON DELETE SET NULL
      )
    `;
    
    // Create document_templates table
    console.log('Creating document_templates table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "document_templates" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "template_type" VARCHAR(50) NOT NULL,
        "schema" JSONB NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create documents table
    console.log('Creating documents table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "documents" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "document_type" VARCHAR(50) NOT NULL,
        "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
        "project_id" INTEGER NOT NULL,
        "template_id" INTEGER,
        "content" JSONB,
        "file_path" VARCHAR(255),
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE,
        FOREIGN KEY ("template_id") REFERENCES "document_templates" ("id") ON DELETE SET NULL
      )
    `;
    
    // Create field_mappings table
    console.log('Creating field_mappings table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "field_mappings" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "type" VARCHAR(50) NOT NULL,
        "template_id" INTEGER NOT NULL,
        "field_key" VARCHAR(255) NOT NULL,
        "data_source" VARCHAR(255),
        "data_path" VARCHAR(255),
        "prompt" TEXT,
        "default_value" TEXT,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("template_id") REFERENCES "document_templates" ("id") ON DELETE CASCADE
      )
    `;
    
    // Create workflows table
    console.log('Creating workflows table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "workflows" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "project_id" INTEGER NOT NULL,
        "nodes" JSONB NOT NULL,
        "edges" JSONB NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE
      )
    `;
    
    // Create requirement_comparisons table
    console.log('Creating requirement_comparisons table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "requirement_comparisons" (
        "id" SERIAL PRIMARY KEY,
        "title" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "project_id" INTEGER NOT NULL,
        "source_requirement_id" INTEGER NOT NULL,
        "target_requirement_id" INTEGER NOT NULL,
        "comparison_type" VARCHAR(50) NOT NULL,
        "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
        "result" JSONB,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE,
        FOREIGN KEY ("source_requirement_id") REFERENCES "requirements" ("id") ON DELETE CASCADE,
        FOREIGN KEY ("target_requirement_id") REFERENCES "requirements" ("id") ON DELETE CASCADE
      )
    `;
    
    // Create requirement_comparison_tasks table
    console.log('Creating requirement_comparison_tasks table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "requirement_comparison_tasks" (
        "id" SERIAL PRIMARY KEY,
        "title" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "comparison_id" INTEGER NOT NULL,
        "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
        "priority" VARCHAR(50),
        "assignee" VARCHAR(255),
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("comparison_id") REFERENCES "requirement_comparisons" ("id") ON DELETE CASCADE
      )
    `;
    
    // Create project_roles table
    console.log('Creating project_roles table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "project_roles" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "project_id" INTEGER NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE
      )
    `;
    
    // Create requirement_role_efforts table
    console.log('Creating requirement_role_efforts table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "requirement_role_efforts" (
        "id" SERIAL PRIMARY KEY,
        "requirement_id" INTEGER NOT NULL,
        "role_id" INTEGER NOT NULL,
        "estimated_effort" VARCHAR(50) NOT NULL,
        "effort_unit" VARCHAR(50) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("requirement_id") REFERENCES "requirements" ("id") ON DELETE CASCADE,
        FOREIGN KEY ("role_id") REFERENCES "project_roles" ("id") ON DELETE CASCADE
      )
    `;
    
    // Create task_role_efforts table
    console.log('Creating task_role_efforts table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "task_role_efforts" (
        "id" SERIAL PRIMARY KEY,
        "task_id" INTEGER NOT NULL,
        "role_id" INTEGER NOT NULL,
        "estimated_effort" VARCHAR(50) NOT NULL,
        "effort_unit" VARCHAR(50) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("task_id") REFERENCES "implementation_tasks" ("id") ON DELETE CASCADE,
        FOREIGN KEY ("role_id") REFERENCES "project_roles" ("id") ON DELETE CASCADE
      )
    `;
    
    // Create a demo user if none exists
    console.log('Creating demo user if none exists...');
    await sql`
      INSERT INTO "users" (
        "username",
        "password",
        "first_name",
        "last_name",
        "email",
        "company",
        "role"
      )
      SELECT
        'demo',
        '$2b$10$EhuNAZFFbDmvjF7ByX8.8u1c9s3h3WmUSh74GUFY2tzNfNz6iDnbm', -- hashed 'password'
        'Demo',
        'User',
        'demo@example.com',
        'Demo Company',
        'admin'
      WHERE NOT EXISTS (
        SELECT 1 FROM "users" WHERE "username" = 'demo'
      )
    `;
    
    console.log('Database schema synchronization completed successfully!');
  } catch (error) {
    console.error('Error synchronizing database schema:', error);
    throw error;
  }
}

// Run the migration
syncDatabase().then(() => {
  console.log('Schema synchronization completed successfully');
  process.exit(0);
}).catch((error) => {
  console.error('Schema synchronization failed:', error);
  process.exit(1);
});