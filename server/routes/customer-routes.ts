/**
 * Customer Routes
 * 
 * Defines Express routes for customer management.
 */
import { Express } from 'express';
import { customerController } from '../controllers/customer-controller';
import { isAuthenticated, isAdmin } from '../middleware/auth';

/**
 * Register customer routes with the Express application
 * @param app Express application instance
 */
export function registerCustomerRoutes(app: Express): void {
  /**
   * @route GET /api/customers
   * @desc Get all customers
   * @access Public
   */
  app.get('/api/customers', customerController.getAllCustomers.bind(customerController));
  
  /**
   * @route GET /api/customers/:id
   * @desc Get a customer by ID
   * @access Public
   */
  app.get('/api/customers/:id', customerController.getCustomerById.bind(customerController));
  
  /**
   * @route POST /api/customers
   * @desc Create a new customer
   * @access Public
   */
  app.post('/api/customers', customerController.createCustomer.bind(customerController));
  
  /**
   * @route PUT /api/customers/:id
   * @desc Update a customer
   * @access Public
   */
  app.put('/api/customers/:id', customerController.updateCustomer.bind(customerController));
  
  /**
   * @route DELETE /api/customers/:id
   * @desc Delete a customer
   * @access Public
   */
  app.delete('/api/customers/:id', customerController.deleteCustomer.bind(customerController));
}