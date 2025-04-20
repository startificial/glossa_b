/**
 * HTTP Client Password Update Script
 * 
 * This script uses the same neon HTTP client as the main application
 * to directly update the user's password in the database.
 */
import { neon, neonConfig } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';
import 'dotenv/config';

// Enable connection cache (same as application)
neonConfig.fetchConnectionCache = true;

async function fixPasswordWithHttpClient() {
  try {
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL environment variable is not set');
      return;
    }
    
    const userId = 1; // Demo user
    const newPassword = 'newpassword123'; // New password to set
    
    console.log('Creating Neon HTTP client...');
    const sql = neon(process.env.DATABASE_URL);
    
    // Hash the new password
    console.log('Hashing new password...');
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    console.log(`New hashed password: ${hashedPassword.substring(0, 30)}...`);
    
    // Get current password
    console.log('Getting current user password...');
    const currentResult = await sql`
      SELECT id, username, password 
      FROM users 
      WHERE id = ${userId}
    `;
    
    if (!currentResult || currentResult.length === 0) {
      console.error('User not found');
      return;
    }
    
    console.log(`Current user: ${currentResult[0].username}`);
    console.log(`Current password: ${currentResult[0].password.substring(0, 30)}...`);
    
    // Update password
    console.log('Updating password...');
    const updateResult = await sql`
      UPDATE users 
      SET password = ${hashedPassword}, 
          updated_at = NOW() 
      WHERE id = ${userId} 
      RETURNING id, username, password
    `;
    
    if (!updateResult || updateResult.length === 0) {
      console.error('Update failed - no rows returned');
      return;
    }
    
    console.log(`Update successful for user: ${updateResult[0].username}`);
    console.log(`Updated password in DB: ${updateResult[0].password.substring(0, 30)}...`);
    
    // Verify update was successful
    const verifyResult = await sql`
      SELECT id, username, password 
      FROM users 
      WHERE id = ${userId}
    `;
    
    if (!verifyResult || verifyResult.length === 0) {
      console.error('Verification failed - user not found');
      return;
    }
    
    console.log(`\nVerification check:`);
    console.log(`- Username: ${verifyResult[0].username}`);
    console.log(`- Password in DB: ${verifyResult[0].password.substring(0, 30)}...`);
    
    if (verifyResult[0].password === hashedPassword) {
      console.log('\n✅ SUCCESS: Password was updated correctly');
      
      // Test bcrypt validation
      const isValid = await bcrypt.compare(newPassword, verifyResult[0].password);
      console.log(`Bcrypt validation of new password: ${isValid ? 'SUCCESS' : 'FAILED'}`);
    } else {
      console.error('\n❌ ERROR: Password update did not persist correctly');
      console.log(`Expected: ${hashedPassword.substring(0, 30)}...`);
      console.log(`Actual: ${verifyResult[0].password.substring(0, 30)}...`);
    }
    
  } catch (error) {
    console.error('Error updating password:', error);
  }
}

fixPasswordWithHttpClient()
  .then(() => console.log('\nScript completed'))
  .catch(err => console.error('\nScript failed:', err));