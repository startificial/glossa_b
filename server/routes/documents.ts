import express from 'express';
import path from 'path';
import fs from 'fs';
import { db } from '../database';
import * as schema from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { generate } from '@pdfme/generator';
import * as anthropic from '@anthropic-ai/sdk';

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Get all documents for a project
router.get('/project/:projectId', async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    
    const documents = await db.query.documents.findMany({
      where: eq(schema.documents.projectId, projectId),
      orderBy: (docs, { desc }) => [desc(docs.updatedAt)],
    });
    
    return res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    return res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Get a specific document by ID
router.get('/:id', async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    
    const document = await db.query.documents.findFirst({
      where: eq(schema.documents.id, documentId),
    });
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    return res.json(document);
  } catch (error) {
    console.error('Error fetching document:', error);
    return res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// Generate data for a document template
router.post('/generate-data/:templateId', async (req, res) => {
  try {
    const templateId = parseInt(req.params.templateId);
    const { projectId } = req.body;
    
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }
    
    // Fetch the template and its field mappings
    const template = await db.query.documentTemplates.findFirst({
      where: eq(schema.documentTemplates.id, templateId),
      with: {
        fieldMappings: true,
      },
    });
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    // Fetch the project data with related items
    const project = await db.query.projects.findFirst({
      where: eq(schema.projects.id, projectId),
      with: {
        customer: true,
        requirements: {
          with: {
            implementationTasks: true
          }
        },
      },
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Get all tasks for the project directly (for efficiency)
    const tasks = await db.query.implementationTasks.findMany({
      where: inArray(
        schema.implementationTasks.requirementId,
        project.requirements.map(req => req.id)
      ),
    });
    
    // Generate data based on field mappings
    const generatedData: Record<string, any> = {};
    
    for (const mapping of template.fieldMappings || []) {
      if (mapping.type === 'database') {
        // Handle database mappings according to selection mode
        const selectionMode = mapping.selectionMode || 'single';
        
        if (mapping.dataSource === 'projects') {
          if (selectionMode === 'single') {
            // Single record mode - use the specific project if recordId matches, otherwise use the current project
            if (mapping.recordId && mapping.recordId !== projectId.toString()) {
              // Try to fetch the specific project by ID
              try {
                const specificProject = await db.query.projects.findFirst({
                  where: eq(schema.projects.id, parseInt(mapping.recordId))
                });
                
                if (specificProject) {
                  generatedData[mapping.fieldKey] = getNestedProperty(specificProject, mapping.columnField || '') || mapping.defaultValue || '';
                } else {
                  generatedData[mapping.fieldKey] = mapping.defaultValue || '';
                }
              } catch (error) {
                console.error('Error fetching specific project:', error);
                generatedData[mapping.fieldKey] = mapping.defaultValue || '';
              }
            } else {
              // Use the current project
              generatedData[mapping.fieldKey] = getNestedProperty(project, mapping.columnField || '') || mapping.defaultValue || '';
            }
          } else if (selectionMode === 'all') {
            // All records mode - for projects, this doesn't make much sense but we can list all project names
            try {
              const allProjects = await db.query.projects.findMany({
                where: project.customer ? eq(schema.projects.customerId, project.customer.id) : undefined,
              });
              
              const values = allProjects.map(p => getNestedProperty(p, mapping.columnField || ''));
              generatedData[mapping.fieldKey] = values.filter(Boolean).join(', ') || mapping.defaultValue || '';
            } catch (error) {
              console.error('Error fetching all projects:', error);
              generatedData[mapping.fieldKey] = mapping.defaultValue || '';
            }
          } else if (selectionMode === 'custom' && mapping.selectionFilter) {
            // Custom filter mode - not fully implemented yet, just use current project
            // In a full implementation, we would parse the filter expression and query accordingly
            generatedData[mapping.fieldKey] = getNestedProperty(project, mapping.columnField || '') || mapping.defaultValue || '';
          } else {
            generatedData[mapping.fieldKey] = getNestedProperty(project, mapping.columnField || '') || mapping.defaultValue || '';
          }
        } 
        else if (mapping.dataSource === 'customers' && project.customer) {
          if (selectionMode === 'single') {
            // Single record mode - use the specific customer if recordId matches, otherwise use the current customer
            if (mapping.recordId && mapping.recordId !== project.customer.id.toString()) {
              // Try to fetch the specific customer by ID
              try {
                const specificCustomer = await db.query.customers.findFirst({
                  where: eq(schema.customers.id, parseInt(mapping.recordId))
                });
                
                if (specificCustomer) {
                  generatedData[mapping.fieldKey] = getNestedProperty(specificCustomer, mapping.columnField || '') || mapping.defaultValue || '';
                } else {
                  generatedData[mapping.fieldKey] = mapping.defaultValue || '';
                }
              } catch (error) {
                console.error('Error fetching specific customer:', error);
                generatedData[mapping.fieldKey] = mapping.defaultValue || '';
              }
            } else {
              // Use the current customer
              generatedData[mapping.fieldKey] = getNestedProperty(project.customer, mapping.columnField || '') || mapping.defaultValue || '';
            }
          } else if (selectionMode === 'all') {
            // All records mode - list all customers
            try {
              const allCustomers = await db.query.customers.findMany();
              const values = allCustomers.map(c => getNestedProperty(c, mapping.columnField || ''));
              generatedData[mapping.fieldKey] = values.filter(Boolean).join(', ') || mapping.defaultValue || '';
            } catch (error) {
              console.error('Error fetching all customers:', error);
              generatedData[mapping.fieldKey] = mapping.defaultValue || '';
            }
          } else if (selectionMode === 'custom' && mapping.selectionFilter) {
            // Custom filter mode - not fully implemented yet
            generatedData[mapping.fieldKey] = getNestedProperty(project.customer, mapping.columnField || '') || mapping.defaultValue || '';
          } else {
            generatedData[mapping.fieldKey] = getNestedProperty(project.customer, mapping.columnField || '') || mapping.defaultValue || '';
          }
        }
        else if (mapping.dataSource === 'requirements') {
          if (selectionMode === 'single' && mapping.recordId) {
            // Single record mode - use the specific requirement if recordId matches
            try {
              const specificRequirement = await db.query.requirements.findFirst({
                where: eq(schema.requirements.id, parseInt(mapping.recordId))
              });
              
              if (specificRequirement) {
                generatedData[mapping.fieldKey] = getNestedProperty(specificRequirement, mapping.columnField || '') || mapping.defaultValue || '';
              } else {
                generatedData[mapping.fieldKey] = mapping.defaultValue || '';
              }
            } catch (error) {
              console.error('Error fetching specific requirement:', error);
              generatedData[mapping.fieldKey] = mapping.defaultValue || '';
            }
          } else if (selectionMode === 'all') {
            // All records mode - join all requirements based on the column field
            if (project.requirements && project.requirements.length > 0) {
              const values = project.requirements.map(r => getNestedProperty(r, mapping.columnField || ''));
              generatedData[mapping.fieldKey] = values.filter(Boolean).join(', ') || mapping.defaultValue || '';
            } else {
              generatedData[mapping.fieldKey] = mapping.defaultValue || '';
            }
          } else if (selectionMode === 'custom' && mapping.selectionFilter) {
            // Custom filter mode - not fully implemented yet
            // For requirements, we'll just count them for now
            generatedData[mapping.fieldKey] = `${project.requirements?.length || 0} requirements` || mapping.defaultValue || '';
          } else {
            // Default behavior - count requirements
            generatedData[mapping.fieldKey] = `${project.requirements?.length || 0} requirements` || mapping.defaultValue || '';
          }
        }
        else {
          generatedData[mapping.fieldKey] = mapping.defaultValue || '';
        }
      } 
      else if (mapping.type === 'ai-generated' && mapping.prompt) {
        // Handle AI-generated content
        try {
          const prompt = replaceVariables(mapping.prompt, { 
            project, 
            requirements: project.requirements || [] 
          });
          
          const aiResponse = await generateWithAI(prompt);
          generatedData[mapping.fieldKey] = aiResponse || mapping.defaultValue || '';
        } catch (error) {
          console.error('Error generating AI content:', error);
          generatedData[mapping.fieldKey] = mapping.defaultValue || '';
        }
      } 
      else {
        generatedData[mapping.fieldKey] = mapping.defaultValue || '';
      }
    }
    
    return res.json({ data: generatedData });
  } catch (error) {
    console.error('Error generating document data:', error);
    return res.status(500).json({ error: 'Failed to generate document data' });
  }
});

// Create a new document
router.post('/', async (req, res) => {
  try {
    const documentData = req.body;
    
    // Ensure we have the required fields
    if (!documentData.name || !documentData.templateId || !documentData.projectId) {
      return res.status(400).json({ error: 'Name, template ID, and project ID are required' });
    }
    
    // Add created/updated dates
    const now = new Date();
    documentData.createdAt = now;
    documentData.updatedAt = now;
    
    // Fetch the template
    const template = await db.query.documentTemplates.findFirst({
      where: eq(schema.documentTemplates.id, documentData.templateId),
    });
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    // Generate PDF from template
    const pdfPath = await generatePDF(template, documentData.data);
    
    // Add PDF path to document data
    documentData.pdfPath = pdfPath;
    
    // Insert the new document
    const result = await db.insert(schema.documents).values(documentData).returning();
    
    if (result.length === 0) {
      return res.status(500).json({ error: 'Failed to create document' });
    }
    
    return res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error creating document:', error);
    return res.status(500).json({ error: 'Failed to create document' });
  }
});

// Update an existing document
router.put('/:id', async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    const documentData = req.body;
    
    // Update the document with the current time
    documentData.updatedAt = new Date();
    
    // If template or data changed, regenerate the PDF
    if (documentData.templateId && documentData.data) {
      const template = await db.query.documentTemplates.findFirst({
        where: eq(schema.documentTemplates.id, documentData.templateId),
      });
      
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }
      
      // Generate new PDF
      const pdfPath = await generatePDF(template, documentData.data);
      documentData.pdfPath = pdfPath;
    }
    
    // Update the document
    const result = await db
      .update(schema.documents)
      .set(documentData)
      .where(eq(schema.documents.id, documentId))
      .returning();
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    return res.json(result[0]);
  } catch (error) {
    console.error('Error updating document:', error);
    return res.status(500).json({ error: 'Failed to update document' });
  }
});

