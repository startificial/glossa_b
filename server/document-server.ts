/**
 * Standalone Document Server Module
 * 
 * This module handles document generation and serving with a specialized approach 
 * that avoids content-type and streaming issues.
 */
import express from 'express';
import { jsPDF } from 'jspdf';
import path from 'path';
import fs from 'fs/promises';
import type { projects, requirements, implementationTasks } from '@shared/schema'; 

// Define types using schema
type Project = typeof projects.$inferSelect;
type Requirement = typeof requirements.$inferSelect;
type ImplementationTask = typeof implementationTasks.$inferSelect;

// Document server router
const router = express.Router();

// Ensure the document directory exists
const documentsDir = path.join(process.cwd(), 'uploads', 'documents');

// Initialize document directory
(async () => {
  try {
    await fs.mkdir(documentsDir, { recursive: true });
    console.log('Document directory initialized:', documentsDir);
  } catch (error) {
    console.error('Failed to create document directory:', error);
  }
})();

/**
 * Generate a document and return the file path
 */
async function generatePdf(
  title: string,
  content: string,
  documentType: string
): Promise<{ filePath: string, fileName: string }> {
  // Create a unique filename based on document type and timestamp
  const timestamp = Date.now();
  const safeTitle = title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const fileName = `${documentType}-${safeTitle}-${timestamp}.pdf`;
  const filePath = path.join(documentsDir, fileName);
  
  console.log(`Generating PDF: ${fileName}`);
  
  try {
    // Create PDF document
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text(title, 20, 20);
    
    // Add content
    doc.setFontSize(12);
    const textLines = doc.splitTextToSize(content, 170);
    doc.text(textLines, 20, 30);
    
    // Add metadata
    doc.setProperties({
      title: title,
      subject: `Generated ${documentType} Document`,
      author: 'Document Generator',
      keywords: documentType,
      creator: 'Requirements Management System'
    });
    
    // Save the PDF - use binary output
    const pdfOutput = doc.output();
    await fs.writeFile(filePath, Buffer.from(pdfOutput, 'binary'));
    
    console.log(`PDF generated successfully at: ${filePath}`);
    
    return { filePath, fileName };
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

/**
 * Generate document content based on project data
 */
function generateDocumentContent(
  documentType: string,
  project: Project, 
  requirements: Requirement[], 
  tasks: ImplementationTask[]
): string {
  let content = '';
  
  // Generate document content based on type
  switch (documentType) {
    case 'sow':
      content = `
Statement of Work (SOW) for ${project.name}

1. PROJECT OVERVIEW
${project.description || 'No project description provided.'}

2. SCOPE OF WORK
This Statement of Work outlines the deliverables and services to be provided for the ${project.name} project.

3. REQUIREMENTS
${requirements.map((req, idx) => `${idx + 1}. ${req.title}\n   ${req.description || 'No description provided.'}`).join('\n\n')}

4. IMPLEMENTATION TASKS
${tasks.length > 0 
  ? tasks.map((task, idx) => `${idx + 1}. ${task.title} (${task.estimatedHours || 0} hours)`).join('\n')
  : 'No implementation tasks defined for this project.'}

5. TIMELINE AND MILESTONES
Project Start: ${new Date().toLocaleDateString()}
Estimated Completion: ${new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString()}

6. ACCEPTANCE CRITERIA
The project will be considered complete when all requirements have been implemented and accepted by the client.

7. COSTS AND PAYMENT
Total Estimated Hours: ${tasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0)}
Hourly Rate: $150/hour
Total Estimated Cost: $${(tasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0) * 150).toLocaleString()}
`;
      break;
      
    case 'implementation-plan':
      content = `
Implementation Plan for ${project.name}

1. PROJECT OVERVIEW
${project.description || 'No project description provided.'}

2. IMPLEMENTATION APPROACH
This implementation plan provides a detailed roadmap for the completion of the ${project.name} project.

3. REQUIREMENTS AND TASKS
${requirements.map((req, idx) => {
  const reqTasks = tasks.filter(t => t.requirementId === req.id);
  return `Requirement ${idx + 1}: ${req.title}
  Description: ${req.description || 'No description provided.'}
  Tasks:
  ${reqTasks.length > 0 
    ? reqTasks.map((task, taskIdx) => `  ${taskIdx + 1}. ${task.title} (${task.estimatedHours || 0} hours)`).join('\n')
    : '  No implementation tasks defined for this requirement.'}`;
}).join('\n\n')}

4. TIMELINE AND RESOURCES
Total Estimated Hours: ${tasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0)}
Required Resources: 1 Project Manager, 2 Developers, 1 QA Engineer

5. RISK MANAGEMENT
Key risks for this implementation include potential scope changes and technical challenges.
`;
      break;
      
    default:
      content = `
Generated Document for ${project.name}

This document was generated for the ${project.name} project.

Document Type: ${documentType}
Requirements: ${requirements.length}
Implementation Tasks: ${tasks.length}

Generated on: ${new Date().toLocaleString()}
`;
      break;
  }
  
  return content;
}

/**
 * Generate document API endpoint
 */
router.post('/api/documents/generate-pdf', async (req, res) => {
  try {
    console.log('PDF generation request received');
    
    // Set content type to JSON
    res.setHeader('Content-Type', 'application/json');
    
    const { documentType, projectId, project, requirements, tasks, title, content } = req.body;
    
    if (!documentType) {
      return res.status(400).json({
        success: false,
        error: 'Document type is required'
      });
    }
    
    let documentTitle: string;
    let documentContent: string;
    
    if (title && content) {
      // Use provided title and content
      documentTitle = title;
      documentContent = content;
    } else if (project && requirements) {
      // Generate content from project data
      documentTitle = `${documentType.toUpperCase()} - ${project.name}`;
      documentContent = generateDocumentContent(documentType, project, requirements, tasks || []);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Missing required document data'
      });
    }
    
    // Generate the PDF
    const { fileName } = await generatePdf(documentTitle, documentContent, documentType);
    
    console.log('Successfully generated PDF document:', fileName);
    
    // Return success response
    return res.status(200).json({
      success: true,
      fileName: fileName,
      downloadUrl: `/documents/${fileName}`
    });
  } catch (error) {
    console.error('Error in PDF generation:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate document',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Serve a document directly
 */
router.get('/documents/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    
    if (!fileName) {
      return res.status(400).json({ success: false, error: 'Filename is required' });
    }
    
    const filePath = path.join(documentsDir, fileName);
    
    try {
      // Check if file exists
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }
    
    // Set appropriate headers for PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    // Send the file directly
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving document:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to serve document',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;