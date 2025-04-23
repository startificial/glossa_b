/**
 * Job Worker Process
 * 
 * This is a separate Node.js process spawned by the main application to handle
 * resource-intensive tasks like PDF processing. By handling these tasks in a
 * separate process, we avoid memory issues in the main application.
 * 
 * The worker:
 * 1. Loads job data from a temporary file
 * 2. Processes the job based on its type
 * 3. Reports progress during processing
 * 4. Returns the result to the parent process
 * 5. Handles errors and cleanup
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Job handlers
const jobHandlers = {
  // PDF processing handler
  async pdf_processing(jobData) {
    try {
      // Load the required modules
      const { processPdfFile } = await import('./pdf-processor.js');
      
      // Extract job data
      const { 
        filePath, 
        projectName, 
        fileName, 
        contentType, 
        reqPerChunk, 
        allowLargeFiles,
        inputDataId 
      } = jobData;
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      
      // Report initial progress
      process.send({ type: 'progress', progress: 0 });
      
      // Process the PDF file
      const requirements = await processPdfFile(
        filePath,
        projectName,
        fileName,
        contentType,
        reqPerChunk,
        allowLargeFiles,
        inputDataId
      );
      
      // Report complete progress
      process.send({ type: 'progress', progress: 100 });
      
      // Return the requirements
      return requirements;
    } catch (error) {
      console.error('Error in PDF processing job:', error);
      throw error;
    }
  },
  
  // Large file processing handler with more memory-efficient approach
  async large_file_processing(jobData) {
    try {
      // Load the required modules
      const { streamProcessPdfText } = await import('./stream-pdf-processor.js');
      
      // Extract job data
      const { 
        pdfText, 
        pdfPath, 
        projectName, 
        fileName, 
        contentType, 
        minRequirements,
        inputDataId 
      } = jobData;
      
      // Report initial progress
      process.send({ type: 'progress', progress: 0 });
      
      // Process the large file text in a streaming manner
      const requirements = await streamProcessPdfText(
        pdfText,
        pdfPath,
        projectName,
        fileName,
        contentType,
        minRequirements,
        inputDataId
      );
      
      // Report complete progress
      process.send({ type: 'progress', progress: 100 });
      
      // Return the requirements
      return requirements;
    } catch (error) {
      console.error('Error in large file processing job:', error);
      throw error;
    }
  },
  
  // Generic batch operation handler
  async batch_operation(jobData) {
    try {
      // Extract job data
      const { items, operationFunction, operationParams } = jobData;
      
      if (!items || !Array.isArray(items)) {
        throw new Error('Invalid batch items: array expected');
      }
      
      // Initialize results array
      const results = [];
      
      // Process items in smaller batches to manage memory
      const batchSize = 5;
      const totalItems = items.length;
      
      for (let i = 0; i < totalItems; i += batchSize) {
        // Get current batch
        const batch = items.slice(i, i + batchSize);
        
        // Report progress
        const progress = Math.round((i / totalItems) * 100);
        process.send({ type: 'progress', progress });
        
        // Process batch
        const batchResults = await Promise.all(
          batch.map(item => {
            // Find and execute the specified operation
            switch (operationFunction) {
              case 'processItem':
                // Example function - replace with actual implementation
                return processItem(item, operationParams);
              default:
                throw new Error(`Unknown operation function: ${operationFunction}`);
            }
          })
        );
        
        // Add batch results to overall results
        results.push(...batchResults);
        
        // Give the GC a chance to clean up after each batch
        if (global.gc) {
          global.gc();
        }
      }
      
      // Report complete progress
      process.send({ type: 'progress', progress: 100 });
      
      // Return the combined results
      return results;
    } catch (error) {
      console.error('Error in batch operation job:', error);
      throw error;
    }
  }
  
  // Add more job type handlers as needed
};

// Example item processing function (customize as needed)
async function processItem(item, params) {
  // Process a single item in the batch
  return { ...item, processed: true, params };
}

/**
 * Main worker function
 */
async function main() {
  try {
    // Get job data file path from command-line arguments
    const jobDataPath = process.argv[2];
    
    if (!jobDataPath || !fs.existsSync(jobDataPath)) {
      throw new Error(`Job data file not found: ${jobDataPath}`);
    }
    
    // Read job data
    const jobDataString = fs.readFileSync(jobDataPath, 'utf8');
    const job = JSON.parse(jobDataString);
    
    // Check for valid job
    if (!job || !job.id || !job.type || !job.data) {
      throw new Error('Invalid job data');
    }
    
    console.log(`Worker started for job ${job.id} of type ${job.type}`);
    
    // Find handler for job type
    const handler = jobHandlers[job.type];
    
    if (!handler) {
      throw new Error(`No handler found for job type: ${job.type}`);
    }
    
    // Process job
    const result = await handler(job.data);
    
    // Send result to parent process
    process.send({ type: 'completed', result });
    
    // Exit with success code
    process.exit(0);
  } catch (error) {
    console.error('Error in job worker:', error);
    
    // Send error to parent process
    process.send({ 
      type: 'failed', 
      error: error.message || 'Unknown error in job worker' 
    });
    
    // Exit with error code
    process.exit(1);
  }
}

// Start worker
main().catch(error => {
  console.error('Unhandled error in job worker:', error);
  process.exit(1);
});