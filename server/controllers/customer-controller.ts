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
      logger.info("GET /api/customers - Fetching all customers");
      
      const customersList = await db.query.customers.findMany({
        orderBy: (customers, { desc }) => [desc(customers.updatedAt)]
      });
      
      logger.info(`GET /api/customers - Successfully retrieved ${customersList.length} customers`);
      return res.json(customersList);
    } catch (error) {
      logger.error("Error fetching customers:", error);
      console.error("Customer query error details:", error);
      return res.status(500).json({ 
        message: "Internal server error", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
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
      const customer = await db.query.customers.findFirst({
        where: eq(customers.id, customerId)
      });

      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      // Get projects associated with this customer
      const customerProjects = await db.query.projects.findMany({
        where: eq(projects.customerId, customerId),
        columns: {
          id: true,
          name: true,
          description: true,
          sourceSystem: true,
          targetSystem: true,
          createdAt: true,
          updatedAt: true
        }
      });
      
      const responseData = { ...customer, projects: customerProjects };
      return res.json(responseData);
    } catch (error) {
      logger.error("Error fetching customer:", error);
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
      
      const result = await db.insert(customers).values(customerData).returning();
      logger.info("Customer created successfully:", result[0]);
      
      return res.status(201).json(result[0]);
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.error("Validation error creating customer:", error.errors);
        return res.status(400).json({ message: "Invalid customer data", errors: error.errors });
      }
      logger.error("Error creating customer:", error);
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
      
      const result = await db.update(customers)
        .set({
          ...customerData,
          updatedAt: new Date()
        })
        .where(eq(customers.id, customerId))
        .returning();
      
      if (result.length === 0) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      return res.json(result[0]);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid customer data", errors: error.errors });
      }
      logger.error("Error updating customer:", error);
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
      // Check if customer has associated projects (just for logging)
      const associatedProjects = await db.query.projects.findMany({
        where: eq(projects.customerId, customerId),
        columns: {
          id: true,
          name: true
        }
      });

      if (associatedProjects.length > 0) {
        logger.info(`Deleting customer ${customerId} with ${associatedProjects.length} associated projects. Projects will be preserved.`);
      }

      // Delete the customer - the foreign key is set to ON DELETE SET NULL 
      // so projects will remain but have their customerId set to NULL
      await db.delete(customers).where(eq(customers.id, customerId));
      
      return res.status(200).json({ 
        message: "Customer deleted successfully", 
        preservedProjects: associatedProjects.length > 0 ? associatedProjects.length : 0
      });
    } catch (error) {
      logger.error("Error deleting customer:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
}

// Create and export the controller instance
export const customerController = new CustomerController();