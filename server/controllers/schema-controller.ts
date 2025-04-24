import { Request, Response, response } from 'express';
import { logger } from '../utils/logger';

/**
 * Controller for database schema information
 */
export class SchemaController {
  /**
   * Get the database schema metadata
   * @param req Express request object
   * @param res Express response object
   */
  getDatabaseSchema(req: Request, res: Response): Response {
    try {
      // Define table metadata with friendly display names and available columns
      const tableSchema = {
        users: {
          displayName: 'Users',
          description: 'System users information',
          columns: {
            id: { type: 'number', description: 'User ID' },
            username: { type: 'string', description: 'Username' },
            firstName: { type: 'string', description: 'First Name' },
            lastName: { type: 'string', description: 'Last Name' },
            email: { type: 'string', description: 'Email Address' },
            company: { type: 'string', description: 'Company Name' },
            role: { type: 'string', description: 'User Role' },
          }
        },
        customers: {
          displayName: 'Customers',
          description: 'Customer organizations',
          columns: {
            id: { type: 'number', description: 'Customer ID' },
            name: { type: 'string', description: 'Customer Name' },
            description: { type: 'string', description: 'Description' },
            industry: { type: 'string', description: 'Industry' },
            backgroundInfo: { type: 'string', description: 'Background Information' },
            website: { type: 'string', description: 'Website URL' },
            contactEmail: { type: 'string', description: 'Contact Email' },
            contactPhone: { type: 'string', description: 'Contact Phone' },
          }
        },
        projects: {
          displayName: 'Projects',
          description: 'Projects information',
          columns: {
            id: { type: 'number', description: 'Project ID' },
            name: { type: 'string', description: 'Project Name' },
            description: { type: 'string', description: 'Description' },
            type: { type: 'string', description: 'Project Type' },
            customer: { type: 'string', description: 'Customer Name' },
            sourceSystem: { type: 'string', description: 'Source System' },
            targetSystem: { type: 'string', description: 'Target System' },
          }
        },
        requirements: {
          displayName: 'Requirements',
          description: 'Project requirements',
          columns: {
            id: { type: 'number', description: 'Requirement ID' },
            title: { type: 'string', description: 'Title' },
            description: { type: 'string', description: 'Description' },
            category: { type: 'string', description: 'Category' },
            priority: { type: 'string', description: 'Priority' },
            codeId: { type: 'string', description: 'Code ID' },
            source: { type: 'string', description: 'Source' },
          }
        },
        implementationTasks: {
          displayName: 'Implementation Tasks',
          description: 'Tasks for implementing requirements',
          columns: {
            id: { type: 'number', description: 'Task ID' },
            title: { type: 'string', description: 'Title' },
            description: { type: 'string', description: 'Description' },
            status: { type: 'string', description: 'Status' },
            priority: { type: 'string', description: 'Priority' },
            system: { type: 'string', description: 'System' },
            complexity: { type: 'string', description: 'Complexity' },
            assignee: { type: 'string', description: 'Assignee' },
            taskType: { type: 'string', description: 'Task Type' },
          }
        }
      };
      
      // Wrap the tableSchema in a 'tables' object to match the frontend's expected format
      return res.json({ tables: tableSchema });
    } catch (error) {
      logger.error('Error fetching database schema:', error);
      return res.status(500).json({ error: 'Failed to fetch database schema information' });
    }
  }
}

// Create and export the controller instance
export const schemaController = new SchemaController();