/**
 * Direct Password Update Script (ES Module Version)
 *
 * This is a direct script to update a user's password in the database.
 * It bypasses the normal application logic to ensure a clean password update.
 */
import { Pool } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';
import 'dotenv/config';

const run = async () => {
  // PostgreSQL connection pool
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  const userId = 1; // Demo user
  const newPassword = 'newpassword123'; // New password to set
  
  try {
    console.log('Connecting to database...');
    
    // Hash the new password
    console.log('Hashing new password...');
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    console.log(`New hashed password: ${hashedPassword}`);
    
    // Get the current password to verify it's different
    console.log('Getting current password...');
    const current = await pool.query(
      'SELECT id, username, password FROM users WHERE id = $1',
      [userId]
    );
    
    if (current.rows.length === 0) {
      console.error('Error: User not found');
      return;
    }
    
    console.log(`Current password hash: ${current.rows[0].password}`);
    
    // Update the password in the database
    console.log('Updating password in database...');
    const result = await pool.query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2 RETURNING id, username',
      [hashedPassword, userId]
    );
    
    if (result.rows.length === 0) {
      console.error('Error: No user was updated');
      return;
    }
    
    console.log(`Password updated successfully for user: ${result.rows[0].username} (ID: ${result.rows[0].id})`);
    
    // Verify the updated password
    console.log('Verifying password update...');
    const verification = await pool.query(
      'SELECT id, username, password FROM users WHERE id = $1',
      [userId]
    );
    
    if (verification.rows.length === 0) {
      console.error('Error: Could not verify password update');
      return;
    }
    
    const updatedUser = verification.rows[0];
    console.log(`Verified updated password: ${updatedUser.password}`);
    
    // Check if the new password matches what we just set
    if (updatedUser.password !== hashedPassword) {
      console.error('ERROR: Saved password does not match what we attempted to set!');
      console.log(`Expected: ${hashedPassword}`);
      console.log(`Actual: ${updatedUser.password}`);
    } else {
      console.log('SUCCESS: Password in database matches what we attempted to set');
    }
    
    // Verify that bcrypt can validate the password correctly
    console.log('Testing password validation...');
    const isValid = await bcrypt.compare(newPassword, updatedUser.password);
    console.log(`Password validation test result: ${isValid ? 'SUCCESS' : 'FAILURE'}`);
    
    console.log('Password update process complete.');
  } catch (error) {
    console.error('Error updating password:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
};

run()
  .then(() => console.log('Script completed'))
  .catch(err => console.error('Script failed:', err));