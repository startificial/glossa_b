/**
 * Database Query Analyzer
 * 
 * This utility analyzes database query performance to identify
 * slow operations and optimization opportunities.
 */
import { sql } from 'drizzle-orm';
import { db } from '../db';

/**
 * Query statistics information
 */
interface QueryStats {
  query: string;
  calls: number;
  totalTime: number;
  minTime: number;
  maxTime: number;
  meanTime: number;
  rows: number;
  sharedBlksHit: number;
  sharedBlksRead: number;
  planTime?: number;
  executionTime?: number;
}

/**
 * Find slow queries by analyzing pg_stat_statements
 */
async function findSlowQueries(limit: number = 10): Promise<QueryStats[]> {
  try {
    console.log('[QueryAnalyzer] Finding slow queries...');
    
    // First ensure pg_stat_statements extension is available
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_stat_statements;`);
    
    // Query the pg_stat_statements view for slow queries
    const result = await db.execute(sql`
      SELECT
        query,
        calls,
        total_exec_time as "totalTime",
        min_exec_time as "minTime",
        max_exec_time as "maxTime",
        mean_exec_time as "meanTime",
        rows,
        shared_blks_hit as "sharedBlksHit",
        shared_blks_read as "sharedBlksRead"
      FROM
        pg_stat_statements
      WHERE
        query !~ '^\\s*(BEGIN|COMMIT|ROLLBACK|SET|SHOW|ALTER|CREATE|ANALYZE)\\b'
        AND query !~ '(pg_stat_statements|pg_stats|pg_catalog)'
      ORDER BY
        mean_exec_time DESC
      LIMIT ${limit};
    `);
    
    return result.rows as QueryStats[];
  } catch (error) {
    console.error('[QueryAnalyzer] Error finding slow queries:', error);
    return [];
  }
}

/**
 * Reset query statistics
 */
async function resetQueryStatistics(): Promise<void> {
  try {
    console.log('[QueryAnalyzer] Resetting query statistics...');
    await db.execute(sql`SELECT pg_stat_statements_reset();`);
    console.log('[QueryAnalyzer] Query statistics reset successfully');
  } catch (error) {
    console.error('[QueryAnalyzer] Error resetting query statistics:', error);
  }
}

/**
 * Explain a specific query to understand its execution plan
 */
async function explainQuery(query: string): Promise<any> {
  try {
    console.log(`[QueryAnalyzer] Analyzing query plan: ${query.substring(0, 100)}...`);
    
    // Execute EXPLAIN ANALYZE on the query
    const result = await db.execute(sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql.raw(query)}`);
    
    return result.rows[0].query_plan;
  } catch (error) {
    console.error('[QueryAnalyzer] Error explaining query:', error);
    return null;
  }
}

/**
 * Analyze index usage to find unused or rarely used indexes
 */
async function analyzeIndexUsage(): Promise<any[]> {
  try {
    console.log('[QueryAnalyzer] Analyzing index usage...');
    
    const result = await db.execute(sql`
      SELECT
        schemaname || '.' || relname as "table",
        indexrelname as "index",
        idx_scan as "indexScans",
        idx_tup_read as "tupleReads",
        idx_tup_fetch as "tupleFetches",
        pg_size_pretty(pg_relation_size(indexrelid)) as "indexSize"
      FROM
        pg_stat_user_indexes
      ORDER BY
        idx_scan ASC,
        pg_relation_size(indexrelid) DESC;
    `);
    
    return result.rows;
  } catch (error) {
    console.error('[QueryAnalyzer] Error analyzing index usage:', error);
    return [];
  }
}

/**
 * Analyze table statistics to find opportunities for optimization
 */
async function analyzeTableStatistics(): Promise<any[]> {
  try {
    console.log('[QueryAnalyzer] Analyzing table statistics...');
    
    const result = await db.execute(sql`
      SELECT
        schemaname || '.' || relname as "table",
        seq_scan as "seqScans",
        seq_tup_read as "seqTupleReads",
        idx_scan as "indexScans",
        idx_tup_fetch as "indexTupleFetches",
        n_tup_ins as "insertions",
        n_tup_upd as "updates",
        n_tup_del as "deletions",
        n_live_tup as "liveTuples",
        n_dead_tup as "deadTuples",
        last_vacuum as "lastVacuum",
        last_analyze as "lastAnalyze",
        pg_size_pretty(pg_total_relation_size(schemaname || '.' || relname)) as "totalSize"
      FROM
        pg_stat_user_tables
      ORDER BY
        n_live_tup DESC;
    `);
    
    return result.rows;
  } catch (error) {
    console.error('[QueryAnalyzer] Error analyzing table statistics:', error);
    return [];
  }
}

/**
 * Find missing indexes by identifying tables with high sequential scans
 */
async function findMissingIndexes(): Promise<any[]> {
  try {
    console.log('[QueryAnalyzer] Identifying potential missing indexes...');
    
    const result = await db.execute(sql`
      SELECT
        schemaname || '.' || relname as "table",
        seq_scan as "seqScans",
        idx_scan as "indexScans",
        n_live_tup as "liveTuples",
        pg_size_pretty(pg_total_relation_size(schemaname || '.' || relname)) as "totalSize"
      FROM
        pg_stat_user_tables
      WHERE
        seq_scan > idx_scan
        AND n_live_tup > 1000
      ORDER BY
        seq_scan DESC;
    `);
    
    return result.rows;
  } catch (error) {
    console.error('[QueryAnalyzer] Error finding missing indexes:', error);
    return [];
  }
}

/**
 * Run a full analysis of database performance
 */
export async function runFullAnalysis(): Promise<{ 
  slowQueries: QueryStats[],
  unusedIndexes: any[],
  tableStats: any[],
  missingIndexes: any[]
}> {
  try {
    console.log('[QueryAnalyzer] Running full database performance analysis...');
    
    // Run all analyses in parallel for speed
    const [slowQueries, unusedIndexes, tableStats, missingIndexes] = await Promise.all([
      findSlowQueries(20),
      analyzeIndexUsage(),
      analyzeTableStatistics(),
      findMissingIndexes()
    ]);
    
    console.log('[QueryAnalyzer] Analysis completed successfully');
    
    return {
      slowQueries,
      unusedIndexes,
      tableStats,
      missingIndexes
    };
  } catch (error) {
    console.error('[QueryAnalyzer] Error running full analysis:', error);
    throw error;
  }
}

// Export utilities for use in other modules
export { 
  findSlowQueries, 
  resetQueryStatistics, 
  explainQuery, 
  analyzeIndexUsage, 
  analyzeTableStatistics, 
  findMissingIndexes
};