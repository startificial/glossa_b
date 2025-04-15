/**
 * Enhanced PDF Generator
 * 
 * This is a dedicated module for professional PDF generation that avoids complex content-type issues.
 * It generates well-styled documents including implementation tasks and acceptance criteria.
 */
import express, { Express, Request, Response } from 'express';
import { jsPDF } from 'jspdf';
import path from 'path';
import fs from 'fs';
import { db } from './db';
import { projects, requirements, implementationTasks, activities } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { AcceptanceCriterion } from '@shared/types';

// Create documents directory if it doesn't exist
const documentsDir = path.join(process.cwd(), 'uploads', 'documents');
if (!fs.existsSync(documentsDir)) {
  fs.mkdirSync(documentsDir, { recursive: true });
}

// Font settings for different sections
const fontSettings = {
  header: { size: 24, style: 'bold' },
  subheader: { size: 20, style: 'bold' },
  section: { size: 16, style: 'bold' },
  subsection: { size: 14, style: 'bold' },
  normal: { size: 12, style: 'normal' },
  small: { size: 10, style: 'normal' },
  footer: { size: 10, style: 'italic' }
};

/**
 * Helper function to truncate text if it's too long and add ellipsis
 */
function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

/**
 * Helper function to add a section to the PDF document
 */
function addSection(doc: jsPDF, title: string, content: string, startY: number): number {
  // Add section title
  doc.setFontSize(fontSettings.section.size);
  doc.setFont('helvetica', fontSettings.section.style);
  doc.text(title, 20, startY);
  
  // Add content with normal font
  doc.setFontSize(fontSettings.normal.size);
  doc.setFont('helvetica', fontSettings.normal.style);
  const textLines = doc.splitTextToSize(content, 170);
  doc.text(textLines, 20, startY + 10);
  
  // Calculate the height of the text added
  return startY + 10 + (textLines.length * 7);
}

/**
 * Format acceptance criteria for display
 */
function formatAcceptanceCriteria(criteria: AcceptanceCriterion[]): string {
  if (!criteria || criteria.length === 0) {
    return 'No acceptance criteria defined.';
  }

  let result = '';
  criteria.forEach((criterion, index) => {
    if (criterion.description) {
      result += `Criterion ${index + 1}:\n${criterion.description}\n\n`;
    }
  });
  
  return result;
}

/**
 * Helper function to generate SOW content with better structure and formatting
 */
