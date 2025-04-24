/**
 * Database Connection Module
 * 
 * This module provides centralized database connection setup using PostgreSQL
 * with the node-postgres driver and Drizzle ORM.
 */
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Validate database URL is provided in environment variables
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL environment variable is not set. Database connection cannot be established.",
  );
}

// Create a connection pool for PostgreSQL
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Log pool events for debugging
pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

pool.on('connect', () => {
  console.log('New connection established to PostgreSQL');
});

/**
 * Utility function to run raw SQL queries
 * This replaces the previous neon SQL template tag
 * @param strings Template strings
 * @param values Values to interpolate
 * @returns Query result
 */
export async function sql(strings: TemplateStringsArray, ...values: any[]) {
  let text = strings[0];
  for (let i = 0; i < values.length; i++) {
    text += `$${i + 1}${strings[i + 1]}`;
  }
  
  try {
    const result = await pool.query(text, values);
    return result.rows;
  } catch (error) {
    console.error('SQL query error:', error);
    throw error;
  }
}

/**
 * Drizzle ORM database instance with schema configuration
 * The primary interface for database interactions in the application
 */
export const db = drizzle(pool, { schema });
