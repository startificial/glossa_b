/**
 * Database Schema Fix Script
 * 
 * This script fixes database schema issues by creating missing tables
 * and adding missing columns to existing tables.
 */
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create SQL client
const sql = neon(process.env.DATABASE_URL);

async function fixDatabase() {
  try {
    console.log('Starting database schema fix...');
    
    // Check if customers table exists
    console.log('Checking customers table...');
    const customersExists = await checkTableExists('customers');
    
    if (!customersExists) {
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
      console.log('Customers table created successfully');
    } else {
      console.log('Customers table already exists');
    }
    
    // Check if projects table exists
    console.log('Checking projects table...');
    const projectsExists = await checkTableExists('projects');
    
    if (!projectsExists) {
      console.log('Creating projects table...');
      await sql`
        CREATE TABLE IF NOT EXISTS "projects" (
          "id" SERIAL PRIMARY KEY,
          "name" TEXT NOT NULL,
          "description" TEXT,
          "type" TEXT NOT NULL,
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
      console.log('Projects table created successfully');
    } else {
      console.log('Projects table already exists');
    }
    
    // Check if activities table exists
    console.log('Checking activities table...');
    const activitiesExists = await checkTableExists('activities');
    
    if (!activitiesExists) {
      console.log('Creating activities table...');
      await sql`
        CREATE TABLE IF NOT EXISTS "activities" (
          "id" SERIAL PRIMARY KEY,
          "project_id" INTEGER,
          "user_id" INTEGER,
          "action" TEXT NOT NULL,
          "entity_type" TEXT NOT NULL,
          "type" TEXT,
          "related_entity_id" INTEGER,
          "details" TEXT,
          "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE,
          FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL
        )
      `;
      console.log('Activities table created successfully');
    } else {
      // Check if the type column exists in activities table
      console.log('Checking if type column exists in activities table...');
      const typeColumnExists = await checkColumnExists('activities', 'type');
      
      if (!typeColumnExists) {
        console.log('Adding type column to activities table...');
        await sql`ALTER TABLE "activities" ADD COLUMN "type" TEXT`;
        console.log('Type column added successfully to activities table');
      } else {
        console.log('Type column already exists in activities table');
      }
    }
    
    // Create demo user if it doesn't exist
    console.log('Checking for demo user...');
    const demoUserExists = await checkDemoUserExists();
    
    if (!demoUserExists) {
      console.log('Creating demo user...');
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
        VALUES (
          'demo',
          '$2b$10$EhuNAZFFbDmvjF7ByX8.8u1c9s3h3WmUSh74GUFY2tzNfNz6iDnbm', -- hashed 'password'
          'John',
          'Doe',
          'demo@example.com',
          'Acme Inc',
          'admin'
        )
      `;
      console.log('Demo user created successfully');
    } else {
      console.log('Demo user already exists');
    }
    
    console.log('Database schema fix completed successfully!');
  } catch (error) {
    console.error('Error fixing database schema:', error);
    throw error;
  }
}

async function checkTableExists(tableName) {
  const result = await sql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = ${tableName}
    )
  `;
  return result[0].exists;
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

async function checkDemoUserExists() {
  const result = await sql`
    SELECT EXISTS (
      SELECT 1 FROM "users" WHERE "username" = 'demo'
    )
  `;
  return result[0].exists;
}

// Run the database fix
fixDatabase().then(() => {
  console.log('Database fix completed successfully');
  process.exit(0);
}).catch((error) => {
  console.error('Database fix failed:', error);
  process.exit(1);
});