function generateSowContent(doc: jsPDF, project: any, requirements: any[], tasks: any[]): void {
  const totalHours = tasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
  const hourlyRate = 150;
  const totalCost = totalHours * hourlyRate;
  
  // Logo and header styling
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Add a subtle blue header bar
  doc.setFillColor(235, 245, 255);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  // Document title
  doc.setFontSize(fontSettings.header.size);
  doc.setFont('helvetica', fontSettings.header.style);
  doc.setTextColor(44, 62, 80);
  doc.text(`Statement of Work`, pageWidth / 2, 25, { align: 'center' });
  
  // Project name
  doc.setFontSize(fontSettings.subheader.size);
  doc.text(`${project.name}`, pageWidth / 2, 35, { align: 'center' });
  
  let y = 60; // Starting Y position after header
  
  // Project overview section
  doc.setDrawColor(52, 152, 219);
  doc.line(20, y - 5, pageWidth - 20, y - 5);
  doc.setFontSize(fontSettings.section.size);
  doc.setFont('helvetica', fontSettings.section.style);
  doc.setTextColor(44, 62, 80);
  doc.text("1. PROJECT OVERVIEW", 20, y);
  
  y += 10;
  doc.setFontSize(fontSettings.normal.size);
  doc.setFont('helvetica', fontSettings.normal.style);
  doc.setTextColor(0, 0, 0);
  const overviewText = project.description || 'No project description provided.';
  const overviewLines = doc.splitTextToSize(overviewText, pageWidth - 40);
  doc.text(overviewLines, 20, y);
  
  y += overviewLines.length * 7 + 15;
  
  // Scope of work section
  doc.setDrawColor(52, 152, 219);
  doc.line(20, y - 5, pageWidth - 20, y - 5);
  doc.setFontSize(fontSettings.section.size);
  doc.setFont('helvetica', fontSettings.section.style);
  doc.setTextColor(44, 62, 80);
  doc.text("2. SCOPE OF WORK", 20, y);
  
  y += 10;
  doc.setFontSize(fontSettings.normal.size);
  doc.setFont('helvetica', fontSettings.normal.style);
  doc.setTextColor(0, 0, 0);
  const scopeText = `This Statement of Work outlines the deliverables and services to be provided for the ${project.name} project. It includes detailed requirements, implementation tasks, acceptance criteria, timeline, and costs.`;
  const scopeLines = doc.splitTextToSize(scopeText, pageWidth - 40);
  doc.text(scopeLines, 20, y);
  
  y += scopeLines.length * 7 + 15;
  
  // Requirements section with implementation tasks and acceptance criteria
  doc.setDrawColor(52, 152, 219);
  doc.line(20, y - 5, pageWidth - 20, y - 5);
  doc.setFontSize(fontSettings.section.size);
  doc.setFont('helvetica', fontSettings.section.style);
  doc.setTextColor(44, 62, 80);
  doc.text("3. REQUIREMENTS", 20, y);
  
  y += 10;
  
  // Loop through each requirement and add it with its tasks
  requirements.forEach((req, idx) => {
    // Check if we need a new page
    if (y > pageHeight - 50) {
      doc.addPage();
      y = 20;
    }
    
    // Requirement title with box
    doc.setFillColor(240, 248, 255);
    doc.rect(20, y - 5, pageWidth - 40, 10, 'F');
    doc.setFontSize(fontSettings.subsection.size);
    doc.setFont('helvetica', fontSettings.subsection.style);
    doc.setTextColor(44, 62, 80);
    doc.text(`Requirement ${idx + 1}: ${req.title}`, 25, y);
    
    y += 10;
    
    // Requirement description
    doc.setFontSize(fontSettings.normal.size);
    doc.setFont('helvetica', fontSettings.normal.style);
    doc.setTextColor(0, 0, 0);
    const reqDescLines = doc.splitTextToSize(req.description || 'No description provided.', pageWidth - 50);
    doc.text(reqDescLines, 25, y);
    
    y += reqDescLines.length * 7 + 5;
    
    // Associated tasks
    const reqTasks = tasks.filter(t => t.requirementId === req.id);
    if (reqTasks.length > 0) {
      // Check if we need a new page
      if (y > pageHeight - 60) {
        doc.addPage();
        y = 20;
      }
      
      doc.setFontSize(fontSettings.small.size);
      doc.setFont('helvetica', 'bold');
      doc.text("Implementation Tasks:", 30, y);
      
      y += 7;
      
      // List the tasks
      doc.setFont('helvetica', fontSettings.normal.style);
      reqTasks.forEach((task, taskIdx) => {
        // Check if we need a new page
        if (y > pageHeight - 40) {
          doc.addPage();
          y = 20;
        }
        
        const taskText = `• ${task.title} (${task.estimatedHours || 0} hours)`;
        const taskLines = doc.splitTextToSize(taskText, pageWidth - 70);
        doc.text(taskLines, 35, y);
        y += taskLines.length * 7;
      });
      
      y += 5;
    }
    
    // Acceptance criteria
    if (req.acceptanceCriteria && Array.isArray(req.acceptanceCriteria) && req.acceptanceCriteria.length > 0) {
      // Check if we need a new page
      if (y > pageHeight - 60) {
        doc.addPage();
        y = 20;
      }
      
      doc.setFontSize(fontSettings.small.size);
      doc.setFont('helvetica', 'bold');
      doc.text("Acceptance Criteria:", 30, y);
      
      y += 7;
      
      // List the acceptance criteria
      doc.setFont('helvetica', fontSettings.normal.style);
      req.acceptanceCriteria.forEach((criterion: any, critIdx: number) => {
        // Check if we need a new page
        if (y > pageHeight - 40) {
          doc.addPage();
          y = 20;
        }
        
        if (criterion && criterion.description) {
          const criterionText = `• ${truncateText(criterion.description, 200)}`;
          const criterionLines = doc.splitTextToSize(criterionText, pageWidth - 70);
          doc.text(criterionLines, 35, y);
          y += criterionLines.length * 7;
        }
      });
      
      y += 10;
    } else {
      // If no acceptance criteria
      y += 5;
    }
  });
  
  // Timeline and Milestones section
  // Check if we need a new page
  if (y > pageHeight - 80) {
    doc.addPage();
    y = 20;
  }
  
  doc.setDrawColor(52, 152, 219);
  doc.line(20, y - 5, pageWidth - 20, y - 5);
  doc.setFontSize(fontSettings.section.size);
  doc.setFont('helvetica', fontSettings.section.style);
  doc.setTextColor(44, 62, 80);
  doc.text("4. TIMELINE AND MILESTONES", 20, y);
  
  y += 10;
  doc.setFontSize(fontSettings.normal.size);
  doc.setFont('helvetica', fontSettings.normal.style);
  doc.setTextColor(0, 0, 0);
  
  const timelineText = 
    `Project Start: ${new Date().toLocaleDateString()}\n` +
    `Estimated Completion: ${new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString()}\n\n` +
    `Key Milestones:\n` +
    `• Requirements Finalization: ${new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()}\n` +
    `• Development Phase: ${new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toLocaleDateString()}\n` +
    `• Testing and QA: ${new Date(Date.now() + 75 * 24 * 60 * 60 * 1000).toLocaleDateString()}\n` +
    `• Final Delivery: ${new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString()}`;
  
  const timelineLines = doc.splitTextToSize(timelineText, pageWidth - 40);
  doc.text(timelineLines, 20, y);
  
  y += timelineLines.length * 7 + 15;
  
  // Costs and Payment section
  // Check if we need a new page
  if (y > pageHeight - 80) {
    doc.addPage();
    y = 20;
  }
  
  doc.setDrawColor(52, 152, 219);
  doc.line(20, y - 5, pageWidth - 20, y - 5);
  doc.setFontSize(fontSettings.section.size);
  doc.setFont('helvetica', fontSettings.section.style);
  doc.setTextColor(44, 62, 80);
  doc.text("5. COSTS AND PAYMENT", 20, y);
  
  y += 10;
  doc.setFontSize(fontSettings.normal.size);
  doc.setFont('helvetica', fontSettings.normal.style);
  doc.setTextColor(0, 0, 0);
  
  // Create a cost table
  doc.setFillColor(235, 245, 255);
  doc.rect(40, y, 120, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text("Item", 45, y + 7);
  doc.text("Amount", 130, y + 7);
  
  y += 15;
  doc.setFont('helvetica', 'normal');
  doc.text("Total Estimated Hours", 45, y);
  doc.text(`${totalHours} hours`, 130, y);
  
  y += 10;
  doc.text("Hourly Rate", 45, y);
  doc.text(`$${hourlyRate.toLocaleString()}/hour`, 130, y);
  
  y += 10;
  doc.setFillColor(245, 245, 245);
  doc.rect(40, y - 5, 120, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text("Total Estimated Cost", 45, y + 2);
  doc.text(`$${totalCost.toLocaleString()}`, 130, y + 2);
  
  // Add footer with page numbers
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(fontSettings.footer.size);
    doc.setFont('helvetica', fontSettings.footer.style);
    doc.setTextColor(128, 128, 128);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth - 20, pageHeight - 10, { align: 'right' });
  }
}

