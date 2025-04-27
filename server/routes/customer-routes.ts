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
   * @access Private
   */
  app.get('/api/customers', isAuthenticated, customerController.getAllCustomers.bind(customerController));
  
  /**
   * @route GET /api/customers/:id
   * @desc Get a customer by ID
   * @access Private
   */
  app.get('/api/customers/:id', isAuthenticated, customerController.getCustomerById.bind(customerController));
  
  /**
   * @route POST /api/customers
   * @desc Create a new customer
   * @access Private
   */
  app.post('/api/customers', isAuthenticated, customerController.createCustomer.bind(customerController));
  
  /**
   * @route PUT /api/customers/:id
   * @desc Update a customer
   * @access Private
   */
  app.put('/api/customers/:id', isAuthenticated, customerController.updateCustomer.bind(customerController));
  
  /**
   * @route DELETE /api/customers/:id
   * @desc Delete a customer
   * @access Private
   */
  app.delete('/api/customers/:id', isAuthenticated, customerController.deleteCustomer.bind(customerController));
}