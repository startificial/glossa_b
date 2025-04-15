/**
 * PDF Document Generator
 * 
 * This module handles the generation of PDF documents for projects:
 * - Statement of Work (SOW)
 * - Implementation Plan
 */
import { Project, Requirement, ImplementationTask } from '@shared/schema';
import path from 'path';
import fs from 'fs/promises';
import { jsPDF } from 'jspdf';

/**
 * Helper function to safely convert a string to HTML
 * This helps prevent XSS and other injection attacks
 */
function safeHtml(str: string | null | undefined): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generate SOW plain text content for PDF
 */
function generateSowPdfContent(
  project: Project,
  requirements: Requirement[],
  tasks: ImplementationTask[]
): string {
  // Calculate totals
  const totalHours = tasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
  const hourlyRate = 150;
  const totalCost = totalHours * hourlyRate;
  
  // Format date
  const currentDate = new Date().toISOString().split('T')[0];
  // Format end date (90 days from now)
  const endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  let content = '';
  
  // Title
  content += `STATEMENT OF WORK\n\n`;
  content += `Project: ${project.name}\n`;
  content += `Date: ${currentDate}\n\n`;
  
  // Introduction
  content += `1. INTRODUCTION\n\n`;
  content += `Client: ${project.customer || 'Client'}\n`;
  content += `Source System: ${project.sourceSystem || 'Legacy System'}\n`;
  content += `Target System: ${project.targetSystem || 'New System'}\n\n`;
  content += `This Statement of Work (SOW) outlines the software implementation work to be performed `;
  content += `for the migration from ${project.sourceSystem || 'Legacy System'} to ${project.targetSystem || 'New System'}.\n\n`;
  
  // Project Description
  content += `2. PROJECT DESCRIPTION\n\n`;
  content += `${project.description || 'No description provided.'}\n\n`;
  
  // Requirements
  content += `3. REQUIREMENTS (${requirements.length})\n\n`;
  requirements.forEach(req => {
    content += `REQ-${req.id}: ${req.description}\n`;
    content += `Category: ${req.category} | Priority: ${req.priority}\n\n`;
  });
  
  // Implementation Tasks
  content += `4. IMPLEMENTATION TASKS (${tasks.length})\n\n`;
  tasks.forEach(task => {
    content += `TASK-${task.id}: ${task.title}\n`;
    content += `Status: ${task.status} | Estimated Hours: ${task.estimatedHours || 'Not specified'}\n\n`;
  });
  
  // Timeline & Cost
  content += `5. TIMELINE & COST\n\n`;
  content += `Estimated Hours: ${totalHours}\n`;
  content += `Hourly Rate: $${hourlyRate}\n`;
  content += `Estimated Cost: $${totalCost.toLocaleString()}\n`;
  content += `Start Date: ${currentDate}\n`;
  content += `End Date: ${endDate}\n\n`;
  
  // Signatures
  content += `6. SIGNATURES\n\n`;
  content += `Client Representative: ________________________  Date: __________\n\n`;
  content += `Implementation Team Lead: _____________________ Date: __________\n\n`;
  
  return content;
}

/**
 * Generate Implementation Plan plain text content for PDF
 */
