/**
 * Database Schema Synchronization Script
 * 
 * This script synchronizes the database schema with the Drizzle ORM models.
 * It ensures that the database structure exactly matches what the application requires.
 * It drops and recreates tables to ensure complete sync with the application's schema.
 */
import { sql } from '../server/db';
import fs from 'fs';
import path from 'path';

// Demo user configuration - should match shared/config.ts DEMO_USER_CONFIG
const DEMO_USER_CONFIG = {
  USERNAME: 'demo',
  DEFAULT_PASSWORD: 'password',
  FIRST_NAME: 'Demo',
  LAST_NAME: 'User',
  EMAIL: 'demo@example.com',
  COMPANY: 'Demo Company Inc.',
  ROLE: 'admin',
  IS_DEMO: true
};

async function syncDatabase() {
  console.log('Starting database schema synchronization...');
  
  try {
    // Check if we can connect to the database
    console.log('Testing database connection...');
    const result = await sql`SELECT current_database()`;
    console.log(`Connected to database: ${result[0].current_database}`);
    
    // First drop tables that might have dependency issues
    console.log('Dropping existing tables to ensure a clean schema...');
    
    // Drop tables in reverse order of dependencies
    try {
      await sql`DROP TABLE IF EXISTS "task_role_efforts" CASCADE`;
      await sql`DROP TABLE IF EXISTS "requirement_role_efforts" CASCADE`;
      await sql`DROP TABLE IF EXISTS "implementation_tasks" CASCADE`;
      await sql`DROP TABLE IF EXISTS "requirement_comparisons" CASCADE`;
      await sql`DROP TABLE IF EXISTS "requirement_comparison_tasks" CASCADE`;
      await sql`DROP TABLE IF EXISTS "requirements" CASCADE`;
      await sql`DROP TABLE IF EXISTS "input_data" CASCADE`;
      await sql`DROP TABLE IF EXISTS "activities" CASCADE`;
      await sql`DROP TABLE IF EXISTS "project_roles" CASCADE`;
      await sql`DROP TABLE IF EXISTS "workflows" CASCADE`;
      await sql`DROP TABLE IF EXISTS "documents" CASCADE`;
      await sql`DROP TABLE IF EXISTS "document_templates" CASCADE`;
      await sql`DROP TABLE IF EXISTS "field_mappings" CASCADE`;
      await sql`DROP TABLE IF EXISTS "projects" CASCADE`;
      await sql`DROP TABLE IF EXISTS "invites" CASCADE`;
      await sql`DROP TABLE IF EXISTS "customers" CASCADE`;
      await sql`DROP TABLE IF EXISTS "users" CASCADE`;
    } catch (dropError) {
      console.warn('Error dropping tables, but continuing:', dropError.message);
    }
    
    // Create users table
    console.log('Creating users table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" SERIAL PRIMARY KEY,
        "username" TEXT NOT NULL UNIQUE,
        "password" TEXT NOT NULL,
        "first_name" TEXT,
        "last_name" TEXT,
        "email" TEXT UNIQUE,
        "company" TEXT,
        "avatar_url" TEXT,
        "role" TEXT NOT NULL DEFAULT 'user',
        "invited_by" INTEGER,
        "is_demo" BOOLEAN DEFAULT false,
        "reset_password_token" TEXT,
        "reset_password_expires" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create customers table
    console.log('Creating customers table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "customers" (
        "id" SERIAL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "industry" TEXT,
        "background_info" TEXT,
        "website" TEXT,
        "contact_email" TEXT,
        "contact_phone" TEXT,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create invites table
    console.log('Creating invites table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "invites" (
        "id" SERIAL PRIMARY KEY,
        "token" TEXT NOT NULL UNIQUE,
        "email" TEXT,
        "created_by_id" INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
        "expires_at" TIMESTAMP NOT NULL,
        "used" BOOLEAN NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create projects table
    console.log('Creating projects table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "projects" (
        "id" SERIAL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "type" TEXT NOT NULL,
        "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "customer_id" INTEGER REFERENCES "customers"("id") ON DELETE SET NULL,
        "customer" TEXT,
        "source_system" TEXT,
        "target_system" TEXT,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create input_data table
    console.log('Creating input_data table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "input_data" (
        "id" SERIAL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "content_type" TEXT DEFAULT 'general',
        "size" INTEGER NOT NULL,
        "project_id" INTEGER NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
        "status" TEXT NOT NULL DEFAULT 'processing',
        "metadata" JSONB,
        "processed" BOOLEAN DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create requirements table
    console.log('Creating requirements table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "requirements" (
        "id" SERIAL PRIMARY KEY,
        "title" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "category" TEXT NOT NULL,
        "priority" TEXT NOT NULL DEFAULT 'medium',
        "project_id" INTEGER NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
        "input_data_id" INTEGER REFERENCES "input_data"("id") ON DELETE SET NULL,
        "acceptance_criteria" JSONB DEFAULT '[]',
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "code_id" TEXT,
        "source" TEXT,
        "video_scenes" JSONB DEFAULT '[]',
        "text_references" JSONB DEFAULT '[]',
        "audio_timestamps" JSONB DEFAULT '[]',
        "expert_review" JSONB
      )
    `;
    
    // Create activities table
    console.log('Creating activities table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "activities" (
        "id" SERIAL PRIMARY KEY,
        "type" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "project_id" INTEGER NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
        "related_entity_id" INTEGER,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create implementation_tasks table
    console.log('Creating implementation_tasks table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "implementation_tasks" (
        "id" SERIAL PRIMARY KEY,
        "title" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "priority" TEXT NOT NULL DEFAULT 'medium',
        "system" TEXT NOT NULL,
        "requirement_id" INTEGER NOT NULL REFERENCES "requirements"("id") ON DELETE CASCADE,
        "estimated_hours" INTEGER,
        "complexity" TEXT DEFAULT 'medium',
        "assignee" TEXT,
        "task_type" TEXT,
        "sf_documentation_links" JSONB DEFAULT '[]',
        "implementation_steps" JSONB DEFAULT '[]',
        "overall_documentation_links" JSONB DEFAULT '[]',
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create project_roles table
    console.log('Creating project_roles table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "project_roles" (
        "id" SERIAL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "role_type" TEXT NOT NULL,
        "location_type" TEXT NOT NULL,
        "seniority_level" TEXT NOT NULL,
        "project_id" INTEGER NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
        "description" TEXT,
        "cost_rate" TEXT NOT NULL,
        "cost_unit" TEXT NOT NULL,
        "currency" TEXT NOT NULL,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create requirement_role_efforts table
    console.log('Creating requirement_role_efforts table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "requirement_role_efforts" (
        "id" SERIAL PRIMARY KEY,
        "requirement_id" INTEGER NOT NULL REFERENCES "requirements"("id") ON DELETE CASCADE,
        "role_id" INTEGER NOT NULL REFERENCES "project_roles"("id") ON DELETE CASCADE,
        "estimated_effort" TEXT NOT NULL,
        "effort_unit" TEXT NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create task_role_efforts table
    console.log('Creating task_role_efforts table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "task_role_efforts" (
        "id" SERIAL PRIMARY KEY,
        "task_id" INTEGER NOT NULL REFERENCES "implementation_tasks"("id") ON DELETE CASCADE,
        "role_id" INTEGER NOT NULL REFERENCES "project_roles"("id") ON DELETE CASCADE,
        "estimated_effort" TEXT NOT NULL,
        "effort_unit" TEXT NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create workflows table
    console.log('Creating workflows table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "workflows" (
        "id" SERIAL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "project_id" INTEGER NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
        "nodes" JSONB NOT NULL DEFAULT '[]',
        "edges" JSONB NOT NULL DEFAULT '[]',
        "type" TEXT NOT NULL DEFAULT 'process',
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create document_templates table
    console.log('Creating document_templates table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "document_templates" (
        "id" SERIAL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "category" TEXT,
        "user_id" INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
        "template_data" JSONB NOT NULL,
        "schema_version" TEXT,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create documents table
    console.log('Creating documents table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "documents" (
        "id" SERIAL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "project_id" INTEGER NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
        "template_id" INTEGER REFERENCES "document_templates"("id") ON DELETE SET NULL,
        "generated_file_path" TEXT,
        "status" TEXT NOT NULL DEFAULT 'draft',
        "form_data" JSONB,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create field_mappings table
    console.log('Creating field_mappings table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "field_mappings" (
        "id" SERIAL PRIMARY KEY,
        "template_id" INTEGER NOT NULL REFERENCES "document_templates"("id") ON DELETE CASCADE,
        "field_name" TEXT NOT NULL,
        "entity_type" TEXT NOT NULL,
        "entity_field" TEXT NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create requirement comparisons table
    console.log('Creating requirement_comparisons table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "requirement_comparisons" (
        "id" SERIAL PRIMARY KEY,
        "project_id" INTEGER NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
        "requirement1_id" INTEGER NOT NULL REFERENCES "requirements"("id") ON DELETE CASCADE,
        "requirement2_id" INTEGER NOT NULL REFERENCES "requirements"("id") ON DELETE CASCADE,
        "similarity_score" REAL NOT NULL,
        "comparison_type" TEXT NOT NULL DEFAULT 'semantic',
        "generated_explanation" TEXT,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create requirement comparison tasks table
    console.log('Creating requirement_comparison_tasks table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "requirement_comparison_tasks" (
        "id" SERIAL PRIMARY KEY,
        "project_id" INTEGER NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "total_requirements" INTEGER,
        "processed_requirements" INTEGER DEFAULT 0,
        "comparison_threshold" REAL DEFAULT 0.7,
        "is_current" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create a demo user if one doesn't already exist
    console.log('Creating demo user if not exists...');
    const existingUser = await sql`SELECT id FROM users WHERE username = ${DEMO_USER_CONFIG.USERNAME}`;
    
    if (!existingUser || existingUser.length === 0) {
      // Import bcrypt for password hashing
      const bcrypt = await import('bcrypt');
      
      // Hash the password with bcrypt
      const hashedPassword = await bcrypt.default.hash(DEMO_USER_CONFIG.DEFAULT_PASSWORD, 10);
      
      await sql`
        INSERT INTO users (
          username, 
          password, 
          first_name, 
          last_name, 
          email, 
          company, 
          role,
          is_demo
        ) VALUES (
          ${DEMO_USER_CONFIG.USERNAME}, 
          ${hashedPassword}, 
          ${DEMO_USER_CONFIG.FIRST_NAME}, 
          ${DEMO_USER_CONFIG.LAST_NAME}, 
          ${DEMO_USER_CONFIG.EMAIL}, 
          ${DEMO_USER_CONFIG.COMPANY}, 
          ${DEMO_USER_CONFIG.ROLE},
          ${DEMO_USER_CONFIG.IS_DEMO}
        )
      `;
      console.log('Demo user created successfully with hashed password');
    } else {
      console.log('Demo user already exists');
    }
    
    console.log('Database schema synchronization completed successfully!');
  } catch (error) {
    console.error('Error synchronizing database schema:', error);
    throw error;
  }
}

// Execute the synchronization
syncDatabase()
  .then(() => {
    console.log('Database synchronization complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Database synchronization failed:', error);
    process.exit(1);
  });