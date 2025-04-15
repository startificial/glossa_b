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
    await fs.mkdir(outputDir, { recursive: true });
    
    // Generate file name - using HTML for now since we're skipping Puppeteer
    const timestamp = Date.now();
    const fileName = `${documentType}-${safeProjectName}-${timestamp}.html`;
    const outputPath = path.join(outputDir, fileName);
    
    console.log(`Will save document to: ${outputPath}`);
    
    // Generate HTML content
    let htmlContent = '';
    
    switch (documentType) {
      case 'sow':
        htmlContent = generateSowHtml(project, requirements, tasks);
        break;
      case 'implementation-plan':
        htmlContent = generateImplementationPlanHtml(project, requirements, tasks);
        break;
      default:
        htmlContent = `<html><body><h1>Document type "${documentType}" not yet implemented.</h1></body></html>`;
    }
    
    // Write HTML directly to file
    try {
      await fs.writeFile(outputPath, htmlContent, 'utf-8');
      console.log(`Generated HTML document at: ${outputPath}`);
      
      // Verify the file was created
      await fs.access(outputPath);
      
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