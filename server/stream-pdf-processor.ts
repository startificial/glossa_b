/**
 * Specialized processor for handling large PDFs with memory-efficient stream processing 
 */
import fs from 'fs';
import path from 'path';
import { processTextFile } from './gemini.js';

/**
 * Process a PDF file in a memory-efficient, streaming way that prevents heap out of memory errors
 * @param extractedText The full text extracted from the PDF
 * @param tempFilePath Path to create temporary files in
 * @param projectName Name of the project 
 * @param fileName Name of the original file
 * @param contentType Type of content being processed
 * @param minRequirements Minimum number of requirements to extract
 * @param inputDataId The ID of the input data (for text references)
 * @returns Array of requirements
 */
export async function streamProcessPdfText(
  extractedText: string,
  tempFilePath: string,
  projectName: string, 
  fileName: string,
  contentType: string = 'general',
  minRequirements: number = 5,
  inputDataId?: number
): Promise<any[]> {
  console.log(`Starting ultra memory-efficient stream processing for ${extractedText.length} characters of text`);
  
  // Create a separate temporary text file
  const textFilePath = path.join(path.dirname(tempFilePath), 'extracted_' + path.basename(tempFilePath, '.pdf') + '.txt');
  
  // Write the entire text to the file
  fs.writeFileSync(textFilePath, extractedText, 'utf8');
  console.log(`Wrote full text to temporary file: ${textFilePath}`);
  
  // Free large strings from memory
  extractedText = "";
  
  try {
    // Try to force garbage collection implicitly
    const largeArrays = [];
    for (let i = 0; i < 5; i++) {
      largeArrays.push(new Array(1000).fill(0));
    }
    // Release references
    largeArrays.length = 0;
  } catch (e) {
    // Ignore allocation errors
  }
  
  // Stream-process the file in tiny chunks
  const MAX_CHUNK_SIZE = 1000; // Very small chunk size
  
  // Count approx number of chunks
  const fileStats = fs.statSync(textFilePath);
  const estimatedChunks = Math.ceil(fileStats.size / MAX_CHUNK_SIZE);
  console.log(`File size: ${fileStats.size} bytes, estimated chunks: ${estimatedChunks}`);
  
  // Collect all requirements
  const allRequirements: any[] = [];
  
  try {
    // Define process chunk function
    const processChunk = async (chunkText: string, index: number): Promise<void> => {
      const chunkFilePath = path.join(
        path.dirname(tempFilePath), 
        `chunk_${index}_${path.basename(tempFilePath, '.pdf')}.txt`
      );
      
      try {
        // Write chunk to temporary file
        fs.writeFileSync(chunkFilePath, chunkText, 'utf8');
        console.log(`Processing stream chunk ${index}/${estimatedChunks} (${chunkText.length} chars)`);
        
        // Process this chunk
        try {
          const chunkRequirements = await processTextFile(
            chunkFilePath,
            projectName,
            `${fileName} (Part ${index})`,
            contentType,
            Math.max(1, Math.round(minRequirements / estimatedChunks)), // Distribute min requirements
            inputDataId // Pass input data ID for text references
          );
          
          // Add to our collection
          if (chunkRequirements && chunkRequirements.length) {
            for (const req of chunkRequirements) {
              allRequirements.push(req);
            }
            console.log(`Added ${chunkRequirements.length} requirements from chunk ${index}`);
          }
        } catch (processingError) {
          console.error(`Error processing chunk ${index}:`, processingError);
        }
        
        // Clean up chunk file
        try {
          fs.unlinkSync(chunkFilePath);
        } catch (unlinkError) {
          console.warn(`Could not delete chunk file ${chunkFilePath}:`, unlinkError);
        }
        
        // Manual memory cleanup attempt
        try {
          const dummyArrays = [];
          for (let i = 0; i < 3; i++) {
            dummyArrays.push(new Array(500).fill(0));
          }
          dummyArrays.length = 0;
        } catch (e) {
          // Ignore errors
        }
        
        // Pause between chunks to let memory settle
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (chunkError) {
        console.error(`General error in chunk ${index} processing:`, chunkError);
      }
    };
    
    // Use file streaming instead of loading everything into memory
    const fileStream = fs.createReadStream(textFilePath, { 
      encoding: 'utf8',
      highWaterMark: MAX_CHUNK_SIZE // Process small chunks at a time
    });
    
    let buffer = '';
    let chunkIndex = 0;
    
    // Process file in a streaming fashion
    for await (const chunk of fileStream) {
      buffer += chunk;
      
      // Process in chunks of roughly MAX_CHUNK_SIZE, accounting for sentences
      while (buffer.length >= MAX_CHUNK_SIZE) {
        // Find a good break point (end of sentence) to avoid cutting mid-sentence
        let breakPoint = MAX_CHUNK_SIZE;
        while (breakPoint > 0 && !'.!?\n'.includes(buffer[breakPoint])) {
          breakPoint--;
        }
        
        // If no good break found, just use MAX_CHUNK_SIZE
        if (breakPoint === 0) breakPoint = MAX_CHUNK_SIZE;
        else breakPoint++; // Include the punctuation
        
        const chunkText = buffer.substring(0, breakPoint);
        buffer = buffer.substring(breakPoint);
        
        chunkIndex++;
        await processChunk(chunkText, chunkIndex);
      }
    }
    
    // Process any remaining text
    if (buffer.length > 0) {
      chunkIndex++;
      await processChunk(buffer, chunkIndex);
    }
    
    // Remove duplicates from requirements
    const uniqueRequirements = allRequirements.filter((req, index, self) => {
      // Handle both new format (title/description) and legacy format (text)
      const reqText = req.description || req.text;
      
      // Convert legacy requirements to the new title/description format
      if (req.text && !req.description) {
        req.description = req.text;
        req.title = req.title || `Requirement from ${fileName}`;
        console.log(`Converting legacy format requirement (text) to new format (title/description)`);
      }
      
      return index === self.findIndex((r) => {
        const rText = r.description || r.text;
        return reqText === rText;
      });
    });
    
    console.log(`Stream processing complete: ${uniqueRequirements.length} unique requirements from ${chunkIndex} chunks`);
    
    // Clean up the temporary file
    try {
      fs.unlinkSync(textFilePath);
      console.log(`Cleaned up temporary text file: ${textFilePath}`);
    } catch (err) {
      console.warn(`Could not delete temporary text file: ${err}`);
    }
    
    return uniqueRequirements;
  } catch (error) {
    console.error("Error in stream processing:", error);
    // Try to clean up even on error
    try {
      fs.unlinkSync(textFilePath);
    } catch (e) {}
    
    // Return what we have so far, if anything
    return allRequirements;
  }
}