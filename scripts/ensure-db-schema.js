/**
 * Database Schema Synchronization Script
 * 
 * This script ensures that the database schema matches the Drizzle ORM models.
 * It helps maintain schema consistency across different repositories.
 */
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create SQL client
const sql = neon(process.env.DATABASE_URL);

async function ensureDbSchema() {
  try {
    console.log('Starting database schema verification...');
    
    // Create customers table if it doesn't exist
    console.log('Ensuring customers table exists...');
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
    
    // Ensure projects table has all required columns
    console.log('Ensuring projects table has all required columns...');
    
    // First create the table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS "projects" (
        "id" SERIAL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "type" TEXT NOT NULL DEFAULT 'migration',
        "user_id" INTEGER NOT NULL,
        "customer_id" INTEGER,
        "customer" TEXT,
        "source_system" TEXT,
        "target_system" TEXT,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE,
        FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE SET NULL
      )
    `;
    
    // Check if type column exists in projects table
    const typeColumnExistsInProjects = await checkColumnExists('projects', 'type');
    if (!typeColumnExistsInProjects) {
      console.log('Adding type column to projects table...');
      await sql`ALTER TABLE "projects" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'migration'`;
    }
    
    // Check if customer_id column exists in projects table
    const customerIdColumnExistsInProjects = await checkColumnExists('projects', 'customer_id');
    if (!customerIdColumnExistsInProjects) {
      console.log('Adding customer_id column to projects table...');
      await sql`ALTER TABLE "projects" ADD COLUMN "customer_id" INTEGER REFERENCES "customers" ("id") ON DELETE SET NULL`;
    }
    
    // Check if customer column exists in projects table
    const customerColumnExistsInProjects = await checkColumnExists('projects', 'customer');
    if (!customerColumnExistsInProjects) {
      console.log('Adding customer column to projects table...');
      await sql`ALTER TABLE "projects" ADD COLUMN "customer" TEXT`;
    }
    
    // Ensure activities table has all required columns
    console.log('Ensuring activities table has all required columns...');
    
    // First create the table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS "activities" (
        "id" SERIAL PRIMARY KEY,
        "project_id" INTEGER,
        "user_id" INTEGER,
        "type" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "related_entity_id" INTEGER,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE,
        FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL
      )
    `;
    
    // Check if type column exists in activities table
    const typeColumnExistsInActivities = await checkColumnExists('activities', 'type');
    if (!typeColumnExistsInActivities) {
      console.log('Adding type column to activities table...');
      await sql`ALTER TABLE "activities" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'system'`;
    }
    
    // Check if description column exists in activities table
    const descriptionColumnExistsInActivities = await checkColumnExists('activities', 'description');
    if (!descriptionColumnExistsInActivities) {
      console.log('Adding description column to activities table...');
      await sql`ALTER TABLE "activities" ADD COLUMN "description" TEXT NOT NULL DEFAULT 'System activity'`;
    }
    
    console.log('Database schema verification completed successfully!');
  } catch (error) {
    console.error('Error verifying database schema:', error);
    throw error;
  }
}

async function checkColumnExists(tableName, columnName) {
  const result = await sql`
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = ${tableName}
      AND column_name = ${columnName}
    )
  `;
  return result[0].exists;
}

// Run the schema verification
ensureDbSchema().then(() => {
  console.log('Schema verification completed successfully');
  process.exit(0);
}).catch((error) => {
  console.error('Schema verification failed:', error);
  process.exit(1);
});