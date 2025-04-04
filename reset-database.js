/**
 * Reset Database Script
 * 
 * This script resets the application database by clearing all data while preserving 
 * the demo user account. Use this when you want to start with a clean slate but 
 * still be able to log in with the default user.
 * 
 * === IMPORTANT ===
 * Do not run this script directly. Use the reset-db.mjs script instead, which provides
 * a user-friendly interface and proper error handling:
 * 
 * Usage: 
 *   node reset-db.mjs
 * 
 * This script will:
 * 1. PRESERVE: Demo user account (for login)
 * 2. REMOVE: All customers, projects, input data, requirements, activities, tasks, and invites
 * 3. RESET: All ID sequences to start from 1
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
const { Pool } = pg;
import * as schema from './shared/schema.js';

// Reset function
async function resetDatabase() {
  console.log('🗑️  Database Reset Tool 🗑️');
  console.log('--------------------------------------');
  
  // Check if DATABASE_URL exists
  if (!process.env.DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL environment variable is not set');
    console.log('This tool only works with a PostgreSQL database connection.');
    return;
  }
  
  try {
    // Setup database connection
    console.log('🔌 Connecting to database...');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');
    
    const db = drizzle(pool, { schema });
    
    // Execute cleaning queries
    console.log('🧹 Starting database cleanup...');
    console.log('--------------------------------------');
    
    // Get current counts
    const [
      userCount,
      customerCount,
      projectCount,
      inputDataCount,
      requirementCount,
      activityCount,
      taskCount,
      inviteCount
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM customers'),
      pool.query('SELECT COUNT(*) FROM projects'),
      pool.query('SELECT COUNT(*) FROM input_data'),
      pool.query('SELECT COUNT(*) FROM requirements'),
      pool.query('SELECT COUNT(*) FROM activities'),
      pool.query('SELECT COUNT(*) FROM implementation_tasks'),
      pool.query('SELECT COUNT(*) FROM invites')
    ]);
    
    console.log('📊 Current database state:');
    console.log(`  - Users: ${userCount.rows[0].count}`);
    console.log(`  - Customers: ${customerCount.rows[0].count}`);
    console.log(`  - Projects: ${projectCount.rows[0].count}`);
    console.log(`  - Input Data: ${inputDataCount.rows[0].count}`);
    console.log(`  - Requirements: ${requirementCount.rows[0].count}`);
    console.log(`  - Activities: ${activityCount.rows[0].count}`);
    console.log(`  - Implementation Tasks: ${taskCount.rows[0].count}`);
    console.log(`  - Invites: ${inviteCount.rows[0].count}`);
    console.log('--------------------------------------');
    
    // Start database transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Clear tables in the correct order to respect foreign key constraints
      console.log('🧼 Clearing data...');
      
      // 1. Delete from child tables first
      await client.query('DELETE FROM implementation_tasks');
      console.log('✅ Cleared implementation tasks');
      
      await client.query('DELETE FROM activities');
      console.log('✅ Cleared activities');
      
      await client.query('DELETE FROM requirements');
      console.log('✅ Cleared requirements');
      
      await client.query('DELETE FROM input_data');
      console.log('✅ Cleared input data');
      
      await client.query('DELETE FROM projects');
      console.log('✅ Cleared projects');
      
      await client.query('DELETE FROM customers');
      console.log('✅ Cleared customers');
      
      await client.query('DELETE FROM invites');
      console.log('✅ Cleared invites');
      
      // Reset sequences
      console.log('🔄 Resetting ID sequences...');
      await client.query('ALTER SEQUENCE implementation_tasks_id_seq RESTART WITH 1');
      await client.query('ALTER SEQUENCE activities_id_seq RESTART WITH 1');
      await client.query('ALTER SEQUENCE requirements_id_seq RESTART WITH 1');
      await client.query('ALTER SEQUENCE input_data_id_seq RESTART WITH 1');
      await client.query('ALTER SEQUENCE projects_id_seq RESTART WITH 1');
      await client.query('ALTER SEQUENCE customers_id_seq RESTART WITH 1');
      await client.query('ALTER SEQUENCE invites_id_seq RESTART WITH 1');
      console.log('✅ Reset all ID sequences');
      
      // Commit transaction
      await client.query('COMMIT');
      console.log('✅ Transaction committed successfully');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('❌ Error during database reset, rolling back transaction:', err);
      throw err;
    } finally {
      client.release();
    }
    
    // Verify the cleanup
    const [
      userCountAfter,
      emptyCounts
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM customers) as customers,
          (SELECT COUNT(*) FROM projects) as projects,
          (SELECT COUNT(*) FROM input_data) as input_data,
          (SELECT COUNT(*) FROM requirements) as requirements,
          (SELECT COUNT(*) FROM activities) as activities,
          (SELECT COUNT(*) FROM implementation_tasks) as tasks,
          (SELECT COUNT(*) FROM invites) as invites
      `)
    ]);
    
    console.log('--------------------------------------');
    console.log('📊 Database state after reset:');
    console.log(`  - Users: ${userCountAfter.rows[0].count} (preserved for login)`);
    console.log(`  - Customers: ${emptyCounts.rows[0].customers}`);
    console.log(`  - Projects: ${emptyCounts.rows[0].projects}`);
    console.log(`  - Input Data: ${emptyCounts.rows[0].input_data}`);
    console.log(`  - Requirements: ${emptyCounts.rows[0].requirements}`);
    console.log(`  - Activities: ${emptyCounts.rows[0].activities}`);
    console.log(`  - Implementation Tasks: ${emptyCounts.rows[0].tasks}`);
    console.log(`  - Invites: ${emptyCounts.rows[0].invites}`);
    
    console.log('--------------------------------------');
    console.log('✅ Database reset complete!');
    console.log('The demo user account has been preserved for login.');
    console.log('You can now start creating new customers and projects from scratch.');
    
    // Close pool
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error during database reset:', error);
  }
}

// Run the reset function
resetDatabase();