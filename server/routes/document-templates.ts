import express from 'express';
import { db } from '../database';
import * as schema from '../../shared/schema';
import { eq } from 'drizzle-orm';

const router = express.Router();

// Get all global templates
router.get('/global', async (req, res) => {
  try {
    const templates = await db.query.documentTemplates.findMany({
      where: eq(schema.documentTemplates.isGlobal, true),
      orderBy: (templates, { desc }) => [desc(templates.updatedAt)],
    });
    
    return res.json(templates);
  } catch (error) {
    console.error('Error fetching global templates:', error);
    return res.status(500).json({ error: 'Failed to fetch global templates' });
  }
});

// Get templates for a specific project (includes global templates)
router.get('/project/:projectId', async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    
    // Fetch both project-specific and global templates
    const templates = await db.query.documentTemplates.findMany({
      where: (templates, { or, eq }) => or(
        eq(templates.projectId, projectId),
        eq(templates.isGlobal, true)
      ),
      orderBy: (templates, { desc }) => [desc(templates.updatedAt)],
    });
    
    return res.json(templates);
  } catch (error) {
    console.error('Error fetching project templates:', error);
    return res.status(500).json({ error: 'Failed to fetch project templates' });
  }
});

// Get a specific template by ID
router.get('/:id', async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    
    const template = await db.query.documentTemplates.findFirst({
      where: eq(schema.documentTemplates.id, templateId),
      with: {
        fieldMappings: true
      }
    });
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    return res.json(template);
  } catch (error) {
    console.error('Error fetching template:', error);
    return res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// Create a new template
router.post('/', async (req, res) => {
  try {
    const templateData = req.body;
    
    // Ensure we have the required fields
    if (!templateData.name || !templateData.category) {
      return res.status(400).json({ error: 'Name and category are required' });
    }
    
    // Add created/updated dates
    const now = new Date();
    templateData.createdAt = now;
    templateData.updatedAt = now;
    
    // Insert the new template
    const result = await db.insert(schema.documentTemplates).values(templateData).returning();
    
    if (result.length === 0) {
      return res.status(500).json({ error: 'Failed to create template' });
    }
    
    return res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error creating template:', error);
    return res.status(500).json({ error: 'Failed to create template' });
  }
});

// Update an existing template
router.put('/:id', async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    const templateData = req.body;
    
    // Update the template with the current time
    templateData.updatedAt = new Date();
    
    // Update the template
    const result = await db
      .update(schema.documentTemplates)
      .set(templateData)
      .where(eq(schema.documentTemplates.id, templateId))
      .returning();
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    return res.json(result[0]);
  } catch (error) {
    console.error('Error updating template:', error);
    return res.status(500).json({ error: 'Failed to update template' });
  }
});

// Delete a template
router.delete('/:id', async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    
    // First delete all field mappings for this template
    await db
      .delete(schema.fieldMappings)
      .where(eq(schema.fieldMappings.templateId, templateId));
    
    // Then delete the template
    const result = await db
      .delete(schema.documentTemplates)
      .where(eq(schema.documentTemplates.id, templateId))
      .returning();
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    return res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    return res.status(500).json({ error: 'Failed to delete template' });
  }
});

// Field Mappings Routes

// Get field mappings for a template
router.get('/:templateId/field-mappings', async (req, res) => {
  try {
    const templateId = parseInt(req.params.templateId);
    
    const fieldMappings = await db.query.fieldMappings.findMany({
      where: eq(schema.fieldMappings.templateId, templateId),
    });
    
    return res.json(fieldMappings);
  } catch (error) {
    console.error('Error fetching field mappings:', error);
    return res.status(500).json({ error: 'Failed to fetch field mappings' });
  }
});

// Create a field mapping
router.post('/:templateId/field-mappings', async (req, res) => {
  try {
    const templateId = parseInt(req.params.templateId);
    const fieldMappingData = req.body;
    
    // Ensure we have the required fields
    if (!fieldMappingData.fieldKey || !fieldMappingData.name || !fieldMappingData.type) {
      return res.status(400).json({ error: 'Field key, name, and type are required' });
    }
    
    // Add created/updated dates and template ID
    const now = new Date();
    fieldMappingData.createdAt = now;
    fieldMappingData.updatedAt = now;
    fieldMappingData.templateId = templateId;
    
    // Insert the new field mapping
    const result = await db.insert(schema.fieldMappings).values(fieldMappingData).returning();
    
    if (result.length === 0) {
      return res.status(500).json({ error: 'Failed to create field mapping' });
    }
    
    return res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error creating field mapping:', error);
    return res.status(500).json({ error: 'Failed to create field mapping' });
  }
});

