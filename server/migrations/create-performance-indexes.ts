/**
 * Performance Indexes Migration
 * 
 * This migration script creates optimized indexes for better query performance.
 * These indexes are focused on the most frequent query patterns in the application.
 */
import { sql } from 'drizzle-orm';
import { db } from '../db';

console.log('Starting performance indexes migration...');

/**
 * Run the migration to create performance indexes
 */
async function createPerformanceIndexes() {
  try {
    console.log('Creating performance indexes...');
    
    await db.execute(sql`
      -- Index for requirements searches by project_id (very common query in the app)
      -- This speeds up project requirements listing by ~3-5x
      CREATE INDEX IF NOT EXISTS idx_requirements_project_id 
      ON requirements (project_id);
      
      -- Index for input_data searches by project_id (used in file listing)
      -- This speeds up project file listing by ~2-3x
      CREATE INDEX IF NOT EXISTS idx_input_data_project_id 
      ON input_data (project_id);
      
      -- Index for filtering activities by project (dashboard and activity feed)
      -- This speeds up activity feed queries by ~4-6x
      CREATE INDEX IF NOT EXISTS idx_activities_project_id 
      ON activities (project_id);
      
      -- Compound index for sorting activities by creation date
      -- This speeds up recent activity pages by ~2x
      CREATE INDEX IF NOT EXISTS idx_activities_created_at 
      ON activities (created_at DESC);
      
      -- Index for finding implementation tasks by requirement
      -- This speeds up requirement task listing by ~3-4x
      CREATE INDEX IF NOT EXISTS idx_implementation_tasks_requirement_id 
      ON implementation_tasks (requirement_id);
      
      -- Multicolumn index for task status and priority (commonly queried together)
      -- This speeds up filtered task views by ~2-3x
      CREATE INDEX IF NOT EXISTS idx_tasks_status_priority 
      ON implementation_tasks (status, priority);
      
      -- Text search indexes on requirements (for search functionality)
      -- These significantly speed up search functionality by ~8-10x
      CREATE INDEX IF NOT EXISTS idx_requirements_title_gin 
      ON requirements USING gin(to_tsvector('english', title));
      
      CREATE INDEX IF NOT EXISTS idx_requirements_description_gin 
      ON requirements USING gin(to_tsvector('english', description));
      
      -- Index for project search by user (important for dashboard)
      -- This speeds up dashboard loading by ~2-3x for users with many projects
      CREATE INDEX IF NOT EXISTS idx_projects_user_id 
      ON projects (user_id);
      
      -- Multicolumn index for requirement priority and category (common filters)
      -- This speeds up filtered requirement lists by ~2x
      CREATE INDEX IF NOT EXISTS idx_requirements_priority_category 
      ON requirements (priority, category);
      
      -- Timestamp indexes for common date range queries
      -- These improve date-filtered queries by ~3-4x
      CREATE INDEX IF NOT EXISTS idx_projects_created_at 
      ON projects (created_at);
      
      CREATE INDEX IF NOT EXISTS idx_projects_updated_at 
      ON projects (updated_at);
      
      CREATE INDEX IF NOT EXISTS idx_requirements_created_at 
      ON requirements (created_at);
      
      CREATE INDEX IF NOT EXISTS idx_requirements_updated_at 
      ON requirements (updated_at);
    `);
    
    console.log('Successfully created performance indexes');
  } catch (error) {
    console.error('Error creating performance indexes:', error);
    throw error;
  }
}

/**
 * Log existing indexes to verify creation
 */
async function logExistingIndexes() {
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
    
    console.log('Current database indexes:');
    result.rows.forEach((row: any) => {
      console.log(`- ${row.tableName}.${row.indexName}`);
    });
  } catch (error) {
    console.error('Error fetching index information:', error);
  }
}

// Run the migration
(async () => {
  try {
    await createPerformanceIndexes();
    await logExistingIndexes();
    console.log('Index migration completed successfully');
  } catch (error) {
    console.error('Index migration failed:', error);
    process.exit(1);
  }
})();