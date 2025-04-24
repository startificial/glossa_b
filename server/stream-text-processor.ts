/**
 * Streaming Text Processor
 * 
 * This module provides memory-efficient text file processing for requirement extraction.
 * It handles large text files by processing them in chunks to prevent memory issues.
 */
import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { TextReference } from './text-processor';

// Initialize the Gemini API with the API key
const apiKey = process.env.GOOGLE_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

// Gemini model configuration with reduced token limits to prevent memory issues
const generationConfig = {
  temperature: 0.2,
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 4096, // Reduced from 8192 to prevent memory issues
};

// Safety settings
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

/**
 * Split text into chunks with natural boundaries (paragraphs, sentences)
 * @param text The text content to chunk
 * @param chunkSize The target size of each chunk
 * @param overlap The amount of overlap between chunks
 * @returns Array of text chunks
 */
function chunkText(text: string, chunkSize: number = 8000, overlap: number = 800): string[] {
  const chunks: string[] = [];

  // If text is smaller than chunk size, return it as a single chunk
  if (text.length <= chunkSize) {
    chunks.push(text);
    return chunks;
  }

  let startIndex = 0;

  while (startIndex < text.length) {
    // Calculate the end index for this chunk
    const endIndex = Math.min(startIndex + chunkSize, text.length);
    
    // Find a good break point (end of paragraph or sentence)
    let breakPoint = endIndex;
    
    if (endIndex < text.length) {
      // Try to find the end of a paragraph within the last 1000 characters of the chunk
      const searchStartIndex = Math.max(endIndex - 1000, startIndex);
      const searchText = text.substring(searchStartIndex, endIndex);
      
      // Look for paragraph breaks
      const paragraphMatch = searchText.lastIndexOf('\n\n');
      if (paragraphMatch !== -1) {
        breakPoint = searchStartIndex + paragraphMatch + 2;
      } else {
        // If no paragraph break, look for a sentence end
        const sentenceMatch = searchText.match(/[.!?]\s+[A-Z]/g);
        if (sentenceMatch && sentenceMatch.length > 0) {
          const lastSentenceEnd = searchText.lastIndexOf(sentenceMatch[sentenceMatch.length - 1]);
          if (lastSentenceEnd !== -1) {
            breakPoint = searchStartIndex + lastSentenceEnd + 1;
          }
        }
      }
    }
    
    // Extract the chunk
    chunks.push(text.substring(startIndex, breakPoint));
    
    // Move the start index for the next chunk, ensuring overlap
    startIndex = Math.max(startIndex, breakPoint - overlap);
  }
  
  return chunks;
}

/**
 * Sample representative chunks from a large number of chunks
 * @param chunks Array of all text chunks
 * @param maxChunks Maximum number of chunks to sample
 * @returns Sampled chunks
 */
function sampleChunks(chunks: string[], maxChunks: number): string[] {
  // If we have fewer chunks than max, return them all
  if (chunks.length <= maxChunks) {
    return chunks;
  }
  
  const sampledChunks: string[] = [];
  
  // Always include first and last chunk for context
  sampledChunks.push(chunks[0]);
  
  if (maxChunks >= 2) {
    sampledChunks.push(chunks[chunks.length - 1]);
  }
  
  // Evenly sample remaining chunks
  if (maxChunks > 2) {
    const remainingToSample = maxChunks - 2;
    const step = Math.floor((chunks.length - 2) / (remainingToSample + 1));
    
    for (let i = 1; i <= remainingToSample; i++) {
      const index = Math.min(i * step, chunks.length - 2);
      sampledChunks.push(chunks[index]);
    }
  }
  
  // Sort by original order
  return sampledChunks.sort((a, b) => {
    return chunks.indexOf(a) - chunks.indexOf(b);
  });
}

/**
 * Remove duplicate requirements based on text similarity
 * @param requirements Array of all generated requirements
 * @returns Deduplicated requirements
 */
