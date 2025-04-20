/**
 * Requirements Table Schema Update Script
 * 
 * This script adds missing columns to the requirements table to align with the current schema.
 * It adds: code_id, video_scenes, text_references, audio_timestamps, and expert_review.
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configure WebSocket connection for Neon serverless
neonConfig.webSocketConstructor = ws;

async function updateRequirementsSchema() {
  console.log('Starting requirements table schema update...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  let client;
  
  try {
    client = await pool.connect();
    console.log('Connected to database');
    
    // Check for each column and add if missing
    await ensureColumnExists(client, 'requirements', 'code_id', 'TEXT');
    await ensureColumnExists(client, 'requirements', 'video_scenes', 'JSONB DEFAULT \'[]\'');
    await ensureColumnExists(client, 'requirements', 'text_references', 'JSONB DEFAULT \'[]\'');
    await ensureColumnExists(client, 'requirements', 'audio_timestamps', 'JSONB DEFAULT \'[]\'');
    await ensureColumnExists(client, 'requirements', 'expert_review', 'JSONB');
    
    console.log('Requirements table schema update completed successfully');
  } catch (error) {
    console.error('Error updating requirements schema:', error);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

async function ensureColumnExists(client, tableName, columnName, columnType) {
  try {
    // Check if column exists
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = $1 
      AND column_name = $2
    `, [tableName, columnName]);
    
    if (columnCheck.rows.length === 0) {
      console.log(`Adding missing column ${columnName} to ${tableName} table...`);
      await client.query(`
        ALTER TABLE ${tableName} 
        ADD COLUMN IF NOT EXISTS ${columnName} ${columnType}
      `);
      console.log(`Column ${columnName} added successfully`);
    } else {
      console.log(`Column ${columnName} already exists in ${tableName} table`);
    }
  } catch (error) {
    console.error(`Error ensuring column ${columnName} exists:`, error);
    throw error;
  }
}

// Run the function
updateRequirementsSchema().catch(console.error);