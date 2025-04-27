/**
 * Database Connection Module
 * 
 * This module provides centralized database connection setup using PostgreSQL
 * with the node-postgres driver and Drizzle ORM.
 */
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from "drizzle-orm";
import * as schema from "@shared/schema";

// Validate database URL is provided in environment variables
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL environment variable is not set. Database connection cannot be established.",
  );
}

// Create a connection pool for PostgreSQL
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Log pool events for debugging
pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

pool.on('connect', () => {
  console.log('New connection established to PostgreSQL');
});

/**
 * Utility function to run raw SQL queries
 * This replaces the previous neon SQL template tag
 * @param strings Template strings
 * @param values Values to interpolate
 * @returns Query result
 */
export async function sql(strings: TemplateStringsArray, ...values: any[]) {
  let text = strings[0];
  for (let i = 0; i < values.length; i++) {
    text += `$${i + 1}${strings[i + 1]}`;
  }
  
  try {
    const result = await pool.query(text, values);
    return result.rows;
  } catch (error) {
    console.error('SQL query error:', error);
    throw error;
  }
}

/**
 * Drizzle ORM database instance with schema configuration
 * The primary interface for database interactions in the application
 */
export const db = drizzle(pool, { schema });

/**
 * Helper function to create a project in the database
 */
export async function createProjectInDb(projectData: schema.InsertProject) {
  try {
    const result = await db.insert(schema.projects).values(projectData).returning();
    return result[0];
  } catch (error) {
    console.error('Error creating project in database:', error);
    throw error;
  }
}

/**
 * Helper function to update a project in the database
 */
export async function updateProjectInDb(projectId: number, projectData: Partial<schema.InsertProject>) {
  try {
    const result = await db.update(schema.projects)
      .set({
        ...projectData,
        updatedAt: new Date()
      })
      .where(eq(schema.projects.id, projectId))
      .returning();
    
    return result[0];
  } catch (error) {
    console.error('Error updating project in database:', error);
    throw error;
  }
}

/**
 * Run database migrations to ensure all tables are created
 */
export async function runMigrations() {
  try {
    console.log('Running database migrations...');
    
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
        "type" VARCHAR(50) NOT NULL DEFAULT 'migration',
        "stage" VARCHAR(50) DEFAULT 'discovery',
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

    // Create customers table if it doesn't exist
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
    
    console.log('Database migrations completed successfully');
  } catch (error) {
    console.error(`Database migration error: ${error}`);
    throw error;
  }
}

/**
 * Initialize database tables if they don't exist
 */
export async function initializeDatabase() {
  try {
    console.log('Initializing database tables...');
    
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
    
    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error(`Database initialization error: ${error}`);
    throw error;
  }
}

/**
 * Create a demo user if one doesn't already exist
 */
async function createDemoUserIfNotExists() {
  try {
    // Import configuration for demo user 
    const { DEMO_USER_CONFIG } = await import('@shared/config');
    
    // Skip if demo user is disabled in configuration
    if (!DEMO_USER_CONFIG.ENABLED) {
      console.log('Demo user creation is disabled in configuration');
      return;
    }
    
    // Check if a user with the configured username already exists
    const existingUser = await sql`SELECT id FROM users WHERE username = ${DEMO_USER_CONFIG.USERNAME}`;
    
    if (!existingUser || existingUser.length === 0) {
      console.log('Creating demo user...');
      
      // Import bcrypt for password hashing
      const bcrypt = await import('bcrypt');
      
      // Hash the password with bcrypt
      const hashedPassword = await bcrypt.hash(DEMO_USER_CONFIG.DEFAULT_PASSWORD, 10);
      
      // Insert demo user with hashed password
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
          true
        )
      `;
      
      console.log('Demo user created successfully');
    } else {
      console.log('Demo user already exists');
    }
  } catch (error) {
    console.error(`Error creating demo user: ${error}`);
    // Don't throw the error, we want to continue initialization
  }
}

// 'eq' is already imported at the top of the file
