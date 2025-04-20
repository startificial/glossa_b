import pkg from '@neondatabase/serverless';
const { neon } = pkg;
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const sql = neon(process.env.DATABASE_URL);
  try {
    console.log('Checking for missing password reset columns...');
    
    // Check if reset_password_token column exists
    const tokenColumnCheck = await sql`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users'
        AND column_name = 'reset_password_token'
      ) AS exists
    `;
    
    if (!tokenColumnCheck[0].exists) {
      console.log('Adding reset_password_token column to users table');
      await sql`ALTER TABLE users ADD COLUMN reset_password_token TEXT`;
    } else {
      console.log('reset_password_token column already exists');
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
    
    if (!expiresColumnCheck[0].exists) {
      console.log('Adding reset_password_expires column to users table');
      await sql`ALTER TABLE users ADD COLUMN reset_password_expires TIMESTAMP`;
    } else {
      console.log('reset_password_expires column already exists');
    }
    
    console.log('Database schema update completed successfully');
  } catch (error) {
    console.error('Error updating database schema:', error);
    throw error;
  }
}

main()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