// Update a field mapping
router.put('/field-mappings/:id', async (req, res) => {
  try {
    const fieldMappingId = parseInt(req.params.id);
    const fieldMappingData = req.body;
    
    // Update the field mapping with the current time
    fieldMappingData.updatedAt = new Date();
    
    // Update the field mapping
    const result = await db
      .update(schema.fieldMappings)
      .set(fieldMappingData)
      .where(eq(schema.fieldMappings.id, fieldMappingId))
      .returning();
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Field mapping not found' });
    }
    
    return res.json(result[0]);
  } catch (error) {
    console.error('Error updating field mapping:', error);
    return res.status(500).json({ error: 'Failed to update field mapping' });
  }
});

// Delete a field mapping
router.delete('/field-mappings/:id', async (req, res) => {
  try {
    const fieldMappingId = parseInt(req.params.id);
    
    const result = await db
      .delete(schema.fieldMappings)
      .where(eq(schema.fieldMappings.id, fieldMappingId))
      .returning();
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Field mapping not found' });
    }
    
    return res.json({ message: 'Field mapping deleted successfully' });
  } catch (error) {
    console.error('Error deleting field mapping:', error);
    return res.status(500).json({ error: 'Failed to delete field mapping' });
  }
});

// Delete all field mappings for a template
router.delete('/:templateId/field-mappings', async (req, res) => {
  try {
    const templateId = parseInt(req.params.templateId);
    
    // Verify the template exists
    const template = await db.query.documentTemplates.findFirst({
      where: eq(schema.documentTemplates.id, templateId),
    });
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    // Delete all field mappings for this template
    await db
      .delete(schema.fieldMappings)
      .where(eq(schema.fieldMappings.templateId, templateId));
    
    return res.json({ message: 'All field mappings deleted successfully' });
  } catch (error) {
    console.error('Error deleting field mappings:', error);
    return res.status(500).json({ error: 'Failed to delete field mappings' });
  }
});

// Get all database table schemas for field mappings
router.get('/database-schema', async (req, res) => {
  try {
    // Define table metadata with friendly display names and available columns
    // This is a static schema definition to avoid database relation errors
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
      },
      documentTemplates: {
        displayName: 'Document Templates',
        description: 'Templates for generating documents',
        columns: {
          id: { type: 'number', description: 'Template ID' },
          name: { type: 'string', description: 'Template Name' },
          description: { type: 'string', description: 'Description' },
          category: { type: 'string', description: 'Category' },
        }
      },
      documents: {
        displayName: 'Documents',
        description: 'Generated documents',
        columns: {
          id: { type: 'number', description: 'Document ID' },
          name: { type: 'string', description: 'Document Name' },
          description: { type: 'string', description: 'Description' },
          status: { type: 'string', description: 'Status' },
          version: { type: 'number', description: 'Version' },
        }
      },
      activities: {
        displayName: 'Activities',
        description: 'User activities',
        columns: {
          id: { type: 'number', description: 'Activity ID' },
          type: { type: 'string', description: 'Activity Type' },
          description: { type: 'string', description: 'Description' },
        }
      },
      inputData: {
        displayName: 'Input Data',
        description: 'Project input files and content',
        columns: {
          id: { type: 'number', description: 'Input Data ID' },
          name: { type: 'string', description: 'Name' },
          type: { type: 'string', description: 'Type' },
          contentType: { type: 'string', description: 'Content Type' },
          size: { type: 'number', description: 'Size (bytes)' },
          status: { type: 'string', description: 'Status' },
        }
      }
    };
    
    // Wrap the tableSchema in a 'tables' object to match the frontend's expected format
    return res.json({ tables: tableSchema });
  } catch (error) {
    console.error('Error fetching database schema:', error);
    return res.status(500).json({ error: 'Failed to fetch database schema information' });
  }
});

export default router;