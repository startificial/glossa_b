/**
 * Direct Password Update Script
 *
 * This is a direct script to update a user's password in the database.
 * It bypasses the normal application logic to ensure a clean password update.
 */
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function updatePassword() {
  const userId = 1; // Demo user
  const newPassword = 'newpassword123'; // New password to set
  
  try {
    console.log('Connecting to database...');
    
    // Hash the new password
    console.log('Hashing new password...');
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    console.log(`New hashed password: ${hashedPassword.substring(0, 20)}...`);
    
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
    console.log(`Verified updated password: ${updatedUser.password.substring(0, 20)}...`);
    
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
}

updatePassword()
  .then(() => console.log('Script completed'))
  .catch(err => console.error('Script failed:', err));