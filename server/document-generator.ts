/**
 * Minimal Document Generator
 * 
 * Simplified version with no complex templates to avoid parsing issues
 * Creates HTML files directly (avoiding Puppeteer which might have environment issues)
 */
import { Project, Requirement, ImplementationTask } from '@shared/schema';
import path from 'path';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
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
      
      // Save the PDF
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

/**
 * Generate SOW HTML content
 */

/**
 * Generate SOW HTML content - kept for reference
 */
function generateSowHtml(
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
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Statement of Work - ${safeHtml(project.name)}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #3366cc;
    }
    h1 {
      color: #3366cc;
      font-size: 24px;
      margin-bottom: 10px;
    }
    h2 {
      color: #3366cc;
      font-size: 18px;
      margin-top: 30px;
      padding-bottom: 5px;
      border-bottom: 1px solid #ddd;
    }
    .section {
      margin-bottom: 20px;
    }
    .req-item, .task-item {
      margin-bottom: 15px;
      padding: 10px;
      background-color: #f9f9f9;
      border-radius: 4px;
    }
    .req-title, .task-title {
      font-weight: bold;
      margin-bottom: 5px;
    }
    .req-meta, .task-meta {
      font-size: 14px;
      color: #666;
    }
    .meta-label {
      font-weight: bold;
    }
    .signature-box {
      margin-top: 15px;
      padding-top: 50px;
      border-top: 1px dotted #999;
    }
    .signature-line {
      display: flex;
      margin-bottom: 30px;
    }
    .signature-name {
      flex: 1;
      border-top: 1px solid #000;
      margin-right: 20px;
    }
    .signature-date {
      width: 150px;
      border-top: 1px solid #000;
    }
    .cost-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    .cost-table th, .cost-table td {
      padding: 10px;
      border: 1px solid #ddd;
      text-align: left;
    }
    .cost-table th {
      background-color: #f0f0f0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>STATEMENT OF WORK</h1>
    <p>Project: ${safeHtml(project.name)}</p>
    <p>Date: ${currentDate}</p>
  </div>
  
  <div class="section">
    <h2>1. INTRODUCTION</h2>
    <p><span class="meta-label">Client:</span> ${safeHtml(project.customer) || 'Client'}</p>
    <p><span class="meta-label">Source System:</span> ${safeHtml(project.sourceSystem) || 'Legacy System'}</p>
    <p><span class="meta-label">Target System:</span> ${safeHtml(project.targetSystem) || 'New System'}</p>
    <p>This Statement of Work (SOW) outlines the software implementation work to be performed 
    for the migration from ${safeHtml(project.sourceSystem) || 'Legacy System'} to ${safeHtml(project.targetSystem) || 'New System'}.</p>
  </div>
  
  <div class="section">
    <h2>2. PROJECT DESCRIPTION</h2>
    <p>${safeHtml(project.description) || 'No description provided.'}</p>
  </div>
  
  <div class="section">
    <h2>3. REQUIREMENTS (${requirements.length})</h2>
    ${requirements.map(req => `
      <div class="req-item">
        <div class="req-title">REQ-${req.id}: ${safeHtml(req.description)}</div>
        <div class="req-meta">
          <span class="meta-label">Category:</span> ${safeHtml(req.category)} | 
          <span class="meta-label">Priority:</span> ${safeHtml(req.priority)}
        </div>
      </div>
    `).join('')}
  </div>
  
  <div class="section">
    <h2>4. IMPLEMENTATION TASKS (${tasks.length})</h2>
    ${tasks.map(task => `
      <div class="task-item">
        <div class="task-title">TASK-${task.id}: ${safeHtml(task.title)}</div>
        <div class="task-meta">
          <span class="meta-label">Status:</span> ${safeHtml(task.status)} | 
          <span class="meta-label">Estimated Hours:</span> ${task.estimatedHours || 'Not specified'}
        </div>
      </div>
    `).join('')}
  </div>
  
  <div class="section">
    <h2>5. TIMELINE & COST</h2>
    <table class="cost-table">
      <tr>
        <th>Item</th>
        <th>Value</th>
      </tr>
      <tr>
        <td>Estimated Hours</td>
        <td>${totalHours}</td>
      </tr>
      <tr>
        <td>Hourly Rate</td>
        <td>$${hourlyRate}</td>
      </tr>
      <tr>
        <td>Estimated Cost</td>
        <td>$${totalCost.toLocaleString()}</td>
      </tr>
      <tr>
        <td>Start Date</td>
        <td>${currentDate}</td>
      </tr>
      <tr>
        <td>End Date</td>
        <td>${endDate}</td>
      </tr>
    </table>
  </div>
  
  <div class="section">
    <h2>6. SIGNATURES</h2>
    <div class="signature-box">
      <div class="signature-line">
        <div class="signature-name">Client Representative</div>
        <div class="signature-date">Date</div>
      </div>
      
      <div class="signature-line">
        <div class="signature-name">Implementation Team Lead</div>
        <div class="signature-date">Date</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generate Implementation Plan HTML content
 */
function generateImplementationPlanHtml(
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
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Implementation Plan - ${safeHtml(project.name)}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #3366cc;
    }
    h1 {
      color: #3366cc;
      font-size: 24px;
      margin-bottom: 10px;
    }
    h2 {
      color: #3366cc;
      font-size: 18px;
      margin-top: 30px;
      padding-bottom: 5px;
      border-bottom: 1px solid #ddd;
    }
    .section {
      margin-bottom: 20px;
    }
    .task-item {
      margin-bottom: 20px;
      padding: 10px;
      background-color: #f9f9f9;
      border-radius: 4px;
    }
    .task-title {
      font-weight: bold;
      margin-bottom: 5px;
    }
    .task-meta {
      font-size: 14px;
      color: #666;
      margin-bottom: 8px;
    }
    .task-description {
      margin-top: 10px;
      padding-left: 10px;
      border-left: 3px solid #ddd;
    }
    .meta-label {
      font-weight: bold;
    }
    .signature-box {
      margin-top: 15px;
      padding-top: 50px;
      border-top: 1px dotted #999;
    }
    .signature-line {
      display: flex;
      margin-bottom: 30px;
    }
    .signature-name {
      flex: 1;
      border-top: 1px solid #000;
      margin-right: 20px;
    }
    .signature-date {
      width: 150px;
      border-top: 1px solid #000;
    }
    .timeline-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    .timeline-table th, .timeline-table td {
      padding: 10px;
      border: 1px solid #ddd;
      text-align: left;
    }
    .timeline-table th {
      background-color: #f0f0f0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>IMPLEMENTATION PLAN</h1>
    <p>Project: ${safeHtml(project.name)}</p>
    <p>Date: ${currentDate}</p>
  </div>
  
  <div class="section">
    <h2>1. OVERVIEW</h2>
    <p>This implementation plan outlines the steps required to successfully migrate 
    from ${safeHtml(project.sourceSystem) || 'Legacy System'} to ${safeHtml(project.targetSystem) || 'New System'}.</p>
  </div>
  
  <div class="section">
    <h2>2. IMPLEMENTATION APPROACH</h2>
    <p>The implementation will follow a phased approach to ensure minimal disruption to business operations.</p>
  </div>
  
  <div class="section">
    <h2>3. IMPLEMENTATION TASKS (${tasks.length})</h2>
    ${tasks.map((task, index) => `
      <div class="task-item">
        <div class="task-title">TASK ${index + 1}: ${safeHtml(task.title)}</div>
        <div class="task-meta">
          <span class="meta-label">Status:</span> ${safeHtml(task.status)} | 
          <span class="meta-label">Priority:</span> ${safeHtml(task.priority)} | 
          <span class="meta-label">Complexity:</span> ${safeHtml(task.complexity)} | 
          <span class="meta-label">Estimated Hours:</span> ${task.estimatedHours || 'Not specified'}
        </div>
        <div class="task-description">
          ${safeHtml(task.description) || 'No description provided.'}
        </div>
      </div>
    `).join('')}
  </div>
  
  <div class="section">
    <h2>4. TIMELINE</h2>
    <table class="timeline-table">
      <tr>
        <th>Item</th>
        <th>Value</th>
      </tr>
      <tr>
        <td>Estimated Total Hours</td>
        <td>${totalHours}</td>
      </tr>
      <tr>
        <td>Start Date</td>
        <td>${currentDate}</td>
      </tr>
      <tr>
        <td>End Date</td>
        <td>${endDate}</td>
      </tr>
    </table>
  </div>
  
  <div class="section">
    <h2>5. APPROVAL</h2>
    <div class="signature-box">
      <div class="signature-line">
        <div class="signature-name">Implementation Team Lead</div>
        <div class="signature-date">Date</div>
      </div>
      
      <div class="signature-line">
        <div class="signature-name">Project Sponsor</div>
        <div class="signature-date">Date</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}