// Delete a document
router.delete('/:id', async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    
    // Get the document to retrieve the PDF path
    const document = await db.query.documents.findFirst({
      where: eq(schema.documents.id, documentId),
    });
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Delete the PDF file if it exists
    if (document.pdfPath) {
      const filePath = path.join(process.cwd(), document.pdfPath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    // Delete the document from the database
    const result = await db
      .delete(schema.documents)
      .where(eq(schema.documents.id, documentId))
      .returning();
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    return res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    return res.status(500).json({ error: 'Failed to delete document' });
  }
});

// Helper function to get a nested property from an object
function getNestedProperty(obj: any, path: string): any {
  return path.split('.').reduce((prev, curr) => {
    return prev && prev[curr] !== undefined ? prev[curr] : null;
  }, obj);
}

// Helper function to replace variables in a prompt
function replaceVariables(prompt: string, data: Record<string, any>): string {
  let result = prompt;
  
  // Replace variables in the format {{variable}}
  const regex = /\{\{([^}]+)\}\}/g;
  result = result.replace(regex, (match, variable) => {
    const paths = variable.trim().split('.');
    let value = data;
    
    for (const path of paths) {
      if (value === undefined || value === null) return '';
      value = value[path];
    }
    
    return value !== undefined && value !== null ? String(value) : '';
  });
  
  return result;
}

