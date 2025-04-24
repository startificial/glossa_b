/**
 * Database Schema Routes
 * 
 * Defines Express routes for database schema information.
 */
import { Express } from 'express';
import { schemaController } from '../controllers/schema-controller';

/**
 * Register database schema routes with the Express application
 * @param app Express application instance
 */
export function registerSchemaRoutes(app: Express): void {
  /**
   * @route GET /api/database-schema
   * @desc Get the database schema metadata
   * @access Public
   */
  app.get('/api/database-schema', schemaController.getDatabaseSchema.bind(schemaController));
}