/**
 * Add Stage Column to Projects Table
 * 
 * This script adds the missing 'stage' column to the projects table
 * if it doesn't already exist. This ensures consistency between the
 * database schema and the application code.
 */

import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

async function addStageColumn() {
  try {
    console.log('Connecting to database...');
    
    // Get database connection URL from environment variables
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    // Create SQL client
    const sql = neon(connectionString);
    
    console.log('Checking if stage column exists in projects table...');
    
    // Check if the stage column already exists
    const checkColumn = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'projects' AND column_name = 'stage'
    `;
    
    if (checkColumn.length === 0) {
      console.log('Stage column does not exist. Adding it now...');
      
      // Add the stage column with a default value
      await sql`
        ALTER TABLE projects 
        ADD COLUMN "stage" VARCHAR(50) DEFAULT 'discovery'
      `;
      
      console.log('Stage column added successfully with default value "discovery"');
    } else {
      console.log('Stage column already exists in projects table');
    }
    
    // Verify the column was added
    const verifyColumn = await sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'projects' AND column_name = 'stage'
    `;
    
    if (verifyColumn.length > 0) {
      console.log('Verification successful:', verifyColumn[0]);
    }
    
    console.log('Schema update completed.');
  } catch (error) {
    console.error('Error adding stage column:', error);
  }
}

// Run the function
addStageColumn()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });