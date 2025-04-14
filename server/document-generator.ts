/**
 * Minimal Document Generator
 * 
 * Simplified version with no complex templates to avoid parsing issues
 */
import { Project, Requirement, ImplementationTask } from '@shared/schema';
import path from 'path';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';

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
    const fileName = `${documentType}-${project.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.txt`;
    const outputPath = path.join(outputDir, fileName);
    
    // Generate content based on document type
    let content = '';
    
    switch (documentType) {
      case 'sow':
        content = generateSowContent(project, requirements, tasks);
        break;
      case 'implementation-plan':
        content = generateImplementationPlanContent(project, requirements, tasks);
        break;
      default:
        content = `Document type "${documentType}" not yet implemented.`;
    }
    
    // Write content to file
    await fs.writeFile(outputPath, content, 'utf-8');
    
    return outputPath;
  } catch (error) {
    console.error(`Error generating ${documentType} document:`, error);
    throw error;
  }
}

/**
 * Generate SOW content
 */
function generateSowContent(
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
  
  return `
STATEMENT OF WORK
=====================================
Project: ${project.name}
Date: ${currentDate}

1. INTRODUCTION
-------------------------------------
Client: ${project.customer || 'Client'}
Project Type: ${project.type}
Source System: ${project.sourceSystem || 'Legacy System'}
Target System: ${project.targetSystem || 'New System'}

This Statement of Work (SOW) outlines the software implementation work to be performed 
for the migration from ${project.sourceSystem || 'Legacy System'} to ${project.targetSystem || 'New System'}.

2. PROJECT DESCRIPTION
-------------------------------------
${project.description || 'No description provided.'}

3. REQUIREMENTS (${requirements.length})
-------------------------------------
${requirements.map(req => 
  `REQ-${req.id}: ${req.description}
   - Category: ${req.category}
   - Priority: ${req.priority}`
).join('\n\n')}

4. IMPLEMENTATION TASKS (${tasks.length})
-------------------------------------
${tasks.map(task => 
  `TASK-${task.id}: ${task.title}
   - Status: ${task.status}
   - Estimated Hours: ${task.estimatedHours || 'Not specified'}`
).join('\n\n')}

5. TIMELINE & COST
-------------------------------------
Estimated Hours: ${totalHours}
Estimated Cost: $${totalCost}
Start Date: ${currentDate}
End Date: ${new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}

6. SIGNATURES
-------------------------------------
Client Representative: ________________________  Date: ____________

Implementation Team Lead: ____________________  Date: ____________
`;
}

/**
 * Generate Implementation Plan content
 */
function generateImplementationPlanContent(
  project: Project,
  requirements: Requirement[],
  tasks: ImplementationTask[]
): string {
  // Calculate totals
  const totalHours = tasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
  
  // Format date
  const currentDate = new Date().toISOString().split('T')[0];
  
  return `
IMPLEMENTATION PLAN
=====================================
Project: ${project.name}
Date: ${currentDate}

1. OVERVIEW
-------------------------------------
This implementation plan outlines the steps required to successfully migrate 
from ${project.sourceSystem || 'Legacy System'} to ${project.targetSystem || 'New System'}.

2. IMPLEMENTATION APPROACH
-------------------------------------
The implementation will follow a phased approach to ensure minimal disruption to business operations.

3. IMPLEMENTATION TASKS (${tasks.length})
-------------------------------------
${tasks.map((task, index) => 
  `TASK ${index + 1}: ${task.title}
   - Status: ${task.status}
   - Priority: ${task.priority}
   - Complexity: ${task.complexity}
   - Estimated Hours: ${task.estimatedHours || 'Not specified'}
   
   Description: ${task.description}`
).join('\n\n')}

4. TIMELINE
-------------------------------------
Estimated Total Hours: ${totalHours}
Start Date: ${currentDate}
End Date: ${new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}

5. APPROVAL
-------------------------------------
Implementation Team Lead: ___________________  Date: ________

Project Sponsor: ___________________________  Date: ________
`;
}