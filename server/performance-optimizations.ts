/**
 * Performance Optimizations Module
 * 
 * This module applies performance optimizations to the application.
 * It should be called at application startup.
 */
import { db } from './db';
import { sql } from 'drizzle-orm';
import { cacheService } from './services/cache-service';

/**
 * Apply all performance optimizations
 */
export async function applyPerformanceOptimizations(): Promise<void> {
  try {
    console.log('[Performance] Starting performance optimization process...');
    
    // Run optimizations in parallel for efficiency
    await Promise.all([
      createOptimizedIndexes(),
      optimizeDatabaseSettings(),
      primeApplicationCache(),
    ]);
    
    console.log('[Performance] Performance optimizations applied successfully');
  } catch (error) {
    console.error('[Performance] Error applying performance optimizations:', error);
    // Don't throw - we don't want to prevent application startup if optimizations fail
  }
}

/**
 * Create database indexes for common query patterns
 */
async function createOptimizedIndexes(): Promise<void> {
  try {
    console.log('[Performance] Creating optimized database indexes...');
    
    // Create indexes in a single transaction
    await db.execute(sql`
      -- Index for requirements searches by project_id (very common query in the app)
      CREATE INDEX IF NOT EXISTS idx_requirements_project_id ON requirements (project_id);
      
      -- Index for input_data searches by project_id (used in file listing)
      CREATE INDEX IF NOT EXISTS idx_input_data_project_id ON input_data (project_id);
      
      -- Index for filtering activities by project (dashboard and activity feed)
      CREATE INDEX IF NOT EXISTS idx_activities_project_id ON activities (project_id);
      
      -- Compound index for sorting activities by creation date
      CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities (created_at DESC);
      
      -- Index for finding implementation tasks by requirement
      CREATE INDEX IF NOT EXISTS idx_implementation_tasks_requirement_id ON implementation_tasks (requirement_id);
      
      -- Index for project search by user (used in dashboard view)
      CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects (user_id);
    `);
    
    console.log('[Performance] Database indexes created successfully');
  } catch (error) {
    console.error('[Performance] Error creating database indexes:', error);
    throw error;
  }
}

/**
 * Optimize database settings for performance
 */
async function optimizeDatabaseSettings(): Promise<void> {
  try {
    console.log('[Performance] Optimizing database settings...');
    
    // For Neon DB, most settings can't be changed, but we can analyze tables
    await db.execute(sql`ANALYZE;`);
    
    console.log('[Performance] Database settings optimized');
  } catch (error) {
    console.error('[Performance] Error optimizing database settings:', error);
    throw error;
  }
}

/**
 * Prime application cache with frequently accessed data
 */
async function primeApplicationCache(): Promise<void> {
  try {
    console.log('[Performance] Priming application cache...');
    
    // Import configuration for demo user
    const { DEMO_USER_CONFIG } = await import('@shared/config');
    
    // Get the demo user (always needed)
    const demoUserResult = await db.execute(sql`
      SELECT * FROM users WHERE username = ${DEMO_USER_CONFIG.USERNAME} LIMIT 1;
    `);
    
    if (demoUserResult.rows.length > 0) {
      // Cache the demo user
      cacheService.set(`user:username:${DEMO_USER_CONFIG.USERNAME}`, demoUserResult.rows[0], 30 * 60 * 1000); // 30 minutes
      cacheService.set(`user:${demoUserResult.rows[0].id}`, demoUserResult.rows[0], 30 * 60 * 1000);
    }
    
    // Cache recent projects
    const recentProjectsResult = await db.execute(sql`
      SELECT * FROM projects ORDER BY updated_at DESC LIMIT 5;
    `);
    
    cacheService.set('projects:recent', recentProjectsResult.rows, 5 * 60 * 1000); // 5 minutes
    
    // Cache recent activities
    const recentActivitiesResult = await db.execute(sql`
      SELECT * FROM activities ORDER BY created_at DESC LIMIT 10;
    `);
    
    cacheService.set('activities:recent', recentActivitiesResult.rows, 2 * 60 * 1000); // 2 minutes
    
    console.log('[Performance] Application cache primed successfully');
  } catch (error) {
    console.error('[Performance] Error priming application cache:', error);
    throw error;
  }
}

/**
 * Get a summary of applied performance optimizations
 */
export async function getPerformanceOptimizationSummary(): Promise<any> {
  try {
    // Get index information
    const indexResult = await db.execute(sql`
      SELECT
        schemaname || '.' || relname as "table",
        indexrelname as "index",
        idx_scan as "indexScans"
      FROM
        pg_stat_user_indexes
      ORDER BY
        idx_scan DESC
      LIMIT 10;
    `);
    
    // Get table statistics
    const tableResult = await db.execute(sql`
      SELECT
        schemaname || '.' || relname as "table",
        n_live_tup as "rowCount",
        n_tup_ins + n_tup_upd + n_tup_del as "operations"
      FROM
        pg_stat_user_tables
      ORDER BY
        n_live_tup DESC
      LIMIT 10;
    `);
    
    return {
      indexes: indexResult.rows,
      tables: tableResult.rows,
      cacheItems: cacheService.getStats(),
    };
  } catch (error) {
    console.error('[Performance] Error getting optimization summary:', error);
    return {
      indexes: [],
      tables: [],
      cacheItems: { itemCount: 0, totalSize: 0 },
    };
  }
}