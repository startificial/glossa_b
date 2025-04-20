import { db } from '../db';
import * as schema from '@shared/schema';
import { sql } from '../db';

async function pushSchema() {
  console.log('Pushing schema to database...');
  
  try {
    // Log connected to database
    console.log('Connected to database');
    
    // Create schema in database
    console.log('Creating tables if they do not exist...');

    // Users table
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
    console.log('- Users table created/verified');

    // Invites table
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
    console.log('- Invites table created/verified');

    // Projects table
    await sql`
      CREATE TABLE IF NOT EXISTS "projects" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "user_id" INTEGER NOT NULL,
        "source_system" VARCHAR(255),
        "target_system" VARCHAR(255),
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE
      )
    `;
    console.log('- Projects table created/verified');

    // Input Data table
    await sql`
      CREATE TABLE IF NOT EXISTS "input_data" (
        "id" SERIAL PRIMARY KEY,
        "project_id" INTEGER NOT NULL,
        "name" VARCHAR(255) NOT NULL,
        "filePath" VARCHAR(255) NOT NULL,
        "fileType" VARCHAR(50) NOT NULL,
        "content_type" VARCHAR(50),
        "status" VARCHAR(50) NOT NULL DEFAULT 'processing',
        "processed" BOOLEAN NOT NULL DEFAULT FALSE,
        "metadata" JSONB,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE
      )
    `;
    console.log('- Input Data table created/verified');

    // Requirements table
    await sql`
      CREATE TABLE IF NOT EXISTS "requirements" (
        "id" SERIAL PRIMARY KEY,
        "project_id" INTEGER NOT NULL,
        "input_data_id" INTEGER,
        "title" VARCHAR(255) NOT NULL,
        "description" TEXT NOT NULL,
        "category" VARCHAR(100) NOT NULL,
        "priority" VARCHAR(50) DEFAULT 'medium',
        "source" VARCHAR(255),
        "acceptance_criteria" JSONB,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE,
        FOREIGN KEY ("input_data_id") REFERENCES "input_data" ("id") ON DELETE SET NULL
      )
    `;
    console.log('- Requirements table created/verified');

    // Implementation Tasks table
    await sql`
      CREATE TABLE IF NOT EXISTS "implementation_tasks" (
        "id" SERIAL PRIMARY KEY,
        "requirement_id" INTEGER NOT NULL,
        "title" VARCHAR(255) NOT NULL,
        "description" TEXT NOT NULL,
        "system" VARCHAR(50) NOT NULL,
        "status" VARCHAR(50) DEFAULT 'pending',
        "priority" VARCHAR(50) DEFAULT 'medium',
        "estimated_hours" FLOAT,
        "complexity" VARCHAR(50),
        "assignee" VARCHAR(255),
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("requirement_id") REFERENCES "requirements" ("id") ON DELETE CASCADE
      )
    `;
    console.log('- Implementation Tasks table created/verified');

    // Activities table
    await sql`
      CREATE TABLE IF NOT EXISTS "activities" (
        "id" SERIAL PRIMARY KEY,
        "project_id" INTEGER,
        "user_id" INTEGER,
        "action" VARCHAR(100) NOT NULL,
        "entity_type" VARCHAR(100) NOT NULL,
        "related_entity_id" INTEGER,
        "details" TEXT,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE,
        FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL
      )
    `;
    console.log('- Activities table created/verified');

    // Session table for connect-pg-simple
    await sql`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" VARCHAR NOT NULL COLLATE "default" PRIMARY KEY,
        "sess" JSONB NOT NULL,
        "expire" TIMESTAMP(6) NOT NULL
      )
    `;
    console.log('- Session table created/verified');

    // Document Templates table
    await sql`
      CREATE TABLE IF NOT EXISTS "document_templates" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "category" VARCHAR(100) NOT NULL,
        "is_global" BOOLEAN NOT NULL DEFAULT TRUE,
        "user_id" INTEGER NOT NULL,
        "project_id" INTEGER,
        "template" JSONB NOT NULL,
        "schema" JSONB NOT NULL,
        "thumbnail" TEXT,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE,
        FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE
      )
    `;
    console.log('- Document Templates table created/verified');

    // Documents table
    await sql`
      CREATE TABLE IF NOT EXISTS "documents" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "template_id" INTEGER NOT NULL,
        "project_id" INTEGER NOT NULL,
        "user_id" INTEGER NOT NULL,
        "data" JSONB NOT NULL,
        "pdf_path" TEXT,
        "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
        "version" INTEGER NOT NULL DEFAULT 1,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("template_id") REFERENCES "document_templates" ("id") ON DELETE CASCADE,
        FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE,
        FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE
      )
    `;
    console.log('- Documents table created/verified');

    // Field Mappings table
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
    console.log('- Field Mappings table created/verified');

    console.log('All tables created/verified successfully!');
  } catch (error) {
    console.error('Error pushing schema to database:', error);
    process.exit(1);
  }
}

// Run the migration
pushSchema().then(() => {
  console.log('Schema push completed successfully');
  process.exit(0);
}).catch((error) => {
  console.error('Schema push failed:', error);
  process.exit(1);
});