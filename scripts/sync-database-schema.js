/**
 * Database Schema Synchronization Script
 * 
 * This script ensures all required database tables and columns exist
 * by automatically creating them if missing. Unlike verification scripts,
 * this actively synchronizes the database schema to match the application's
 * required structure rather than just reporting errors.
 */
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configure WebSocket connection for Neon serverless
neonConfig.webSocketConstructor = ws;

// Create SQL client
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function syncDatabaseSchema() {
  console.log('🔄 Starting database schema synchronization...');
  
  try {
    // Check if each required table exists and create if not
    const requiredTables = [
      'users', 'customers', 'projects', 'activities', 
      'input_data', 'requirements', 'implementation_tasks', 'workflows',
      'application_settings'
    ];
    
    for (const tableName of requiredTables) {
      const tableExists = await checkTableExists(tableName);
      if (!tableExists) {
        console.log(`📦 Table '${tableName}' does not exist. Creating it...`);
        await createTable(tableName);
      } else {
        console.log(`✅ Table '${tableName}' exists.`);
        // Ensure all required columns exist
        await ensureTableColumns(tableName);
      }
    }
    
    console.log('✨ Database schema synchronization completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error during schema synchronization:', error);
    return false;
  } finally {
    await pool.end();
  }
}

async function checkTableExists(tableName) {
  const result = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = $1
    )
  `, [tableName]);
  
  return result.rows[0].exists;
}

async function createTable(tableName) {
  switch (tableName) {
    case 'users':
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "users" (
          "id" SERIAL PRIMARY KEY,
          "username" TEXT NOT NULL UNIQUE,
          "password" TEXT NOT NULL,
          "first_name" TEXT,
          "last_name" TEXT,
          "email" TEXT,
          "company" TEXT,
          "role" TEXT NOT NULL DEFAULT 'user',
          "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      break;
      
    case 'customers':
      await pool.query(`
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
      `);
      break;
      
    case 'projects':
      await pool.query(`
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
      `);
      break;
      
    case 'activities':
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "activities" (
          "id" SERIAL PRIMARY KEY,
          "project_id" INTEGER,
          "user_id" INTEGER,
          "type" TEXT NOT NULL DEFAULT 'system',
          "description" TEXT NOT NULL DEFAULT 'System activity',
          "related_entity_id" INTEGER,
          "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE,
          FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL
        )
      `);
      break;
      
    case 'input_data':
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "input_data" (
          "id" SERIAL PRIMARY KEY,
          "project_id" INTEGER NOT NULL,
          "name" TEXT NOT NULL,
          "type" TEXT NOT NULL,
          "size" INTEGER NOT NULL,
          "status" TEXT,
          "content_type" TEXT,
          "metadata" JSONB,
          "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE
        )
      `);
      break;
      
    case 'requirements':
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "requirements" (
          "id" SERIAL PRIMARY KEY,
          "project_id" INTEGER NOT NULL,
          "title" TEXT NOT NULL,
          "description" TEXT NOT NULL,
          "category" TEXT NOT NULL,
          "priority" TEXT NOT NULL DEFAULT 'medium',
          "input_data_id" INTEGER,
          "acceptance_criteria" JSONB,
          "source" TEXT,
          "code_id" TEXT,
          "video_scenes" JSONB,
          "audio_timestamps" JSONB,
          "expert_analysis" JSONB,
          "expert_review" JSONB,
          "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE,
          FOREIGN KEY ("input_data_id") REFERENCES "input_data" ("id") ON DELETE SET NULL
        )
      `);
      break;
    
    case 'implementation_tasks':
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "implementation_tasks" (
          "id" SERIAL PRIMARY KEY,
          "requirement_id" INTEGER NOT NULL,
          "title" TEXT NOT NULL,
          "description" TEXT NOT NULL,
          "status" TEXT DEFAULT 'pending',
          "priority" TEXT DEFAULT 'medium',
          "system" TEXT NOT NULL,
          "estimated_hours" FLOAT,
          "complexity" TEXT DEFAULT 'medium',
          "assignee" TEXT,
          "task_type" TEXT DEFAULT 'implementation',
          "sf_documentation_links" JSONB DEFAULT '[]',
          "implementation_steps" JSONB DEFAULT '[]',
          "overall_documentation_links" JSONB DEFAULT '[]',
          "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("requirement_id") REFERENCES "requirements" ("id") ON DELETE CASCADE
        )
      `);
      break;
      
    case 'workflows':
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "workflows" (
          "id" SERIAL PRIMARY KEY,
          "name" TEXT NOT NULL,
          "description" TEXT,
          "project_id" INTEGER NOT NULL,
          "version" INTEGER DEFAULT 1 NOT NULL,
          "status" TEXT DEFAULT 'draft' NOT NULL,
          "nodes" JSONB DEFAULT '[]' NOT NULL,
          "edges" JSONB DEFAULT '[]' NOT NULL,
          "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE
        )
      `);
      break;
    
    case 'application_settings':
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "application_settings" (
          "id" SERIAL PRIMARY KEY,
          "settings" JSONB NOT NULL DEFAULT '{}',
          "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_by" INTEGER REFERENCES "users" ("id")
        )
      `);
      break;
  }
  
  console.log(`✅ Table '${tableName}' created successfully.`);
}

async function ensureTableColumns(tableName) {
  // Define the required columns for each table
  const requiredColumns = {
    application_settings: [
      { name: 'id', type: 'integer' },
      { name: 'settings', type: 'jsonb' },
      { name: 'updated_at', type: 'timestamp' },
      { name: 'updated_by', type: 'integer' },
      { name: 'version', type: 'integer' },
      { name: 'description', type: 'text' }
    ],
    users: [
      { name: 'id', type: 'integer' },
      { name: 'username', type: 'text' },
      { name: 'password', type: 'text' },
      { name: 'role', type: 'text' },
      { name: 'created_at', type: 'timestamp' },
      { name: 'updated_at', type: 'timestamp' }
    ],
    customers: [
      { name: 'id', type: 'integer' },
      { name: 'name', type: 'text' },
      { name: 'description', type: 'text' },
      { name: 'industry', type: 'text' },
      { name: 'created_at', type: 'timestamp' },
      { name: 'updated_at', type: 'timestamp' }
    ],
    projects: [
      { name: 'id', type: 'integer' },
      { name: 'name', type: 'text' },
      { name: 'description', type: 'text' },
      { name: 'type', type: 'text' },
      { name: 'user_id', type: 'integer' },
      { name: 'customer_id', type: 'integer' },
      { name: 'customer', type: 'text' },
      { name: 'source_system', type: 'text' },
      { name: 'target_system', type: 'text' },
      { name: 'created_at', type: 'timestamp' },
      { name: 'updated_at', type: 'timestamp' }
    ],
    activities: [
      { name: 'id', type: 'integer' },
      { name: 'project_id', type: 'integer' },
      { name: 'user_id', type: 'integer' },
      { name: 'type', type: 'text' },
      { name: 'description', type: 'text' },
      { name: 'related_entity_id', type: 'integer' },
      { name: 'created_at', type: 'timestamp' }
    ],
    input_data: [
      { name: 'id', type: 'integer' },
      { name: 'project_id', type: 'integer' },
      { name: 'name', type: 'text' },
      { name: 'type', type: 'text' },
      { name: 'size', type: 'integer' },
      { name: 'status', type: 'text' },
      { name: 'content_type', type: 'text' },
      { name: 'filePath', type: 'text' },
      { name: 'fileType', type: 'text' },
      { name: 'metadata', type: 'jsonb' },
      { name: 'created_at', type: 'timestamp' }
    ],
    requirements: [
      { name: 'id', type: 'integer' },
      { name: 'project_id', type: 'integer' },
      { name: 'title', type: 'text' },
      { name: 'description', type: 'text' },
      { name: 'category', type: 'text' },
      { name: 'priority', type: 'text' },
      { name: 'input_data_id', type: 'integer' },
      { name: 'acceptance_criteria', type: 'jsonb' },
      { name: 'source', type: 'text' },
      { name: 'code_id', type: 'text' },
      { name: 'video_scenes', type: 'jsonb' },
      { name: 'text_references', type: 'jsonb' },
      { name: 'audio_timestamps', type: 'jsonb' },
      { name: 'expert_review', type: 'jsonb' },
      { name: 'created_at', type: 'timestamp' },
      { name: 'updated_at', type: 'timestamp' }
    ],
    implementation_tasks: [
      { name: 'id', type: 'integer' },
      { name: 'requirement_id', type: 'integer' },
      { name: 'title', type: 'text' },
      { name: 'description', type: 'text' },
      { name: 'status', type: 'text' },
      { name: 'priority', type: 'text' },
      { name: 'system', type: 'text' },
      { name: 'estimated_hours', type: 'float' },
      { name: 'complexity', type: 'text' },
      { name: 'assignee', type: 'text' },
      { name: 'task_type', type: 'text' },
      { name: 'sf_documentation_links', type: 'jsonb' },
      { name: 'implementation_steps', type: 'jsonb' },
      { name: 'overall_documentation_links', type: 'jsonb' },
      { name: 'created_at', type: 'timestamp' },
      { name: 'updated_at', type: 'timestamp' }
    ],
    workflows: [
      { name: 'id', type: 'integer' },
      { name: 'name', type: 'text' },
      { name: 'description', type: 'text' },
      { name: 'project_id', type: 'integer' },
      { name: 'version', type: 'integer' },
      { name: 'status', type: 'text' },
      { name: 'nodes', type: 'jsonb' },
      { name: 'edges', type: 'jsonb' },
      { name: 'created_at', type: 'timestamp' },
      { name: 'updated_at', type: 'timestamp' }
    ]
  };
  
  // Check and add any missing columns
  const columns = requiredColumns[tableName] || [];
  for (const column of columns) {
    const columnExists = await checkColumnExists(tableName, column.name);
    if (!columnExists) {
      console.log(`➕ Adding missing column '${column.name}' to table '${tableName}'...`);
      await addColumnToTable(tableName, column.name, column.type);
    }
  }
}

async function checkColumnExists(tableName, columnName) {
  const result = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = $1
      AND column_name = $2
    )
  `, [tableName, columnName]);
  
  return result.rows[0].exists;
}

