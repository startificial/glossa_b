/**
 * Database Connection Compatibility Module
 * 
 * IMPORTANT: This file is maintained for backward compatibility.
 * All new code should import directly from './db.ts'
 */

import { db, sql, pool, createProjectInDb, updateProjectInDb, runMigrations, initializeDatabase } from './db';
import { eq } from 'drizzle-orm';
import * as schema from '@shared/schema';
import { log } from './vite';

// Re-export all database functionality from the central db.ts file
export { db, sql, pool, createProjectInDb, updateProjectInDb, runMigrations, initializeDatabase };