/**
 * Add Password Reset Columns
 * 
 * This script adds the reset_password_token and reset_password_expires columns
 * to the users table if they don't already exist.
 */
import { sql } from '../db.js';

async function updatePasswordColumns() {
  console.log('Checking and adding password reset columns to users table...');
  
  try {
    // Check if reset_password_token column exists
    const tokenColumnExists = await checkColumnExists('users', 'reset_password_token');
    if (!tokenColumnExists) {
      console.log('Adding reset_password_token column to users table');
      await sql`ALTER TABLE users ADD COLUMN reset_password_token TEXT`;
    } else {
      console.log('reset_password_token column already exists');
    }
    
    // Check if reset_password_expires column exists
    const expiresColumnExists = await checkColumnExists('users', 'reset_password_expires');
    if (!expiresColumnExists) {
      console.log('Adding reset_password_expires column to users table');
      await sql`ALTER TABLE users ADD COLUMN reset_password_expires TIMESTAMP`;
    } else {
      console.log('reset_password_expires column already exists');
    }
    
    console.log('Password reset columns updated successfully');
  } catch (error) {
    console.error('Error updating password reset columns:', error);
    throw error;
  }
}

async function checkColumnExists(tableName, columnName) {
  const result = await sql`
    SELECT EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = ${tableName}
      AND column_name = ${columnName}
    ) as exists
  `;
  
  return result[0].exists;
}

// Run the update
updatePasswordColumns()
  .then(() => {
    console.log('Database schema update completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Database schema update failed:', error);
    process.exit(1);
  });