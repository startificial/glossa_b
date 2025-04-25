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
import { registerInviteRoutes } from './invite-routes';
import { registerSchemaRoutes } from './schema-routes';
import { registerCustomerRoutes } from './customer-routes';
import { registerWorkflowRoutes } from './workflow-routes';
import { registerInputDataRoutes } from './input-data-routes';
import { registerActivityRoutes } from './activity-routes';
import { registerTaskRoutes } from './task-routes';
import { registerSearchRoutes } from './search-routes';
import { registerRoleEffortRoutes } from './role-effort-routes';
import { registerRequirementAnalysisRoutes } from './requirement-analysis-routes';
import projectRolesRouter from './project-roles';
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
    console.log('[ROUTES] Quick start mode: registering essential routes');
    // Register critical routes immediately (auth, users, customers)
    registerAuthRoutes(app);
    registerUserRoutes(app);
    registerCustomerRoutes(app);
    
    // Schedule other routes to load after server starts
    setTimeout(() => {
      console.log('[ROUTES] Loading remaining routes asynchronously...');
      try {
        registerProjectRoutes(app);
        registerRequirementRoutes(app);
        registerInviteRoutes(app);
        registerSchemaRoutes(app);
        registerWorkflowRoutes(app);
        registerInputDataRoutes(app);
        registerActivityRoutes(app);
        registerTaskRoutes(app);
        registerSearchRoutes(app);
        registerRoleEffortRoutes(app);
        registerRequirementAnalysisRoutes(app);
        
        // Register project roles routes using the router
        app.use('/api', projectRolesRouter);
        
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
    registerInviteRoutes(app);
    registerSchemaRoutes(app);
    registerCustomerRoutes(app);
    registerWorkflowRoutes(app);
    registerInputDataRoutes(app);
    registerActivityRoutes(app);
    registerTaskRoutes(app);
    registerSearchRoutes(app);
    registerRoleEffortRoutes(app);
    registerRequirementAnalysisRoutes(app);
    
    // Register project roles routes using the router
    app.use('/api', projectRolesRouter);
  }
  
  // Register 404 handler
  app.use(notFoundHandler);
  
  // Register error handler (must be last)
  app.use(errorHandler);
  
  return httpServer;
}