/**
 * Test Script to Debug Password Issues
 * 
 * This script:
 * 1. Generates a hashed password using bcrypt
 * 2. Updates the password directly in the database
 * 3. Confirms the update was successful
 */
import bcrypt from 'bcrypt';
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();
const sql = neon(process.env.DATABASE_URL);

async function debugPassword() {
  try {
    console.log('Debugging password hashing and storage...');
    
    // Generate a test hashed password
    const testPassword = 'password1';
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(testPassword, saltRounds);
    
    console.log(`Generated hashed password: ${hashedPassword}`);
    console.log(`Password format: ${hashedPassword.substring(0, 10)}...`);
    
    // Update the demo user's password directly in the database
    const result = await sql`
      UPDATE users 
      SET password = ${hashedPassword}, 
          updated_at = NOW() 
      WHERE username = 'demo' 
      RETURNING id, username, SUBSTRING(password, 1, 20) as password_prefix
    `;
    
    console.log('Password update result:', result);
    
    // Verify the password was updated correctly
    const userCheck = await sql`
      SELECT id, username, SUBSTRING(password, 1, 20) as password_prefix 
      FROM users 
      WHERE username = 'demo'
    `;
    
    console.log('User after update:', userCheck);
    
    // Test password verification
    const storedPassword = userCheck[0].password_prefix; // This is just a prefix, but useful for debug display
    console.log(`Stored password prefix: ${storedPassword}`);
    
    // Try to verify the test password against the full hashed password (we would need to fetch it again)
    const fullPasswordResult = await sql`
      SELECT password FROM users WHERE username = 'demo'
    `;
    
    const fullPassword = fullPasswordResult[0].password;
    const isMatch = await bcrypt.compare(testPassword, fullPassword);
    
    console.log(`Password verification result: ${isMatch ? 'SUCCESS' : 'FAILED'}`);
    
    // Also try to verify the original password
    const isOriginalMatch = await bcrypt.compare('password', fullPassword);
    console.log(`Original password verification: ${isOriginalMatch ? 'still valid' : 'no longer works'}`);
    
    return isMatch;
  } catch (error) {
    console.error('Error in debug password script:', error);
    return false;
  }
}

// Run the script
debugPassword()
  .then(success => {
    console.log(`Debug password operation ${success ? 'succeeded' : 'failed'}`);
    process.exit(0);
  })
  .catch(error => {
    console.error('Error running debug password script:', error);
    process.exit(1);
  });