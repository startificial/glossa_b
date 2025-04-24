/**
 * Search Routes
 * 
 * Defines Express routes for search functionality.
 */
import { Express } from 'express';
import { searchController } from '../controllers/search-controller';
import { isAuthenticated } from '../middleware/auth';

/**
 * Register search routes with the Express application
 * @param app Express application instance
 */
export function registerSearchRoutes(app: Express): void {
  /**
   * @route GET /api/search/advanced
   * @desc Perform an advanced search across multiple entities
   * @access Private
   */
  app.get(
    '/api/search/advanced',
    isAuthenticated,
    searchController.advancedSearch.bind(searchController)
  );
}