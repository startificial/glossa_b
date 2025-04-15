/**
 * Document Generation API Routes
 * 
 * Handles requests for generating project documents like SOWs, implementation plans, etc.
 */
import { Router } from 'express';
import { db } from '../db';
import { users, projects, requirements, implementationTasks, activities } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { generateDocument } from '../document-generator';
import path from 'path';
import fs from 'fs/promises';
import { createReadStream } from 'fs';

const router = Router();

/**
 * Generate a document for a project
 * 
 * Required query parameters:
 * - documentType: Type of document to generate ('sow', 'implementation-plan', etc.)
 */
router.post('/api/projects/:projectId/generate-document', async (req, res) => {
  try {
    console.log('Document generation request received');
    console.log('Request body:', req.body); // Log full request body
    console.log('Request params:', req.params); // Log parameters
    
    const { projectId } = req.params;
    const { documentType } = req.body;
    
    console.log(`Generating document of type: ${documentType} for project: ${projectId}`);
    
    if (!documentType) {
      console.error('Document type is missing in request');
      return res.status(400).json({ error: 'Document type is required' });
    }
    
    // Validate document type
    const validTypes = ['sow', 'implementation-plan', 'requirement-spec', 'user-guide', 'training-manual', 'feature-guide'];
    if (!validTypes.includes(documentType)) {
      console.error(`Invalid document type: ${documentType}`);
      return res.status(400).json({ error: 'Invalid document type' });
    }
    
    // Get project data
    console.log(`Fetching project data for ID: ${projectId}`);
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, parseInt(projectId))
    });
    
    if (!project) {
      console.error(`Project not found for ID: ${projectId}`);
      return res.status(404).json({ error: 'Project not found' });
    }
    
    console.log(`Project found: ${project.name}`);
    
    // Get project requirements
    console.log('Fetching project requirements');
    const projectRequirements = await db.query.requirements.findMany({
      where: eq(requirements.projectId, parseInt(projectId))
    });
    console.log(`Found ${projectRequirements.length} requirements`);
    
    // Get implementation tasks for all requirements
    console.log('Fetching implementation tasks');
    const tasks = [];
    for (const req of projectRequirements) {
      const reqTasks = await db.query.implementationTasks.findMany({
        where: eq(implementationTasks.requirementId, req.id)
      });
      tasks.push(...reqTasks);
    }
    console.log(`Found ${tasks.length} implementation tasks`);
    
    // Generate document
    const documentPath = await generateDocument(
      documentType,
      parseInt(projectId),
      project,
      projectRequirements,
      tasks
    );
    
    // Record activity
    await db.insert(activities).values({
      type: 'generated_document',
      description: `Generated ${documentType} document for ${project.name}`,
      userId: 1, // Default to admin user
      projectId: parseInt(projectId),
      relatedEntityId: parseInt(projectId)
    });
    
    // Get the filename
    const fileName = path.basename(documentPath);
    console.log('Generated document:', documentPath);
    console.log('Filename to return:', fileName);
    
    // Verify the file was created and accessible before returning
    try {
      await fs.access(documentPath);
      console.log('Document file verified, exists on disk');
      
      // Return document path for frontend to download
      return res.json({ 
        success: true,
        documentPath: documentPath.replace(process.cwd(), ''),
        fileName: fileName
      });
    } catch (error) {
      const accessError = error instanceof Error ? error : new Error(String(error));
      console.error('Document file does not exist despite generation:', accessError);
      throw new Error(`Document file was not successfully created: ${accessError.message}`);
    }
  } catch (error) {
    console.error('Error generating document:', error);
    // Send detailed error to help with debugging
    return res.status(500).json({ 
      error: 'Failed to generate document', 
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
  }
});

/**
 * Download a generated document
 */
router.get('/api/documents/download/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    console.log('Requested file download:', fileName);
    
    if (!fileName) {
      console.error('No filename provided in request');
      return res.status(400).json({ error: 'No filename provided' });
    }
    
    const filePath = path.join(process.cwd(), 'uploads', 'documents', fileName);
    console.log('Looking for file at:', filePath);
    
    // Check if file exists
    try {
      await fs.access(filePath);
      console.log('File exists, proceeding with download');
    } catch (err) {
      console.error('File not found:', err);
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Return filename and location instead of the file
    // We'll use a separate endpoint for the actual download
    return res.json({
      success: true,
      downloadUrl: `/api/documents/download-pdf/${fileName}`,
      fileName: fileName
    });
  } catch (error) {
    console.error('Error preparing document download:', error);
    return res.status(500).json({ error: 'Failed to prepare document download' });
  }
});

// Separate route specifically for PDF download
router.get('/api/documents/download-pdf/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    console.log('PDF download requested:', fileName);
    
    const filePath = path.join(process.cwd(), 'uploads', 'documents', fileName);
    console.log('Looking for PDF at:', filePath);
    
    // Check if file exists
    try {
      await fs.access(filePath);
      console.log('PDF file exists, proceeding with download');
    } catch (err) {
      console.error('PDF file not found:', err);
      return res.status(404).json({ error: 'PDF document not found' });
    }
    
    // Get file stats to determine size
    const stats = await fs.stat(filePath);
    
    // Force PDF content type and attachment download
    res.contentType('application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', stats.size);
    
    console.log('Set PDF headers, sending file. Size:', stats.size);
    
    // Read the file and send it directly
    const fileData = await fs.readFile(filePath);
    return res.end(fileData);
  } catch (error) {
    console.error('Error downloading PDF:', error);
    return res.status(500).json({ error: 'Failed to download PDF document' });
  }
});

export default router;