// Helper function to generate content with Claude
async function generateWithAI(prompt: string): Promise<string> {
  try {
    // Create a Claude client
    const claude = new anthropic.Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    });
    
    // Generate content with Claude
    const response = await claude.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      temperature: 0.7,
      system: "You are an expert business and technical writer, specializing in clear, professional documentation.",
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });
    
    if ('text' in response.content[0]) {
      return response.content[0].text;
    }
    return "";
  } catch (error) {
    console.error('Error generating AI content:', error);
    throw error;
  }
}

// Helper function to generate a PDF from template and data
async function generatePDF(template: any, data: Record<string, any>): Promise<string> {
  try {
    // Create a filename based on timestamp
    const timestamp = new Date().getTime();
    const filename = `document-${timestamp}.pdf`;
    const outputPath = path.join('uploads', filename);
    const fullPath = path.join(process.cwd(), outputPath);
    
    // Format the data for pdfme generator (array of data objects)
    const formattedData = [data];
    
    // Generate PDF using @pdfme/generator
    const pdf = await generate({
      template: template.template,
      inputs: formattedData,
    });
    
    // Save the PDF to the uploads directory
    fs.writeFileSync(fullPath, pdf);
    
    // Return the relative path to access the PDF
    return `/${outputPath}`;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

export default router;