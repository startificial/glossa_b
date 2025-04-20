/**
 * Direct Fix Password Script
 * 
 * This script directly updates a user's password in the database using raw SQL.
 * It handles the hashing of a new password and assigns it to a user record.
 */
import bcrypt from 'bcrypt';
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();
const sql = neon(process.env.DATABASE_URL);

async function fixPasswordDirectly() {
  try {
    console.log('Fixing password directly in the database...');
    
    // Define the username and new password
    const username = 'demo';
    const newPassword = 'password2';
    
    // Generate a bcrypt hash of the new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    console.log(`Generated hashed password: ${hashedPassword.substring(0, 10)}...`);
    
    // Update the password directly in the database
    console.log(`Setting new password for user: ${username}`);
    const updateResult = await sql`
      UPDATE users 
      SET password = ${hashedPassword}, 
          updated_at = NOW() 
      WHERE username = ${username} 
      RETURNING id, username, SUBSTRING(password, 1, 20) as password_prefix
    `;
    
    console.log('Password update result:', updateResult);
    
    // Verify the password was updated correctly
    const userCheck = await sql`
      SELECT id, username, SUBSTRING(password, 1, 20) as password_prefix 
      FROM users 
      WHERE username = ${username}
    `;
    
    console.log('User after update:', userCheck);
    
    // Verify the new password works with the hash
    const fullPasswordResult = await sql`
      SELECT password FROM users WHERE username = ${username}
    `;
    
    const fullPassword = fullPasswordResult[0].password;
    
    // Test that the stored password is valid
    const isNewPasswordMatch = await bcrypt.compare(newPassword, fullPassword);
    console.log(`New password verification: ${isNewPasswordMatch ? 'SUCCESS' : 'FAILED'}`);
    
    // Also verify old password no longer works
    const isOldPasswordMatch = await bcrypt.compare('password1', fullPassword);
    console.log(`Old password verification: ${isOldPasswordMatch ? 'still works (not good)' : 'no longer works (good)'}`);
    
    return isNewPasswordMatch;
  } catch (error) {
    console.error('Error in fix password script:', error);
    return false;
  }
}

// Run the script
fixPasswordDirectly()
  .then(success => {
    console.log(`Password fix ${success ? 'succeeded' : 'failed'}`);
    process.exit(0);
  })
  .catch(error => {
    console.error('Error running fix password script:', error);
    process.exit(1);
  });