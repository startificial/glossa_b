/**
 * Customer Routes
 * 
 * Defines Express routes for customer management.
 */
import { Express, Request as ExpressRequest, Response as ExpressResponse, NextFunction } from 'express';
import { customerController } from '../controllers/customer-controller';
import { isAuthenticated, isAdmin } from '../middleware/auth';
import { logger } from '../utils/logger';

/**
 * Register customer routes with the Express application
 * @param app Express application instance
 */
export function registerCustomerRoutes(app: Express): void {
  console.log('[CUSTOMER ROUTES] Registering customer routes with authentication ENABLED');
  
  // Add test routes that don't require authentication to verify basic routing
  app.get('/api/customers-test', (req, res) => {
    console.log('[CUSTOMER ROUTES] Test route hit');
    res.json({ message: 'Customer test route works', timestamp: new Date().toISOString() });
  });
  
  // Add a specific test route to verify our SQL queries work
  app.get('/api/test-customer-query', async (req, res) => {
    try {
      console.log('[CUSTOMER ROUTES] SQL test route hit');
      // Use our new debugger function from the controller
      const { customerDebug } = await import('../controllers/customer-controller');
      
      const customers = await customerDebug.testCustomerQuery();
      console.log('[CUSTOMER ROUTES] Debug function returned customers:', customers);
      
      return res.json({
        message: 'SQL test successful',
        customersFound: customers.length,
        firstCustomer: customers[0] ? customers[0].name : 'None',
        customers: customers,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) { // Type assertion for error
      console.error('[CUSTOMER ROUTES] SQL test error:', error);
      return res.status(500).json({ 
        error: 'SQL test failed', 
        message: error.message || 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Simple logging middleware function that could be reused
  const logRequest = (prefix: string) => (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
    console.log(`[${prefix}] ${req.method} ${req.url} request received`);
    next();
  };
  
  /**
   * @route GET /api/customers
   * @desc Get all customers
   * @access Authenticated
   */
  app.get('/api/customers', (req, res, next) => {
    console.log(`[CUSTOMER ROUTES] ${req.method} ${req.url} request received`);
    console.log(`[CUSTOMER ROUTES] Auth: ${req.isAuthenticated?.() ? 'Authenticated' : 'Not authenticated'}`);
    next();
  }, isAuthenticated, (req, res) => {
    console.log('[CUSTOMER ROUTES] GET /api/customers - Passed authentication, calling controller');
    return customerController.getAllCustomers(req, res);
  });
  
  /**
   * @route GET /api/customers/:id
   * @desc Get a customer by ID
   * @access Authenticated
   */
  app.get('/api/customers/:id', (req, res, next) => {
    console.log(`[CUSTOMER ROUTES] ${req.method} ${req.url} request received`);
    console.log(`[CUSTOMER ROUTES] Params: ${JSON.stringify(req.params)}`);
    next();
  }, isAuthenticated, (req, res) => {
    console.log(`[CUSTOMER ROUTES] GET /api/customers/${req.params.id} - Passed authentication, calling controller`);
    return customerController.getCustomerById(req, res);
  });
  
  /**
   * @route POST /api/customers
   * @desc Create a new customer
   * @access Authenticated
   */
  app.post('/api/customers', (req, res, next) => {
    console.log(`[CUSTOMER ROUTES] ${req.method} ${req.url} request received`);
    next();
  }, isAuthenticated, (req, res) => {
    console.log('[CUSTOMER ROUTES] POST /api/customers - Passed authentication, calling controller');
    return customerController.createCustomer(req, res);
  });
  
  /**
   * @route PUT /api/customers/:id
   * @desc Update a customer
   * @access Authenticated
   */
  app.put('/api/customers/:id', (req, res, next) => {
    console.log(`[CUSTOMER ROUTES] ${req.method} ${req.url} request received`);
    console.log(`[CUSTOMER ROUTES] Params: ${JSON.stringify(req.params)}`);
    next();
  }, isAuthenticated, (req, res) => {
    console.log(`[CUSTOMER ROUTES] PUT /api/customers/${req.params.id} - Passed authentication, calling controller`);
    return customerController.updateCustomer(req, res);
  });
  
  /**
   * @route DELETE /api/customers/:id
   * @desc Delete a customer
   * @access Authenticated
   */
  app.delete('/api/customers/:id', (req, res, next) => {
    console.log(`[CUSTOMER ROUTES] ${req.method} ${req.url} request received`);
    console.log(`[CUSTOMER ROUTES] Params: ${JSON.stringify(req.params)}`);
    next();
  }, isAuthenticated, (req, res) => {
    console.log(`[CUSTOMER ROUTES] DELETE /api/customers/${req.params.id} - Passed authentication, calling controller`);
    return customerController.deleteCustomer(req, res);
  });
  
  console.log('[CUSTOMER ROUTES] All customer routes registered successfully');
}