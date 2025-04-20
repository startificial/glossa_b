/**
 * Fix for Password Reset Columns
 * 
 * This script adds missing reset_password_token and reset_password_expires columns to the users table.
 * These columns are needed for password reset functionality.
 */
import { sql } from './server/db.js';

async function fixResetPasswordColumns() {
  try {
    console.log('Checking and adding password reset columns to users table...');
    
    // Check if reset_password_token column exists
    const tokenColumnExists = await checkColumnExists('users', 'reset_password_token');
    if (!tokenColumnExists) {
      console.log('- Adding reset_password_token column to users table');
      await sql`ALTER TABLE users ADD COLUMN reset_password_token TEXT`;
    } else {
      console.log('- reset_password_token column already exists');
    }
    
    // Check if reset_password_expires column exists
    const expiresColumnExists = await checkColumnExists('users', 'reset_password_expires');
    if (!expiresColumnExists) {
      console.log('- Adding reset_password_expires column to users table');
      await sql`ALTER TABLE users ADD COLUMN reset_password_expires TIMESTAMP`;
    } else {
      console.log('- reset_password_expires column already exists');
    }
    
    console.log('Password reset columns fix completed successfully');
  } catch (error) {
    console.error('Error fixing password reset columns:', error);
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

// Run the fix
fixResetPasswordColumns()
  .then(() => {
    console.log('Database schema fix completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Database schema fix failed:', error);
    process.exit(1);
  });