function generateImplementationPlanPdfContent(
  project: Project,
  requirements: Requirement[],
  tasks: ImplementationTask[]
): string {
  // Calculate totals
  const totalHours = tasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
  
  // Format date
  const currentDate = new Date().toISOString().split('T')[0];
  // Format end date (90 days from now)
  const endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  let content = '';
  
  // Title
  content += `IMPLEMENTATION PLAN\n\n`;
  content += `Project: ${project.name}\n`;
  content += `Date: ${currentDate}\n\n`;
  
  // Overview
  content += `1. OVERVIEW\n\n`;
  content += `This implementation plan outlines the steps required to successfully migrate `;
  content += `from ${project.sourceSystem || 'Legacy System'} to ${project.targetSystem || 'New System'}.\n\n`;
  
  // Implementation Approach
  content += `2. IMPLEMENTATION APPROACH\n\n`;
  content += `The implementation will follow a phased approach to ensure minimal disruption to business operations.\n\n`;
  
  // Implementation Tasks
  content += `3. IMPLEMENTATION TASKS (${tasks.length})\n\n`;
  tasks.forEach((task, index) => {
    content += `TASK ${index + 1}: ${task.title}\n`;
    content += `Status: ${task.status} | Priority: ${task.priority} | Complexity: ${task.complexity || 'N/A'}\n`;
    content += `Estimated Hours: ${task.estimatedHours || 'Not specified'}\n`;
    content += `${task.description || 'No description provided.'}\n\n`;
  });
  
  // Timeline
  content += `4. TIMELINE\n\n`;
  content += `Estimated Total Hours: ${totalHours}\n`;
  content += `Start Date: ${currentDate}\n`;
  content += `End Date: ${endDate}\n\n`;
  
  // Approval
  content += `5. APPROVAL\n\n`;
  content += `Implementation Team Lead: _____________________ Date: __________\n\n`;
  content += `Project Sponsor: _____________________________ Date: __________\n\n`;
  
  return content;
}

/**
 * Main function to generate a document
 */
export async function generateDocument(
  documentType: string,
  projectId: number,
  project: Project,
  requirements: Requirement[],
  tasks: ImplementationTask[]
): Promise<string> {
  try {
    console.log(`Generating ${documentType} document for project ${projectId}`);
    console.log(`Project data:`, JSON.stringify(project, null, 2));
    console.log(`Requirements count: ${requirements.length}`);
    console.log(`Tasks count: ${tasks.length}`);
    
    if (!project || !project.name) {
      throw new Error("Invalid project data: project name is required");
    }
    
    // Sanitize project name for filename (remove special characters)
    const safeProjectName = (project.name || "untitled")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    // Ensure output directory exists
    const outputDir = path.join(process.cwd(), 'uploads', 'documents');
    console.log('Creating directory if not exists:', outputDir);
    await fs.mkdir(outputDir, { recursive: true });
    
    // Generate file name with PDF extension
    const timestamp = Date.now();
    const fileName = `${documentType}-${safeProjectName}-${timestamp}.pdf`;
    const outputPath = path.join(outputDir, fileName);
    
    console.log(`Will save document to: ${outputPath}`);
    
    // Generate content for the PDF
    let pdfContent = '';
    let title = '';
    
    switch (documentType) {
      case 'sow':
        title = `Statement of Work - ${safeHtml(project.name)}`;
        pdfContent = generateSowPdfContent(project, requirements, tasks);
        break;
      case 'implementation-plan':
        title = `Implementation Plan - ${safeHtml(project.name)}`;
        pdfContent = generateImplementationPlanPdfContent(project, requirements, tasks);
        break;
      default:
        title = `Document - ${documentType}`;
        pdfContent = `Document type "${documentType}" not yet implemented.`;
    }
    
    console.log(`Generating PDF for: ${title}`);
    
    try {
      // Ensure the directory exists before writing
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      
      // Create PDF document
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(18);
      doc.text(title, 20, 20);
      doc.setFontSize(12);
      
      // Add content
      // Split content into lines that fit within the page width
      const textLines = doc.splitTextToSize(pdfContent, 170);
      doc.text(textLines, 20, 30);
      
      // Add metadata to help with debugging
      doc.setProperties({
        title: title,
        subject: `Document for ${project.name}`,
        author: 'Document Generator',
        keywords: documentType,
        creator: 'Requirement Management System'
      });
      
      // Save the PDF - use binary output
      const pdfOutput = doc.output();
      await fs.writeFile(outputPath, Buffer.from(pdfOutput, 'binary'));
      
      console.log(`Generated PDF document at: ${outputPath}`);
      
      // Verify the file was created
      await fs.access(outputPath);
      console.log(`Verified file exists at: ${outputPath}`);
      
      // Return the output path for the download route
      return outputPath;
    } catch (error) {
      console.error(`Error writing document to file:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to write document to file: ${errorMessage}`);
    }
  } catch (error) {
    console.error(`Error generating ${documentType} document:`, error);
    throw error;
  }
}