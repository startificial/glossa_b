/**
 * Database Index Management
 * 
 * This utility file provides functions to manage database indexes
 * to optimize performance for common query patterns.
 */
import { db } from '../db';
import { sql } from 'drizzle-orm';

/**
 * Create necessary indexes for the application
 * This function should be called during application initialization
 */
export async function createOptimizedIndexes(): Promise<void> {
  try {
    console.log('[Database] Creating optimized indexes...');
    
    // Create indexes in a single transaction for atomic operation
    // and avoid partial index creation if an error occurs
    await db.execute(sql`
      -- Index for requirements searches by project_id (very common query in the app)
      CREATE INDEX IF NOT EXISTS idx_requirements_project_id ON requirements (project_id);
      
      -- Index for input_data searches by project_id (used in file listing)
      CREATE INDEX IF NOT EXISTS idx_input_data_project_id ON input_data (project_id);
      
      -- Index for filtering activities by project (dashboard and activity feed)
      CREATE INDEX IF NOT EXISTS idx_activities_project_id ON activities (project_id);
      
      -- Compound index for sorting activities by creation date for recent activity pages
      CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities (created_at DESC);
      
      -- Index for finding implementation tasks by requirement
      CREATE INDEX IF NOT EXISTS idx_implementation_tasks_requirement_id ON implementation_tasks (requirement_id);
      
      -- Useful for text search on requirements (common in search page)
      CREATE INDEX IF NOT EXISTS idx_requirements_title_gin ON requirements USING gin(to_tsvector('english', title));
      CREATE INDEX IF NOT EXISTS idx_requirements_description_gin ON requirements USING gin(to_tsvector('english', description));
      
      -- Index for project search by user (used in dashboard view)
      CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects (user_id);
    `);
    
    console.log('[Database] Indexes created successfully');
  } catch (error) {
    console.error('[Database] Error creating optimized indexes:', error);
    throw error;
  }
}

/**
 * Get information about existing indexes
 * @returns Array of index information
 */
export async function getExistingIndexes(): Promise<any[]> {
  try {
    const result = await db.execute(sql`
      SELECT
        indexname AS "indexName",
        tablename AS "tableName",
        indexdef AS "indexDefinition"
      FROM
        pg_indexes
      WHERE
        schemaname = 'public'
      ORDER BY
        tablename, indexname;
    `);
    
    return result.rows;
  } catch (error) {
    console.error('[Database] Error getting index information:', error);
    throw error;
  }
}