function deduplicateRequirements(requirements: any[]): any[] {
  const uniqueRequirements: any[] = [];
  const titleSet = new Set<string>();
  
  for (const req of requirements) {
    const title = req.title || '';
    const description = req.description || '';
    
    // Skip empty requirements
    if (!title && !description) {
      continue;
    }
    
    // Create a normalized version of the title for comparison
    const normalizedTitle = title.toLowerCase().trim();
    
    // Skip if we've seen this title before
    if (titleSet.has(normalizedTitle)) {
      continue;
    }
    
    // Add to unique requirements and track the title
    uniqueRequirements.push(req);
    titleSet.add(normalizedTitle);
  }
  
  return uniqueRequirements;
}

/**
 * Process text content using Gemini to extract requirements
 * @param text The text content to process
 * @param projectName Name of the project for context
 * @param fileName Name of the file being processed
 * @param contentType Type of content in the text
 * @param minRequirements Minimum number of requirements to extract
 * @returns Promise resolving to an array of requirements
 */
async function processTextWithGemini(
  text: string,
  projectName: string,
  fileName: string,
  contentType: string,
  minRequirements: number
): Promise<any[]> {
  try {
    // Get the Gemini model
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-pro",
      generationConfig,
      safetySettings,
    });
    
    // Create a prompt for requirement extraction
    const prompt = `
      You are a business analyst expert in software migration projects. Analyze the provided content and extract clear, detailed requirements for implementing the described functionality in a target system.
      
      Project: ${projectName}
      Content Type: ${contentType}
      File: ${fileName}
      
      Content to analyze:
      ${text}
      
      Extract as many requirements as necessary to comprehensively cover the content provided. Do not limit yourself to a specific number - extract all valid requirements from the text. You should aim to extract at least ${minRequirements} requirements if the content supports it, but extract more if necessary.
      
      Each requirement should include:
      - title: A short, descriptive title summarizing the requirement
      - description: A detailed description providing context and explaining what needs to be implemented
      - category: One of: functional, non-functional, technical, business, ui, data, security, performance
      - priority: One of: high, medium, low (based on your assessment of business importance)
      
      Return your output as a valid JSON array where each object has the properties listed above.
      
      Example:
      [
        {
          "title": "User Authentication System",
          "description": "The system must provide secure user authentication using email/password and support multi-factor authentication options.",
          "category": "security",
          "priority": "high"
        },
        {
          "title": "Customer Data Migration",
          "description": "All existing customer data must be migrated from the legacy system with full history preservation.",
          "category": "data",
          "priority": "high"
        }
      ]
    `;
    
    // Generate content
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();
    
    // Extract and parse the JSON response
    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const jsonText = jsonMatch[0];
        return JSON.parse(jsonText);
      } else {
        // If no JSON array was found, try parsing the whole response
        return JSON.parse(responseText);
      }
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError);
      console.error('Raw response:', responseText);
      return []; // Return empty array on error
    }
  } catch (error) {
    console.error('Error processing text with Gemini:', error);
    return []; // Return empty array on error
  }
}

/**
 * Process a text file using a memory-efficient streaming approach
 * This method reads text content in chunks to avoid memory issues
 * @param textPath Path to the text file
 * @param projectName Name of the project for context
 * @param fileName Name of the file being processed
 * @param contentType Type of content in the file
 * @param minRequirements Minimum number of requirements to extract
 * @param inputDataId ID of the input data for text references
 * @returns Promise resolving to an array of requirements
 */
