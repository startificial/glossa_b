/**
 * Minimal Document Generator
 * 
 * Simplified version with no complex templates to avoid parsing issues
 * Uses Puppeteer to generate PDF files
 */
import { Project, Requirement, ImplementationTask } from '@shared/schema';
import path from 'path';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import puppeteer from 'puppeteer';
import handlebars from 'handlebars';

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
    // Ensure output directory exists
    const outputDir = path.join(process.cwd(), 'uploads', 'documents');
    await fs.mkdir(outputDir, { recursive: true });
    
    // Generate file name
    const fileName = `${documentType}-${project.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.pdf`;
    const outputPath = path.join(outputDir, fileName);
    
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
    
    // Create a temporary HTML file
    const tempHtmlPath = path.join(outputDir, `temp-${Date.now()}.html`);
    await fs.writeFile(tempHtmlPath, htmlContent, 'utf-8');
    
    // Generate PDF with Puppeteer
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true
    });
    const page = await browser.newPage();
    
    // Load HTML content directly
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    // Generate PDF
    await page.pdf({
      path: outputPath,
      format: 'A4',
      margin: {
        top: '1cm',
        right: '1cm',
        bottom: '1cm',
        left: '1cm'
      },
      printBackground: true
    });
    
    // Clean up
    await browser.close();
    await fs.unlink(tempHtmlPath).catch(e => console.warn('Failed to delete temp HTML file:', e));
    
    console.log(`Generated PDF document at: ${outputPath}`);
    return outputPath;
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
  <title>Statement of Work - ${project.name}</title>
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
    <p>Project: ${project.name}</p>
    <p>Date: ${currentDate}</p>
  </div>
  
  <div class="section">
    <h2>1. INTRODUCTION</h2>
    <p><span class="meta-label">Client:</span> ${project.customer || 'Client'}</p>
    <p><span class="meta-label">Source System:</span> ${project.sourceSystem || 'Legacy System'}</p>
    <p><span class="meta-label">Target System:</span> ${project.targetSystem || 'New System'}</p>
    <p>This Statement of Work (SOW) outlines the software implementation work to be performed 
    for the migration from ${project.sourceSystem || 'Legacy System'} to ${project.targetSystem || 'New System'}.</p>
  </div>
  
  <div class="section">
    <h2>2. PROJECT DESCRIPTION</h2>
    <p>${project.description || 'No description provided.'}</p>
  </div>
  
  <div class="section">
    <h2>3. REQUIREMENTS (${requirements.length})</h2>
    ${requirements.map(req => `
      <div class="req-item">
        <div class="req-title">REQ-${req.id}: ${req.description}</div>
        <div class="req-meta">
          <span class="meta-label">Category:</span> ${req.category} | 
          <span class="meta-label">Priority:</span> ${req.priority}
        </div>
      </div>
    `).join('')}
  </div>
  
  <div class="section">
    <h2>4. IMPLEMENTATION TASKS (${tasks.length})</h2>
    ${tasks.map(task => `
      <div class="task-item">
        <div class="task-title">TASK-${task.id}: ${task.title}</div>
        <div class="task-meta">
          <span class="meta-label">Status:</span> ${task.status} | 
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
  <title>Implementation Plan - ${project.name}</title>
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
    <p>Project: ${project.name}</p>
    <p>Date: ${currentDate}</p>
  </div>
  
  <div class="section">
    <h2>1. OVERVIEW</h2>
    <p>This implementation plan outlines the steps required to successfully migrate 
    from ${project.sourceSystem || 'Legacy System'} to ${project.targetSystem || 'New System'}.</p>
  </div>
  
  <div class="section">
    <h2>2. IMPLEMENTATION APPROACH</h2>
    <p>The implementation will follow a phased approach to ensure minimal disruption to business operations.</p>
  </div>
  
  <div class="section">
    <h2>3. IMPLEMENTATION TASKS (${tasks.length})</h2>
    ${tasks.map((task, index) => `
      <div class="task-item">
        <div class="task-title">TASK ${index + 1}: ${task.title}</div>
        <div class="task-meta">
          <span class="meta-label">Status:</span> ${task.status} | 
          <span class="meta-label">Priority:</span> ${task.priority} | 
          <span class="meta-label">Complexity:</span> ${task.complexity} | 
          <span class="meta-label">Estimated Hours:</span> ${task.estimatedHours || 'Not specified'}
        </div>
        <div class="task-description">
          ${task.description || 'No description provided.'}
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