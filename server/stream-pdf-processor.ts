import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';
import { processTextFileForRequirement } from './text-processor.js';

// Initialize the Gemini API with the API key
const apiKey = process.env.GOOGLE_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

// Configure the safety settings
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
];

// Configure generation parameters
const generationConfig = {
  temperature: 0.2,
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 8192,
};

/**
 * Process a PDF document using a more memory-efficient streaming approach
 * This method takes PDF text and processes it in manageable chunks
 * @param pdfText The extracted text content from the PDF
 * @param pdfPath Path to the PDF file (for references)
 * @param projectName Name of the project for context
 * @param fileName Name of the file being processed
 * @param contentType Type of content in the file
 * @param minRequirements Minimum number of requirements to extract 
 * @param inputDataId ID of the input data for text references
 * @returns Promise resolving to an array of requirements
 */
export async function streamProcessPdfText(
  pdfText: string,
  pdfPath: string,
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
    console.log(`Starting stream processing for PDF: ${fileName} (${pdfText.length} chars)`);
    
    // If text is too short, just process it directly
    if (pdfText.length < 5000) {
      return processTextWithGemini(pdfText, projectName, fileName, contentType, minRequirements);
    }
    
    // For longer texts, split into chunks and process each chunk
    // Calculate optimal chunk size and overlap based on text length
    // Use smaller chunks to prevent memory issues
    const calculateChunkParams = (textLength: number) => {
      if (textLength < 10000) {
        return { chunkSize: 4000, overlap: 400, maxChunks: 2 };
      } else if (textLength < 30000) {
        return { chunkSize: 6000, overlap: 600, maxChunks: 3 };
      } else if (textLength < 100000) {
        return { chunkSize: 8000, overlap: 800, maxChunks: 4 };
      } else {
        return { chunkSize: 10000, overlap: 1000, maxChunks: 6 };
      }
    };
    
    const { chunkSize, overlap, maxChunks } = calculateChunkParams(pdfText.length);
    
    // Chunk the text
    const chunks = chunkText(pdfText, chunkSize, overlap);
    console.log(`Split PDF text into ${chunks.length} chunks for processing`);
    
    // If we have too many chunks, sample representative chunks
    let selectedChunks = chunks;
    if (chunks.length > maxChunks) {
      selectedChunks = sampleChunks(chunks, maxChunks);
      console.log(`Selected ${selectedChunks.length} representative chunks out of ${chunks.length} total chunks`);
    }
    
    // Process each chunk in parallel
    console.log(`Processing ${selectedChunks.length} chunks with Gemini...`);
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
    
    // Add text references if inputDataId is provided
    if (inputDataId) {
      console.log('Adding text references to requirements...');
      
      // Process requirements in smaller batches to avoid memory issues
      const batchSize = 3; // Reduced from 5 to prevent memory issues
      const batches = [];
      
      for (let i = 0; i < uniqueRequirements.length; i += batchSize) {
        batches.push(uniqueRequirements.slice(i, i + batchSize));
      }
      
      // Process each batch sequentially
      let requirementsWithReferences: any[] = [];
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`Processing text references for batch ${i + 1}/${batches.length} (${batch.length} requirements)`);
        
        const batchResults = await Promise.all(
          batch.map(async (req) => {
            try {
              // Find relevant text passages for this requirement
              const requirementText = req.description || req.text;
              
              if (!requirementText) {
                console.warn(`Skipping text references for requirement with missing text: ${JSON.stringify(req)}`);
                return req;
              }
              
              const textReferences = await processTextFileForRequirement(
                pdfPath,
                requirementText,
                inputDataId || 0
              );
              
              // Add the text references to the requirement if any were found
              return {
                ...req,
                textReferences: textReferences.length > 0 ? textReferences : undefined
              };
            } catch (error) {
              console.error(`Error finding text references for requirement`, error);
              return req; // Return the original requirement without references
            }
          })
        );
        
        requirementsWithReferences = [...requirementsWithReferences, ...batchResults];
      }
      
      console.log(`Added text references to ${requirementsWithReferences.filter(r => r.textReferences).length} requirements`);
      return requirementsWithReferences;
    }
    
    return uniqueRequirements;
  } catch (error) {
    console.error('Error in stream PDF processor:', error);
    throw error;
  }
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
      
      Format your response as a JSON array of requirements, where each requirement has:
      1. 'title' (string): A concise title for the requirement (3-10 words)
      2. 'description' (string): A detailed description of at least 150 words that thoroughly explains what needs to be implemented
      3. 'category' (string): One of 'functional', 'non-functional', 'security', 'performance'
      4. 'priority' (string): One of 'high', 'medium', 'low'
      
      Example format (but with much more detailed descriptions for each requirement):
      [
        {
          "title": "Case Management Workflow",
          "description": "The system must implement a comprehensive case management workflow that allows customer service representatives to...[detailed 150+ word description]",
          "category": "functional", 
          "priority": "high"
        },
        {
          "title": "Knowledge Base Integration",
          "description": "The Salesforce implementation must support a knowledge base integration that...[detailed 150+ word description]",
          "category": "functional",
          "priority": "medium"
        }
      ]
      
      Only output valid JSON with no additional text or explanations.
    `;
    
    // Generate content
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();
    
    // Parse the JSON response
    try {
      // Extract just the JSON part from the response
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
 * Split text into overlapping chunks for processing
 * @param text The text to chunk
 * @param chunkSize The size of each chunk
 * @param overlapSize The overlap between chunks
 * @returns Array of text chunks
 */
function chunkText(text: string, chunkSize: number = 10000, overlapSize: number = 1000): string[] {
  const chunks: string[] = [];
  
  // Normalize line endings and clean up text
  const cleanedText = text
    .replace(/(\r\n|\r)/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  // If text is already small enough, return it as a single chunk
  if (cleanedText.length <= chunkSize) {
    return [cleanedText];
  }
  
  // Split text into chunks with overlap
  let startPos = 0;
  while (startPos < cleanedText.length) {
    // Calculate end position for this chunk
    const endPos = Math.min(startPos + chunkSize, cleanedText.length);
    
    // Extract chunk
    const chunk = cleanedText.substring(startPos, endPos);
    chunks.push(chunk);
    
    // Move to next position with overlap
    startPos = endPos - overlapSize;
    
    // If we're near the end, just include the remainder
    if (startPos + chunkSize >= cleanedText.length) {
      // Only add the final chunk if it's not too similar to the previous one
      const finalChunk = cleanedText.substring(startPos);
      if (finalChunk.length > overlapSize * 2) {
        chunks.push(finalChunk);
      }
      break;
    }
  }
  
  return chunks;
}

/**
 * Sample representative chunks from a larger set of chunks
 * @param chunks Array of text chunks
 * @param maxChunks Maximum number of chunks to sample
 * @returns Array of sampled chunks
 */
function sampleChunks(chunks: string[], maxChunks: number): string[] {
  // If we have fewer chunks than the maximum, return all chunks
  if (chunks.length <= maxChunks) {
    return chunks;
  }
  
  // Always include the first and last chunk
  const sampled: string[] = [chunks[0]];
  
  // Calculate interval for selecting chunks in between
  const interval = (chunks.length - 2) / (maxChunks - 2);
  
  // Select evenly distributed chunks
  for (let i = 1; i < maxChunks - 1; i++) {
    const index = Math.floor(1 + i * interval);
    sampled.push(chunks[index]);
  }
  
  // Add the last chunk
  sampled.push(chunks[chunks.length - 1]);
  
  return sampled;
}

/**
 * Deduplicate requirements based on title and description similarity
 * @param requirements Array of requirements
 * @returns Array of deduplicated requirements
 */
function deduplicateRequirements(requirements: any[]): any[] {
  const uniqueRequirements: any[] = [];
  
  for (const req of requirements) {
    // Skip requirements without title or description
    if (!req.title || !req.description) {
      continue;
    }
    
    // Check if we already have a similar requirement
    const isDuplicate = uniqueRequirements.some(existingReq => {
      // Check title similarity (case insensitive)
      const titleSimilarity = stringSimilarity(
        existingReq.title.toLowerCase(),
        req.title.toLowerCase()
      );
      
      // If titles are very similar, check description similarity
      if (titleSimilarity > 0.7) {
        const descSimilarity = stringSimilarity(
          existingReq.description.toLowerCase(),
          req.description.toLowerCase()
        );
        
        // If both title and description are similar, consider it a duplicate
        return descSimilarity > 0.5;
      }
      
      return false;
    });
    
    // If not a duplicate, add to unique requirements
    if (!isDuplicate) {
      uniqueRequirements.push(req);
    }
  }
  
  return uniqueRequirements;
}

/**
 * Calculate string similarity using Dice's coefficient
 * @param a First string
 * @param b Second string
 * @returns Similarity score between 0 and 1
 */
function stringSimilarity(a: string, b: string): number {
  // If either string is empty, return 0
  if (!a.length || !b.length) {
    return 0;
  }
  
  // If strings are identical, return 1
  if (a === b) {
    return 1;
  }
  
  // Generate bigrams for each string
  const bigrams1 = new Set<string>();
  const bigrams2 = new Set<string>();
  
  for (let i = 0; i < a.length - 1; i++) {
    bigrams1.add(a.substring(i, i + 2));
  }
  
  for (let i = 0; i < b.length - 1; i++) {
    bigrams2.add(b.substring(i, i + 2));
  }
  
  // Count intersection
  let intersection = 0;
  
  // Convert Set to Array for safe iteration
  const bigrams1Array = Array.from(bigrams1);
  
  for (const bigram of bigrams1Array) {
    if (bigrams2.has(bigram)) {
      intersection++;
    }
  }
  
  // Calculate Dice's coefficient
  return (2 * intersection) / (bigrams1.size + bigrams2.size);
}