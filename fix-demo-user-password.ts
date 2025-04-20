/**
 * Fix Demo User Password Script
 * 
 * This script updates the demo user's password in the database
 * to use the correct format compatible with the application's
 * password validation system (scrypt).
 */
import { sql } from './server/db';
import { hashPassword } from './server/utils/password-utils';

async function fixDemoUserPassword() {
  try {
    console.log('Updating demo user password...');
    
    // Check if the demo user exists
    const demoUser = await sql`SELECT id FROM users WHERE username = 'demo'`;
    
    if (!demoUser || demoUser.length === 0) {
      console.log('Demo user not found. Creating demo user...');
      
      // Hash the password with our scrypt implementation
      const hashedPassword = await hashPassword('password');
      
      // Create the demo user
      await sql`
        INSERT INTO users (
          username, 
          password, 
          first_name, 
          last_name, 
          email, 
          company, 
          role
        ) VALUES (
          'demo', 
          ${hashedPassword}, 
          'John', 
          'Doe', 
          'john.doe@example.com', 
          'Demo Company Inc.', 
          'admin'
        )
      `;
      
      console.log('Demo user created successfully with password: password');
    } else {
      // User exists, update the password
      const userId = demoUser[0].id;
      
      // Hash the password with our scrypt implementation
      const hashedPassword = await hashPassword('password');
      
      // Update the password
      await sql`UPDATE users SET password = ${hashedPassword} WHERE id = ${userId}`;
      
      console.log('Demo user password updated successfully to: password');
    }
    
    console.log('Password update completed.');
  } catch (error) {
    console.error('Error updating demo user password:', error);
  } finally {
    // Close the database connection
    process.exit(0);
  }
}

// Execute the function
fixDemoUserPassword();