/**
 * Database Connection Module
 * 
 * This module provides centralized database connection setup using Neon Serverless
 * PostgreSQL and Drizzle ORM. It configures the connection with performance
 * optimizations and exports both the raw SQL client and the Drizzle database instance.
 */
import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "@shared/schema";

// Enable fetch connection cache for better performance with Neon
neonConfig.fetchConnectionCache = true;

// Validate database URL is provided in environment variables
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL environment variable is not set. Database connection cannot be established.",
  );
}

/**
 * Raw SQL client for Neon Serverless PostgreSQL
 * Used for direct SQL queries when needed outside of Drizzle ORM
 */
export const sql = neon(process.env.DATABASE_URL);

/**
 * Drizzle ORM database instance with schema configuration
 * The primary interface for database interactions in the application
 */
export const db = drizzle(sql, { schema });
