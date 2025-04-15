/**
 * Simple PDF Generator
 * 
 * This is a dedicated module for PDF generation that avoids using complex routes
 * and potential content-type header issues. This handler is added directly to the 
 * main Express app.
 */
import express, { Express, Request, Response } from 'express';
import { jsPDF } from 'jspdf';
import path from 'path';
import fs from 'fs';
import { db } from './db';
import { projects, requirements, implementationTasks, activities } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Create documents directory if it doesn't exist
const documentsDir = path.join(process.cwd(), 'uploads', 'documents');
if (!fs.existsSync(documentsDir)) {
  fs.mkdirSync(documentsDir, { recursive: true });
}

// Helper function to generate SOW content
function generateSowContent(project: any, requirements: any[], tasks: any[]): string {
  const totalHours = tasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
  const hourlyRate = 150;
  const totalCost = totalHours * hourlyRate;
  
  return `
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
Total Estimated Hours: ${totalHours}
Hourly Rate: $${hourlyRate}/hour
Total Estimated Cost: $${totalCost.toLocaleString()}
`;
}

// Helper function to generate Implementation Plan content
function generateImplementationPlanContent(project: any, requirements: any[], tasks: any[]): string {
  const totalHours = tasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
  
  return `
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
Total Estimated Hours: ${totalHours}
Required Resources: 1 Project Manager, 2 Developers, 1 QA Engineer

5. RISK MANAGEMENT
Key risks for this implementation include potential scope changes and technical challenges.
`;
}

export function registerPdfRoutes(app: Express) {
  console.log('Registering simple PDF generator routes');
  
  // Serve static PDF files
  app.use('/api/pdf-files', express.static(documentsDir, {
    setHeaders: (res: express.Response, filePath: string) => {
      if (filePath.endsWith('.pdf')) {
        res.setHeader('Content-Type', 'application/pdf');
        const fileName = path.basename(filePath);
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      }
    }
  }));
  
  // Simple PDF generator
  app.post('/api/generate-simple-pdf', async (req: Request, res: Response) => {
    try {
      console.log('PDF generation request received for simple PDF route');
      res.setHeader('Content-Type', 'application/json');
      
      const { projectId, documentType } = req.body;
      
      console.log(`Request data: projectId=${projectId}, documentType=${documentType}`);
      
      if (!projectId || !documentType) {
        return res.status(400).json({
          success: false,
          error: 'Project ID and document type are required'
        });
      }
      
      // Get project data
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, parseInt(projectId))
      });
      
      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }
      
      // Get requirements
      const projectRequirements = await db.query.requirements.findMany({
        where: eq(requirements.projectId, parseInt(projectId))
      });
      
      // Get implementation tasks
      const tasks = [];
      for (const req of projectRequirements) {
        const reqTasks = await db.query.implementationTasks.findMany({
          where: eq(implementationTasks.requirementId, req.id)
        });
        tasks.push(...reqTasks);
      }
      
      // Generate PDF content
      let title = '';
      let content = '';
      
      if (documentType === 'sow') {
        title = `Statement of Work - ${project.name}`;
        content = generateSowContent(project, projectRequirements, tasks);
      } else if (documentType === 'implementation-plan') {
        title = `Implementation Plan - ${project.name}`;
        content = generateImplementationPlanContent(project, projectRequirements, tasks);
      } else {
        title = `${documentType.charAt(0).toUpperCase() + documentType.slice(1)} - ${project.name}`;
        content = `Document for ${project.name}\nGenerated on: ${new Date().toLocaleString()}`;
      }
      
      // Create a PDF
      const timestamp = Date.now();
      const fileName = `${documentType}-${timestamp}.pdf`;
      const filePath = path.join(documentsDir, fileName);
      
      // Generate PDF
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(18);
      doc.text(title, 20, 20);
      
      // Add content
      doc.setFontSize(12);
      const textLines = doc.splitTextToSize(content, 170);
      doc.text(textLines, 20, 30);
      
      // Set metadata
      doc.setProperties({
        title: title,
        subject: `Document for ${project.name}`,
        author: 'Document Generator',
        keywords: documentType,
        creator: 'Requirements Management System'
      });
      
      // Save the PDF
      const pdfOutput = doc.output();
      fs.writeFileSync(filePath, Buffer.from(pdfOutput, 'binary'));
      
      // Record activity
      await db.insert(activities).values({
        type: 'generated_document',
        description: `Generated ${documentType} document for ${project.name}`,
        userId: 1, // Default to admin user
        projectId: parseInt(projectId),
        relatedEntityId: parseInt(projectId)
      });
      
      // Return success response with download URL
      return res.json({
        success: true,
        fileName: fileName,
        downloadUrl: `/api/pdf-files/${fileName}`
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to generate PDF',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Direct download PDF
  app.get('/api/download-pdf/:fileName', (req: Request, res: Response) => {
    try {
      const { fileName } = req.params;
      const filePath = path.join(documentsDir, fileName);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          error: 'PDF not found'
        });
      }
      
      // Set headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      
      // Send file
      return res.sendFile(filePath);
    } catch (error) {
      console.error('Error serving PDF:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to serve PDF',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
}