async function addColumnToTable(tableName, columnName, columnType) {
  // Default values for common column types
  let defaultValue = '';
  
  if (columnName === 'type' && tableName === 'projects') {
    defaultValue = " DEFAULT 'migration'";
  } else if (columnName === 'type' && tableName === 'activities') {
    defaultValue = " DEFAULT 'system'";
  } else if (columnName === 'description' && tableName === 'activities') {
    defaultValue = " DEFAULT 'System activity'";
  } else if (columnName === 'priority') {
    defaultValue = " DEFAULT 'medium'";
  } else if (columnName === 'status' && tableName === 'implementation_tasks') {
    defaultValue = " DEFAULT 'pending'";
  } else if (columnName === 'complexity' && tableName === 'implementation_tasks') {
    defaultValue = " DEFAULT 'medium'";
  } else if (columnName === 'task_type' && tableName === 'implementation_tasks') {
    defaultValue = " DEFAULT 'implementation'";
  } else if (columnName === 'sf_documentation_links' || columnName === 'implementation_steps' || columnName === 'overall_documentation_links') {
    defaultValue = " DEFAULT '[]'";
  } else if (columnName === 'status' && tableName === 'workflows') {
    defaultValue = " DEFAULT 'draft'";
  } else if (columnName === 'version' && tableName === 'workflows') {
    defaultValue = " DEFAULT 1";
  } else if (columnName === 'version' && tableName === 'application_settings') {
    defaultValue = " DEFAULT 1";
  } else if (columnName === 'description' && tableName === 'application_settings') {
    defaultValue = " DEFAULT 'Initial application settings'";
  } else if (columnName === 'nodes' && tableName === 'workflows') {
    defaultValue = " DEFAULT '[]'";
  } else if (columnName === 'edges' && tableName === 'workflows') {
    defaultValue = " DEFAULT '[]'";
  } else if (columnName === 'video_scenes' || columnName === 'text_references' || columnName === 'audio_timestamps') {
    defaultValue = " DEFAULT '[]'";
  } else if (columnName === 'acceptance_criteria') {
    defaultValue = " DEFAULT '[]'";
  } else if (columnType === 'timestamp') {
    defaultValue = ' DEFAULT CURRENT_TIMESTAMP';
  }
  
  await pool.query(`
    ALTER TABLE "${tableName}" 
    ADD COLUMN IF NOT EXISTS "${columnName}" ${columnType}${defaultValue}
  `);
  
  console.log(`✅ Column '${columnName}' added to table '${tableName}'.`);
}

// Run the synchronization
syncDatabaseSchema().then(success => {
  if (success) {
    console.log('Database schema is now fully synchronized and ready to use.');
    process.exit(0);
  } else {
    console.error('Failed to synchronize database schema.');
    process.exit(1);
  }
});