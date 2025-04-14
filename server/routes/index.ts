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
 * @returns HTTP server instance
 */
export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Register API route modules
  registerAuthRoutes(app);
  registerUserRoutes(app);
  registerProjectRoutes(app);
  registerRequirementRoutes(app);
  
  // Register 404 handler
  app.use(notFoundHandler);
  
  // Register error handler (must be last)
  app.use(errorHandler);
  
  return httpServer;
}