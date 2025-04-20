/**
 * Add Reset Password Columns
 * 
 * This script adds the reset_password_token and reset_password_expires columns
 * to the users table if they don't already exist.
 */
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

async function addResetPasswordColumns() {
  console.log('Adding reset password columns to users table...');
  
  try {
    // Connect to database
    const sql = neon(process.env.DATABASE_URL);
    
    // Check if reset_password_token column exists
    const tokenColumnCheck = await sql`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users'
        AND column_name = 'reset_password_token'
      ) AS exists
    `;
    
    // Add reset_password_token column if it doesn't exist
    if (!tokenColumnCheck[0].exists) {
      console.log('Adding reset_password_token column to users table');
      await sql`ALTER TABLE users ADD COLUMN reset_password_token TEXT`;
      console.log('✅ reset_password_token column added successfully');
    } else {
      console.log('✓ reset_password_token column already exists');
    }
    
    // Check if reset_password_expires column exists
    const expiresColumnCheck = await sql`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users'
        AND column_name = 'reset_password_expires'
      ) AS exists
    `;
    
    // Add reset_password_expires column if it doesn't exist
    if (!expiresColumnCheck[0].exists) {
      console.log('Adding reset_password_expires column to users table');
      await sql`ALTER TABLE users ADD COLUMN reset_password_expires TIMESTAMP`;
      console.log('✅ reset_password_expires column added successfully');
    } else {
      console.log('✓ reset_password_expires column already exists');
    }
    
    console.log('Reset password columns update completed successfully');
  } catch (error) {
    console.error('Error updating reset password columns:', error);
    throw error;
  }
}

// Run the script
addResetPasswordColumns()
  .then(() => {
    console.log('Schema update complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Schema update failed:', error);
    process.exit(1);
  });