export async function streamProcessTextFile(
  textPath: string,
  projectName: string,
  fileName: string,
  contentType: string = 'general',
  minRequirements: number = 5,
  inputDataId?: number
): Promise<any[]> {
  if (!apiKey) {
    console.error('Missing GOOGLE_API_KEY environment variable');
    throw new Error('Gemini API key is not configured. Please set the GOOGLE_API_KEY environment variable.');
  }
  
  try {
    console.log(`Starting stream processing for text file: ${fileName}`);
    
    // Check file size
    const stats = fs.statSync(textPath);
    const fileSizeMB = stats.size / (1024 * 1024);
    console.log(`File size: ${fileSizeMB.toFixed(2)} MB`);
    
    // For small files (< 1MB), read the whole file and process directly
    if (fileSizeMB < 1) {
      console.log('Small file, processing entire content');
      const text = fs.readFileSync(textPath, 'utf8');
      return processTextWithGemini(text, projectName, fileName, contentType, minRequirements);
    }
    
    // For larger files, process in chunks
    // Read the file in chunks to avoid loading it all into memory
    console.log('Large file, using streaming approach');
    
    // Determine optimal chunk size based on file size
    let chunkSizeBytes: number;
    let maxChunks: number;
    
    if (fileSizeMB < 3) {
      chunkSizeBytes = 0.5 * 1024 * 1024; // 0.5MB chunks for 1-3MB files
      maxChunks = 3;
    } else if (fileSizeMB < 10) {
      chunkSizeBytes = 1 * 1024 * 1024; // 1MB chunks for 3-10MB files
      maxChunks = 4;
    } else {
      chunkSizeBytes = 2 * 1024 * 1024; // 2MB chunks for >10MB files
      maxChunks = 5;
    }
    
    // Read file content in chunks
    const chunks: string[] = [];
    const fd = fs.openSync(textPath, 'r');
    const buffer = Buffer.alloc(chunkSizeBytes);
    
    // Don't read the entire file at once - just enough to sample representative chunks
    const maxReadSizeMB = Math.min(fileSizeMB, 20); // Read at most 20MB even for very large files
    const maxReadBytes = maxReadSizeMB * 1024 * 1024;
    
    let bytesRead = 0;
    let totalBytesRead = 0;
    
    let textContent = '';
    
    try {
      // Read until we've collected enough text or reached EOF
      while (totalBytesRead < maxReadBytes) {
        bytesRead = fs.readSync(fd, buffer, 0, chunkSizeBytes, totalBytesRead);
        
        if (bytesRead <= 0) break; // End of file
        
        textContent += buffer.slice(0, bytesRead).toString('utf8');
        totalBytesRead += bytesRead;
      }
      
      // Close the file descriptor
      fs.closeSync(fd);
      
      console.log(`Read ${totalBytesRead / (1024 * 1024)} MB of text for processing`);
      
      // Process text into chunks with good boundaries
      const textChunks = chunkText(textContent);
      console.log(`Split into ${textChunks.length} chunks for processing`);
      
      // Select representative chunks if we have too many
      const selectedChunks = textChunks.length > maxChunks 
        ? sampleChunks(textChunks, maxChunks) 
        : textChunks;
      
      console.log(`Processing ${selectedChunks.length} representative chunks`);
      
      // Process each chunk with Gemini
      const requirementsPerChunk = Math.max(2, Math.ceil(minRequirements / selectedChunks.length));
      
      const chunkResults = await Promise.all(
        selectedChunks.map((chunk, index) => {
          console.log(`Processing chunk ${index + 1}/${selectedChunks.length} (${chunk.length} chars)`);
          return processTextWithGemini(
            chunk, 
            projectName, 
            `${fileName} (section ${index + 1})`,
            contentType,
            requirementsPerChunk
          );
        })
      );
      
      // Combine and deduplicate results
      let allRequirements = chunkResults.flat();
      console.log(`Generated ${allRequirements.length} total requirements before deduplication`);
      
      // Deduplicate based on title and description similarity
      const uniqueRequirements = deduplicateRequirements(allRequirements);
      console.log(`Deduplicated to ${uniqueRequirements.length} unique requirements`);
      
      return uniqueRequirements;
    } catch (error) {
      console.error('Error processing text file in streaming mode:', error);
      throw error;
    }
  } catch (error) {
    console.error(`Error processing text file: ${fileName}`, error);
    throw error;
  }
}