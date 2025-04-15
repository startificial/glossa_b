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
    const { projectId } = req.params;
    const { documentType } = req.body;
    
    if (!documentType) {
      return res.status(400).json({ error: 'Document type is required' });
    }
    
    // Validate document type
    const validTypes = ['sow', 'implementation-plan', 'requirement-spec', 'user-guide', 'training-manual', 'feature-guide'];
    if (!validTypes.includes(documentType)) {
      return res.status(400).json({ error: 'Invalid document type' });
    }
    
    // Get project data
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, parseInt(projectId))
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Get project requirements
    const projectRequirements = await db.query.requirements.findMany({
      where: eq(requirements.projectId, parseInt(projectId))
    });
    
    // Get implementation tasks for all requirements
    const tasks = [];
    for (const req of projectRequirements) {
      const reqTasks = await db.query.implementationTasks.findMany({
        where: eq(implementationTasks.requirementId, req.id)
      });
      tasks.push(...reqTasks);
    }
    
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
    
    // Return document path for frontend to download
    return res.json({ 
      success: true,
      documentPath: documentPath.replace(process.cwd(), ''),
      fileName: fileName
    });
  } catch (error) {
    console.error('Error generating document:', error);
    return res.status(500).json({ error: 'Failed to generate document' });
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
    
    // Set headers and send file
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    res.setHeader('Content-Type', 'application/pdf');
    console.log('Headers set, sending file');
    
    const fileStream = createReadStream(filePath);
    fileStream.pipe(res);
    
    // Log when the file stream ends
    fileStream.on('end', () => {
      console.log('File download complete');
    });
    
    // Log any errors with the file stream
    fileStream.on('error', (err) => {
      console.error('Error in file stream:', err);
    });
  } catch (error) {
    console.error('Error downloading document:', error);
    return res.status(500).json({ error: 'Failed to download document' });
  }
});

export default router;