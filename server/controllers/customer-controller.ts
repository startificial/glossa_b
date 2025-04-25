import { Request, Response } from 'express';
import { db } from '../db';
import { customers, projects } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import { insertCustomerSchema } from '@shared/schema';
import { logger } from '../utils/logger';
import { z } from 'zod';

/**
 * Controller for customer-related operations
 */
export class CustomerController {
  /**
   * Get all customers
   * @param req Express request object
   * @param res Express response object
   */
  async getAllCustomers(req: Request, res: Response): Promise<Response> {
    try {
      // Enhanced debug logging
      console.log(`[CUSTOMER API] GET /api/customers request received`);
      console.log(`[CUSTOMER API] Auth info: isAuthenticated=${req.isAuthenticated()}, userId=${req.user?.id || 'none'}`);
      console.log(`[CUSTOMER API] Session: userId=${req.session?.userId || 'none'}, sessionID=${req.sessionID || 'none'}`);
      
      // Enhanced error logging
      if (!req.session || !req.session.userId) {
        console.warn(`[CUSTOMER API] No valid session for getAllCustomers request. SessionID: ${req.sessionID || 'none'}`);
      }
      
      // Use raw SQL queries to bypass any ORM issues
      console.log('[CUSTOMER API] Fetching customers from database...');
      const { pool } = await import('../db');
      
      // Direct SQL query to get customers
      const result = await pool.query('SELECT * FROM customers ORDER BY updated_at DESC');
      
      // Convert snake_case to camelCase for the frontend
      const customersList = result.rows.map(customer => ({
        id: customer.id,
        name: customer.name,
        description: customer.description,
        industry: customer.industry,
        backgroundInfo: customer.background_info, 
        website: customer.website,
        contactEmail: customer.contact_email,
        contactPhone: customer.contact_phone,
        createdAt: customer.created_at,
        updatedAt: customer.updated_at
      }));
      
      console.log(`[CUSTOMER API] Retrieved ${customersList.length} customers successfully`);
      console.log(`[CUSTOMER API] First customer (if any):`, customersList[0] || 'None');
      
      // Set explicit content type and send response
      res.setHeader('Content-Type', 'application/json');
      return res.json(customersList);
    } catch (error) {
      console.error("[CUSTOMER API] Error fetching customers:", error);
      console.error("[CUSTOMER API] Full error details:", JSON.stringify(error));
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Get a customer by ID
   * @param req Express request object
   * @param res Express response object
   */
  async getCustomerById(req: Request, res: Response): Promise<Response> {
    const customerId = parseInt(req.params.id);
    if (isNaN(customerId)) {
      return res.status(400).json({ message: "Invalid customer ID" });
    }

    try {
      // Use raw SQL queries to bypass any ORM issues
      const { pool } = await import('../db');
      
      // Direct SQL query to get customer
      const customerResult = await pool.query('SELECT * FROM customers WHERE id = $1', [customerId]);
      
      if (!customerResult.rows || customerResult.rows.length === 0) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      const rawCustomer = customerResult.rows[0];
      
      // Convert snake_case to camelCase for the frontend
      const customer = {
        id: rawCustomer.id,
        name: rawCustomer.name,
        description: rawCustomer.description,
        industry: rawCustomer.industry,
        backgroundInfo: rawCustomer.background_info, 
        website: rawCustomer.website,
        contactEmail: rawCustomer.contact_email,
        contactPhone: rawCustomer.contact_phone,
        createdAt: rawCustomer.created_at,
        updatedAt: rawCustomer.updated_at
      };

      // Get projects associated with this customer
      const projectsResult = await pool.query(
        'SELECT id, name, description, source_system, target_system, created_at, updated_at FROM projects WHERE customer_id = $1', 
        [customerId]
      );
      
      // Convert snake_case to camelCase for the projects
      const customerProjects = projectsResult.rows.map(project => ({
        id: project.id,
        name: project.name,
        description: project.description,
        sourceSystem: project.source_system,
        targetSystem: project.target_system,
        createdAt: project.created_at,
        updatedAt: project.updated_at
      }));
      
      const responseData = { ...customer, projects: customerProjects };
      return res.json(responseData);
    } catch (error) {
      logger.error("Error fetching customer:", error);
      logger.error("Full error details:", JSON.stringify(error));
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Create a new customer
   * @param req Express request object
   * @param res Express response object
   */
  async createCustomer(req: Request, res: Response): Promise<Response> {
    try {
      logger.info("POST /api/customers request body:", req.body);
      
      const customerData = insertCustomerSchema.parse(req.body);
      logger.info("Parsed customer data:", customerData);
      
      // Use raw SQL queries to bypass any ORM issues
      const { pool } = await import('../db');
      
      // Map camelCase to snake_case for the database
      const result = await pool.query(
        `INSERT INTO customers 
         (name, description, industry, background_info, website, contact_email, contact_phone) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING *`,
        [
          customerData.name,
          customerData.description,
          customerData.industry,
          customerData.backgroundInfo,
          customerData.website,
          customerData.contactEmail,
          customerData.contactPhone
        ]
      );
      
      // Convert the result back to camelCase for the frontend
      const newCustomer = result.rows[0];
      const camelCaseCustomer = {
        id: newCustomer.id,
        name: newCustomer.name,
        description: newCustomer.description,
        industry: newCustomer.industry,
        backgroundInfo: newCustomer.background_info,
        website: newCustomer.website,
        contactEmail: newCustomer.contact_email,
        contactPhone: newCustomer.contact_phone,
        createdAt: newCustomer.created_at,
        updatedAt: newCustomer.updated_at
      };
      
      logger.info("Customer created successfully:", camelCaseCustomer);
      return res.status(201).json(camelCaseCustomer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.error("Validation error creating customer:", error.errors);
        return res.status(400).json({ message: "Invalid customer data", errors: error.errors });
      }
      logger.error("Error creating customer:", error);
      logger.error("Full error details:", JSON.stringify(error));
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Update a customer
   * @param req Express request object
   * @param res Express response object
   */
  async updateCustomer(req: Request, res: Response): Promise<Response> {
    const customerId = parseInt(req.params.id);
    if (isNaN(customerId)) {
      return res.status(400).json({ message: "Invalid customer ID" });
    }

    try {
      const customerData = insertCustomerSchema.parse(req.body);
      
      // Use raw SQL queries to bypass any ORM issues
      const { pool } = await import('../db');
      
      // First check if the customer exists
      const checkResult = await pool.query('SELECT id FROM customers WHERE id = $1', [customerId]);
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      // Map camelCase to snake_case for the database
      const result = await pool.query(
        `UPDATE customers 
         SET name = $1, 
             description = $2, 
             industry = $3, 
             background_info = $4, 
             website = $5, 
             contact_email = $6, 
             contact_phone = $7,
             updated_at = NOW()
         WHERE id = $8
         RETURNING *`,
        [
          customerData.name,
          customerData.description,
          customerData.industry,
          customerData.backgroundInfo,
          customerData.website,
          customerData.contactEmail,
          customerData.contactPhone,
          customerId
        ]
      );
      
      // Convert the result back to camelCase for the frontend
      const updatedCustomer = result.rows[0];
      const camelCaseCustomer = {
        id: updatedCustomer.id,
        name: updatedCustomer.name,
        description: updatedCustomer.description,
        industry: updatedCustomer.industry,
        backgroundInfo: updatedCustomer.background_info,
        website: updatedCustomer.website,
        contactEmail: updatedCustomer.contact_email,
        contactPhone: updatedCustomer.contact_phone,
        createdAt: updatedCustomer.created_at,
        updatedAt: updatedCustomer.updated_at
      };
      
      return res.json(camelCaseCustomer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid customer data", errors: error.errors });
      }
      logger.error("Error updating customer:", error);
      logger.error("Full error details:", JSON.stringify(error));
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Delete a customer
   * @param req Express request object
   * @param res Express response object
   */
  async deleteCustomer(req: Request, res: Response): Promise<Response> {
    const customerId = parseInt(req.params.id);
    if (isNaN(customerId)) {
      return res.status(400).json({ message: "Invalid customer ID" });
    }

    try {
      // Use raw SQL queries to bypass any ORM issues
      const { pool } = await import('../db');
      
      // Check if customer has associated projects (just for logging)
      const projectsResult = await pool.query(
        'SELECT id, name FROM projects WHERE customer_id = $1', 
        [customerId]
      );
      
      const associatedProjects = projectsResult.rows;

      if (associatedProjects.length > 0) {
        logger.info(`Deleting customer ${customerId} with ${associatedProjects.length} associated projects. Projects will be preserved.`);
      }

      // Delete the customer - the foreign key is set to ON DELETE SET NULL 
      // so projects will remain but have their customerId set to NULL
      await pool.query('DELETE FROM customers WHERE id = $1', [customerId]);
      
      return res.status(200).json({ 
        message: "Customer deleted successfully", 
        preservedProjects: associatedProjects.length > 0 ? associatedProjects.length : 0
      });
    } catch (error) {
      logger.error("Error deleting customer:", error);
      logger.error("Full error details:", JSON.stringify(error));
      return res.status(500).json({ message: "Internal server error" });
    }
  }
}

// Add a test method to debug database connectivity
async function testCustomerQuery(): Promise<any> {
  try {
    console.log('[CUSTOMER-DEBUG] Running direct SQL test query');
    const { pool } = await import('../db');
    
    const result = await pool.query('SELECT * FROM customers ORDER BY id LIMIT 5');
    console.log(`[CUSTOMER-DEBUG] Test query successful, returned ${result.rows.length} rows`);
    if (result.rows.length > 0) {
      console.log(`[CUSTOMER-DEBUG] First customer: ${result.rows[0].name} (ID: ${result.rows[0].id})`);
    }
    
    return result.rows;
  } catch (error) {
    console.error('[CUSTOMER-DEBUG] Test query failed:', error);
    throw error;
  }
}

// Export the test query function for testing
export const customerDebug = {
  testCustomerQuery
};

// Create and export the controller instance
export const customerController = new CustomerController();