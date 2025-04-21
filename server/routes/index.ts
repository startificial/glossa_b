/**
 * API Routes Module
 * 
 * Registers all API routes with the Express application.
 */
import { Express } from 'express';
import { errorHandler, notFoundHandler } from '../middleware/error-handler';

// Import route modules
import { registerAuthRoutes } from './auth-routes';
import { registerUserRoutes } from './user-routes';
import { registerProjectRoutes } from './project-routes';
import { registerRequirementRoutes } from './requirement-routes';
import { Server } from 'http';
import { createServer } from 'http';

/**
 * Register all API routes with the Express application
 * @param app Express application instance
 * @param quickStart If true, only register essential routes
 * @returns HTTP server instance
 */
export async function registerRoutes(app: Express, quickStart: boolean = false): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);
  
  // In quick start mode, only register essential routes
  if (quickStart) {
    console.log('[ROUTES] Quick start mode: only registering essential routes');
    // Only register authentication routes for fast startup
    registerAuthRoutes(app);
    
    // Schedule other routes to load after server starts
    setTimeout(() => {
      console.log('[ROUTES] Loading remaining routes asynchronously...');
      try {
        registerUserRoutes(app);
        registerProjectRoutes(app);
        registerRequirementRoutes(app);
        console.log('[ROUTES] Successfully loaded all routes');
      } catch (error) {
        console.error('[ROUTES] Error loading routes asynchronously:', error);
      }
    }, 2000); // Load other routes 2 seconds after server startup
  } else {
    // Register all API route modules synchronously
    registerAuthRoutes(app);
    registerUserRoutes(app);
    registerProjectRoutes(app);
    registerRequirementRoutes(app);
  }
  
  // Register 404 handler
  app.use(notFoundHandler);
  
  // Register error handler (must be last)
  app.use(errorHandler);
  
  return httpServer;
}