/**
 * Update Demo User Password
 * 
 * This script updates the existing demo user's password to a properly hashed version.
 * It uses bcrypt for secure password hashing.
 */
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

// Hash password with bcrypt
async function hashPassword(password) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

async function main() {
  console.log('Updating demo user password with secure hash...');
  
  try {
    // Connect to database
    const sql = neon(process.env.DATABASE_URL);
    
    // Hash the demo password
    const hashedPassword = await hashPassword('password');
    
    // Update the demo user's password to the hashed version
    const result = await sql`
      UPDATE users 
      SET password = ${hashedPassword} 
      WHERE username = 'demo' 
      RETURNING id, username
    `;
    
    if (result.length > 0) {
      console.log(`✅ Updated password for demo user (ID: ${result[0].id})`);
      console.log('The password is now properly hashed using bcrypt');
    } else {
      console.log('❌ Demo user not found in the database');
    }
  } catch (error) {
    console.error('Error updating demo user password:', error);
  }
}

main()
  .then(() => {
    console.log('Password update process complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('An unexpected error occurred:', error);
    process.exit(1);
  });