/**
 * Helper function to generate Implementation Plan content with better formatting
 */
function generateImplementationPlanContent(doc: jsPDF, project: any, requirements: any[], tasks: any[]): void {
  const totalHours = tasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
  
  // Logo and header styling
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Add a subtle green header bar
  doc.setFillColor(235, 255, 240);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  // Document title
  doc.setFontSize(fontSettings.header.size);
  doc.setFont('helvetica', fontSettings.header.style);
  doc.setTextColor(44, 62, 80);
  doc.text(`Implementation Plan`, pageWidth / 2, 25, { align: 'center' });
  
  // Project name
  doc.setFontSize(fontSettings.subheader.size);
  doc.text(`${project.name}`, pageWidth / 2, 35, { align: 'center' });
  
  let y = 60; // Starting Y position after header
  
  // Project overview section
  doc.setDrawColor(46, 204, 113);
  doc.line(20, y - 5, pageWidth - 20, y - 5);
  doc.setFontSize(fontSettings.section.size);
  doc.setFont('helvetica', fontSettings.section.style);
  doc.setTextColor(44, 62, 80);
  doc.text("1. PROJECT OVERVIEW", 20, y);
  
  y += 10;
  doc.setFontSize(fontSettings.normal.size);
  doc.setFont('helvetica', fontSettings.normal.style);
  doc.setTextColor(0, 0, 0);
  const overviewText = project.description || 'No project description provided.';
  const overviewLines = doc.splitTextToSize(overviewText, pageWidth - 40);
  doc.text(overviewLines, 20, y);
  
  y += overviewLines.length * 7 + 15;
  
  // Implementation approach section
  doc.setDrawColor(46, 204, 113);
  doc.line(20, y - 5, pageWidth - 20, y - 5);
  doc.setFontSize(fontSettings.section.size);
  doc.setFont('helvetica', fontSettings.section.style);
  doc.setTextColor(44, 62, 80);
  doc.text("2. IMPLEMENTATION APPROACH", 20, y);
  
  y += 10;
  doc.setFontSize(fontSettings.normal.size);
  doc.setFont('helvetica', fontSettings.normal.style);
  doc.setTextColor(0, 0, 0);
  const approachText = 
    `This implementation plan provides a detailed roadmap for the completion of the ${project.name} project. The approach includes:\n\n` +
    `• Phase-based Development: Breaking down the implementation into logical phases\n` +
    `• Regular Reviews: Conducting weekly progress reviews and adjustments\n` +
    `• Continuous Testing: Implementing automated and manual testing throughout the process\n` +
    `• Stakeholder Alignment: Regular checkpoints with key stakeholders`;
  
  const approachLines = doc.splitTextToSize(approachText, pageWidth - 40);
  doc.text(approachLines, 20, y);
  
  y += approachLines.length * 7 + 15;
  
  // Requirements and Tasks section
  doc.setDrawColor(46, 204, 113);
  doc.line(20, y - 5, pageWidth - 20, y - 5);
  doc.setFontSize(fontSettings.section.size);
  doc.setFont('helvetica', fontSettings.section.style);
  doc.setTextColor(44, 62, 80);
  doc.text("3. REQUIREMENTS AND TASKS", 20, y);
  
  y += 10;
  
  // Loop through each requirement with its tasks
  requirements.forEach((req, idx) => {
    // Check if we need a new page
    if (y > pageHeight - 70) {
      doc.addPage();
      y = 20;
    }
    
    // Requirement title with box
    doc.setFillColor(240, 255, 245);
    doc.rect(20, y - 5, pageWidth - 40, 10, 'F');
    doc.setFontSize(fontSettings.subsection.size);
    doc.setFont('helvetica', fontSettings.subsection.style);
    doc.setTextColor(44, 62, 80);
    doc.text(`Requirement ${idx + 1}: ${req.title}`, 25, y);
    
    y += 10;
    
    // Requirement description
    doc.setFontSize(fontSettings.normal.size);
    doc.setFont('helvetica', fontSettings.normal.style);
    doc.setTextColor(0, 0, 0);
    const reqDescLines = doc.splitTextToSize(req.description || 'No description provided.', pageWidth - 50);
    doc.text(reqDescLines, 25, y);
    
    y += reqDescLines.length * 7 + 5;
    
    // Implementation tasks
    const reqTasks = tasks.filter(t => t.requirementId === req.id);
    
    // Tasks table header
    if (reqTasks.length > 0) {
      // Check if we need a new page
      if (y > pageHeight - 60) {
        doc.addPage();
        y = 20;
      }
      
      doc.setFontSize(fontSettings.small.size);
      doc.setFont('helvetica', 'bold');
      doc.text("Implementation Tasks:", 30, y);
      
      y += 7;
      
      // Create a tasks table
      doc.setFillColor(235, 245, 240);
      doc.rect(35, y - 5, pageWidth - 70, 10, 'F');
      doc.text("Task", 40, y);
      doc.text("Hours", pageWidth - 45, y);
      
      y += 10;
      
      // List the tasks
      doc.setFont('helvetica', fontSettings.normal.style);
      reqTasks.forEach((task, taskIdx) => {
        // Check if we need a new page
        if (y > pageHeight - 40) {
          doc.addPage();
          y = 20;
        }
        
        // Alternate row colors for better readability
        if (taskIdx % 2 === 0) {
          doc.setFillColor(245, 250, 245);
          doc.rect(35, y - 5, pageWidth - 70, 10, 'F');
        }
        
        const taskText = truncateText(task.title, 80);
        doc.text(taskText, 40, y);
        doc.text(`${task.estimatedHours || 0}`, pageWidth - 45, y);
        y += 10;
      });
      
      y += 5;
    } else {
      // If no tasks are available
      doc.setFontSize(fontSettings.small.size);
      doc.setFont('helvetica', 'italic');
      doc.text("No implementation tasks defined for this requirement.", 30, y);
      y += 10;
    }
    
    // Acceptance criteria
    if (req.acceptanceCriteria && Array.isArray(req.acceptanceCriteria) && req.acceptanceCriteria.length > 0) {
      // Check if we need a new page
      if (y > pageHeight - 60) {
        doc.addPage();
        y = 20;
      }
      
      doc.setFontSize(fontSettings.small.size);
      doc.setFont('helvetica', 'bold');
      doc.text("Acceptance Criteria:", 30, y);
      
      y += 7;
      
      // List the acceptance criteria
      doc.setFont('helvetica', fontSettings.normal.style);
      req.acceptanceCriteria.forEach((criterion: any, critIdx: number) => {
        // Check if we need a new page
        if (y > pageHeight - 40) {
          doc.addPage();
          y = 20;
        }
        
        if (criterion && criterion.description) {
          const criterionText = `• ${truncateText(criterion.description, 200)}`;
          const criterionLines = doc.splitTextToSize(criterionText, pageWidth - 70);
          doc.text(criterionLines, 35, y);
          y += criterionLines.length * 7;
        }
      });
      
      y += 10;
    }
  });
  
  // Check if we need a new page
  if (y > pageHeight - 80) {
    doc.addPage();
    y = 20;
  }
  
  // Timeline and Resources section
  doc.setDrawColor(46, 204, 113);
  doc.line(20, y - 5, pageWidth - 20, y - 5);
  doc.setFontSize(fontSettings.section.size);
  doc.setFont('helvetica', fontSettings.section.style);
  doc.setTextColor(44, 62, 80);
  doc.text("4. TIMELINE AND RESOURCES", 20, y);
  
  y += 10;
  doc.setFontSize(fontSettings.normal.size);
  doc.setFont('helvetica', fontSettings.normal.style);
  doc.setTextColor(0, 0, 0);
  
  // Create a timeline box
  doc.setFillColor(245, 250, 245);
  doc.rect(30, y - 5, pageWidth - 60, 50, 'F');
  
  // Timeline content
  doc.setFont('helvetica', 'bold');
  doc.text("Timeline:", 40, y + 5);
  
  doc.setFont('helvetica', 'normal');
  doc.text("• Project Start: " + new Date().toLocaleDateString(), 50, y + 15);
  doc.text("• Phase 1 - Requirements: " + new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString(), 50, y + 25);
  doc.text("• Phase 2 - Implementation: " + new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toLocaleDateString(), 50, y + 35);
  doc.text("• Project Completion: " + new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString(), 50, y + 45);
  
  y += 60;
  
  // Resources box
  doc.setFillColor(245, 250, 245);
  doc.rect(30, y - 5, pageWidth - 60, 50, 'F');
  
  // Resources content
  doc.setFont('helvetica', 'bold');
  doc.text("Resources Required:", 40, y + 5);
  
  doc.setFont('helvetica', 'normal');
  doc.text(`• Total Estimated Hours: ${totalHours}`, 50, y + 15);
  doc.text("• Project Manager: 1", 50, y + 25);
  doc.text("• Senior Developers: 2", 50, y + 35);
  doc.text("• QA Specialists: 1", 50, y + 45);
  
  y += 60;
  
  // Check if we need a new page
  if (y > pageHeight - 80) {
    doc.addPage();
    y = 20;
  }
  
  // Risk Management section
  doc.setDrawColor(46, 204, 113);
  doc.line(20, y - 5, pageWidth - 20, y - 5);
  doc.setFontSize(fontSettings.section.size);
  doc.setFont('helvetica', fontSettings.section.style);
  doc.setTextColor(44, 62, 80);
  doc.text("5. RISK MANAGEMENT", 20, y);
  
  y += 10;
  doc.setFontSize(fontSettings.normal.size);
  doc.setFont('helvetica', fontSettings.normal.style);
  doc.setTextColor(0, 0, 0);
  
  // Create a risks box
  doc.setFillColor(245, 250, 245);
  doc.rect(30, y - 5, pageWidth - 60, 70, 'F');
  
  // Risks table header
  doc.setFont('helvetica', 'bold');
  doc.text("Risk", 40, y + 5);
  doc.text("Mitigation Strategy", pageWidth / 2, y + 5);
  
  // Risks and mitigation strategies
  doc.setFont('helvetica', 'normal');
  doc.text("Scope Creep", 40, y + 15);
  doc.text("Regular scope reviews and change control process", pageWidth / 2, y + 15);
  
  doc.text("Technical Challenges", 40, y + 25);
  doc.text("Technical spikes and POCs for high-risk components", pageWidth / 2, y + 25);
  
  doc.text("Resource Availability", 40, y + 35);
  doc.text("Cross-training and flexible resource allocation", pageWidth / 2, y + 35);
  
  doc.text("Integration Issues", 40, y + 45);
  doc.text("Early integration testing and environment parity", pageWidth / 2, y + 45);
  
  doc.text("Quality Issues", 40, y + 55);
  doc.text("Automated testing and code reviews", pageWidth / 2, y + 55);
  
  doc.text("Timeline Delays", 40, y + 65);
  doc.text("Buffer time in timeline and frequent progress monitoring", pageWidth / 2, y + 65);
  
  // Add footer with page numbers
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(fontSettings.footer.size);
    doc.setFont('helvetica', fontSettings.footer.style);
    doc.setTextColor(128, 128, 128);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth - 20, pageHeight - 10, { align: 'right' });
  }
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
      
      // Get requirements with acceptance criteria
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
      
      // Create a PDF
      const timestamp = Date.now();
      const fileName = `${documentType}-${timestamp}.pdf`;
      const filePath = path.join(documentsDir, fileName);
      
      // Generate PDF with better formatting
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Set document title and metadata
      let title = '';
      if (documentType === 'sow') {
        title = `Statement of Work - ${project.name}`;
        generateSowContent(doc, project, projectRequirements, tasks);
      } else if (documentType === 'implementation-plan') {
        title = `Implementation Plan - ${project.name}`;
        generateImplementationPlanContent(doc, project, projectRequirements, tasks);
      } else {
        title = `${documentType.charAt(0).toUpperCase() + documentType.slice(1)} - ${project.name}`;
        // Handle other document types here if needed
        doc.text(`Document for ${project.name}\nGenerated on: ${new Date().toLocaleString()}`, 20, 20);
      }
      
      // Set metadata
      doc.setProperties({
        title: title,
        subject: `Document for ${project.name}`,
        author: 'Requirements Management System',
        keywords: documentType,
        creator: 'Document Generator'
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