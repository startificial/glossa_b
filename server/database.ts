import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '@shared/schema';
import { log } from './vite';

// Get database connection URL from environment variables
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Configure neon
neonConfig.fetchConnectionCache = true;

// Create SQL client
const sql = neon(connectionString);
export { sql };

// Create a Neon database connection with Drizzle ORM
export const db = drizzle(sql, { schema });

// Run migrations
export async function runMigrations() {
  try {
    log('Running database migrations...', 'database');
    
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

    // Input Data table
    await sql`
      CREATE TABLE IF NOT EXISTS "input_data" (
        "id" SERIAL PRIMARY KEY,
        "project_id" INTEGER NOT NULL,
        "name" VARCHAR(255) NOT NULL,
        "file_path" VARCHAR(255) NOT NULL,
        "file_type" VARCHAR(50) NOT NULL,
        "content_type" VARCHAR(50),
        "status" VARCHAR(50) NOT NULL DEFAULT 'processing',
        "processed" BOOLEAN NOT NULL DEFAULT FALSE,
        "metadata" JSONB,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE
      )
    `;

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
    
    log('Database migrations completed successfully', 'database');
  } catch (error) {
    log(`Database migration error: ${error}`, 'database');
    throw error;
  }
}

// Initialize database tables if they don't exist
export async function initializeDatabase() {
  try {
    log('Initializing database tables...', 'database');
    
    // Create session table for connect-pg-simple
    await sql`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" jsonb NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
      )
    `;
    
    // Create a demo user if none exists
    await createDemoUserIfNotExists();
    
    log('Database tables initialized successfully', 'database');
  } catch (error) {
    log(`Database initialization error: ${error}`, 'database');
    throw error;
  }
}

// Create a demo user if one doesn't already exist
async function createDemoUserIfNotExists() {
  try {
    // Check if a user with username 'demo' already exists
    const existingUser = await sql`SELECT id FROM users WHERE username = 'demo'`;
    
    if (!existingUser || existingUser.length === 0) {
      log('Creating demo user...', 'database');
      
      // Insert demo user
      await sql`
        INSERT INTO users (
          username, 
          password, 
          first_name, 
          last_name, 
          email, 
          company, 
          role
        ) VALUES (
          'demo', 
          'password', 
          'John', 
          'Doe', 
          'john.doe@example.com', 
          'Demo Company Inc.', 
          'admin'
        )
      `;
      
      log('Demo user created successfully', 'database');
    } else {
      log('Demo user already exists', 'database');
    }
  } catch (error) {
    log(`Error creating demo user: ${error}`, 'database');
    // Don't throw the error, we want to continue initialization
  }
}