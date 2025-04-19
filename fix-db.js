import pkg from 'pg';
const { Pool } = pkg;

// Get the DATABASE_URL from environment variables
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

// Create a new pool using the connection string
const pool = new Pool({ connectionString });

async function fixDatabase() {
  try {
    console.log('Testing connection to PostgreSQL...');
    const client = await pool.connect();
    console.log('Connected to PostgreSQL database');

    // Drop tables in reverse order of dependencies
    console.log('Dropping existing tables...');
    try {
      await client.query('DROP TABLE IF EXISTS "task_role_efforts" CASCADE');
      await client.query('DROP TABLE IF EXISTS "requirement_role_efforts" CASCADE');
      await client.query('DROP TABLE IF EXISTS "implementation_tasks" CASCADE');
      await client.query('DROP TABLE IF EXISTS "requirement_comparisons" CASCADE');
      await client.query('DROP TABLE IF EXISTS "requirement_comparison_tasks" CASCADE');
      await client.query('DROP TABLE IF EXISTS "requirements" CASCADE');
      await client.query('DROP TABLE IF EXISTS "input_data" CASCADE');
      await client.query('DROP TABLE IF EXISTS "activities" CASCADE');
      await client.query('DROP TABLE IF EXISTS "project_roles" CASCADE');
      await client.query('DROP TABLE IF EXISTS "workflows" CASCADE');
      await client.query('DROP TABLE IF EXISTS "documents" CASCADE');
      await client.query('DROP TABLE IF EXISTS "document_templates" CASCADE');
      await client.query('DROP TABLE IF EXISTS "field_mappings" CASCADE');
      await client.query('DROP TABLE IF EXISTS "projects" CASCADE');
      await client.query('DROP TABLE IF EXISTS "invites" CASCADE');
      await client.query('DROP TABLE IF EXISTS "customers" CASCADE');
      await client.query('DROP TABLE IF EXISTS "users" CASCADE');
      await client.query('DROP TABLE IF EXISTS "session" CASCADE');
    } catch (error) {
      console.warn('Error dropping tables:', error.message);
    }

    // Create users table
    console.log('Creating users table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" SERIAL PRIMARY KEY,
        "username" TEXT NOT NULL UNIQUE,
        "password" TEXT NOT NULL,
        "first_name" TEXT,
        "last_name" TEXT,
        "email" TEXT,
        "company" TEXT,
        "avatar_url" TEXT,
        "role" TEXT NOT NULL DEFAULT 'user',
        "invited_by" INTEGER,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create customers table
    console.log('Creating customers table...');
    await client.query(`
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

    // Create invites table
    console.log('Creating invites table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "invites" (
        "id" SERIAL PRIMARY KEY,
        "token" TEXT NOT NULL UNIQUE,
        "email" TEXT,
        "created_by_id" INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
        "expires_at" TIMESTAMP NOT NULL,
        "used" BOOLEAN NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create projects table
    console.log('Creating projects table...');
    await client.query(`
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
    `);

    // Create input_data table
    console.log('Creating input_data table...');
    await client.query(`
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
    `);

    // Create requirements table
    console.log('Creating requirements table...');
    await client.query(`
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
    `);

    // Create activities table
    console.log('Creating activities table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "activities" (
        "id" SERIAL PRIMARY KEY,
        "type" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "project_id" INTEGER NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
        "related_entity_id" INTEGER,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create a demo user if one doesn't already exist
    console.log('Creating demo user...');
    try {
      const userCheck = await client.query('SELECT id FROM users WHERE username = $1', ['demo']);
      
      if (userCheck.rowCount === 0) {
        await client.query(`
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
        `);
        console.log('Demo user created successfully');
      } else {
        console.log('Demo user already exists');
      }
    } catch (error) {
      console.error('Error creating demo user:', error);
    }

    // Create session table for connect-pg-simple
    console.log('Creating session table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" jsonb NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
      )
    `);

    console.log('Database setup completed successfully');

    // Release the client back to the pool
    client.release();
  } catch (error) {
    console.error('Error fixing database:', error);
  } finally {
    // Close the pool to end the process
    await pool.end();
  }
}

// Run the function
fixDatabase()
  .then(() => {
    console.log('Database fixing process complete');
  })
  .catch((error) => {
    console.error('Error in database fixing process:', error);
  });