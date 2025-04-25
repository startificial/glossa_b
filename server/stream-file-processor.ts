import fs from 'fs';
import path from 'path';
import os from 'os';
import { pipeline } from 'stream/promises';
import { promisify } from 'util';
import { createReadStream, createWriteStream } from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import * as mammoth from 'mammoth';
import { logger } from './utils/logger';

const mkdir = promisify(fs.mkdir);
const unlink = promisify(fs.unlink);
const rmdir = promisify(fs.rmdir);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);

// Initialize Google Generative AI with appropriate model
const API_KEY = process.env.GOOGLE_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

// Default generation config (similar to what's in gemini.ts)
const generationConfig = {
  temperature: 0.7,
  topP: 0.8,
  topK: 40,
  maxOutputTokens: 8192,
};

// Safety settings with proper enum values
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
 * Utility function to generate a unique ID
 * @param length Length of the ID (default 8)
 * @returns Random ID string
 */
function generateUniqueId(length: number = 8): string {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

/**
 * Generate requirements from text content with memory-efficient processing
 * @param filePath Path to the text file
 * @param fileName Original name of the file 
 * @param projectName Name of the project
 * @returns Array of requirements
 */
export async function generateRequirementsFromText(
  filePath: string,
  fileName: string,
  projectName: string
): Promise<any[]> {
  try {
    // Create temp directory for chunked processing
    const tempDir = path.join(os.tmpdir(), `txt_proc_${generateUniqueId(6)}`);
    await mkdir(tempDir, { recursive: true });
    
    try {
      // Check file size
      const stats = await stat(filePath);
      const fileSizeMB = stats.size / (1024 * 1024);
      logger.info(`Generating requirements from text file: ${fileName} (${fileSizeMB.toFixed(2)} MB)`);
      
      // Determine optimal chunk size and number
      // For larger files, use more but smaller chunks
      const maxChunks = fileSizeMB > 20 ? 10 : (fileSizeMB > 5 ? 6 : 3);
      const chunkSizeBytes = Math.max(512 * 1024, Math.ceil(stats.size / maxChunks)); // min 512KB chunks
      
      logger.info(`Breaking file into approximately ${maxChunks} chunks for processing`);
      
      // Create chunks by streaming the file
      const chunks: { index: number; path: string; size: number }[] = [];
      let currentChunk = 1;
      let currentChunkPath = path.join(tempDir, `chunk_${currentChunk}.txt`);
      let bytesWritten = 0;
      let totalWritten = 0;
      
      await new Promise<void>((resolve, reject) => {
        // Open read stream for the file
        const readStream = fs.createReadStream(filePath, { 
          encoding: 'utf8',
          highWaterMark: 64 * 1024 // 64KB buffer
        });
        
        // Create initial write stream
        let writeStream = fs.createWriteStream(currentChunkPath);
        
        // Process data events
        readStream.on('data', (data: string) => {
          writeStream.write(data);
          bytesWritten += Buffer.byteLength(data, 'utf8');
          totalWritten += Buffer.byteLength(data, 'utf8');
          
          // Check if we've written enough to this chunk
          if (bytesWritten >= chunkSizeBytes) {
            writeStream.end();
            chunks.push({ 
              index: currentChunk, 
              path: currentChunkPath,
              size: bytesWritten
            });
            
            // Move to next chunk
            currentChunk++;
            currentChunkPath = path.join(tempDir, `chunk_${currentChunk}.txt`);
            writeStream = fs.createWriteStream(currentChunkPath);
            bytesWritten = 0;
          }
        });
        
        // Handle the end of the read stream
        readStream.on('end', () => {
          // Close the last chunk if it contains data
          if (bytesWritten > 0) {
            writeStream.end();
            chunks.push({ 
              index: currentChunk, 
              path: currentChunkPath,
              size: bytesWritten
            });
          }
          
          logger.info(`Successfully split file into ${chunks.length} chunks`);
          logger.info(`Total bytes processed: ${totalWritten} of ${stats.size}`);
          resolve();
        });
        
        // Handle errors in read stream
        readStream.on('error', (err) => {
          logger.error(`Error reading file: ${err}`);
          reject(err);
        });
      });
      
      // Initialize array to collect all requirements
      let allRequirements: any[] = [];
      
      // Process each chunk with Gemini
      for (const chunk of chunks) {
        logger.info(`Processing chunk ${chunk.index}/${chunks.length} (${(chunk.size / 1024).toFixed(2)}KB)`);
        
        // Read this chunk's content
        const chunkContent = await readFile(chunk.path, 'utf8');
        
        // Initialize Gemini for this chunk with the same settings as PDF processing
        const model = genAI.getGenerativeModel({
          model: "gemini-1.5-pro",
          generationConfig: {
            temperature: 0.7, 
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 8192, // Match the PDF processing output tokens for more detailed requirements
          },
          safetySettings,
        });
        
        // Create a prompt for this chunk using the same format as PDF processing
        const prompt = `
          You are a business systems analyst specializing in service management systems with expertise in functional requirements. 
          Extract software requirements from the following text, which is chunk ${chunk.index} of ${chunks.length} from a larger document.
          
          Your task is to generate migration requirements for a project that's moving functionality from a source system to a target system, 
          focusing specifically on core functionality and business processes that must be migrated.
          
          Project context: ${projectName}
          File name: ${fileName}
          File type: text file
          Inferred domain: service management
          
          For each requirement you identify in this chunk:
          1. Provide a concise title (3-10 words) that summarizes the requirement
          2. Provide a detailed, domain-specific requirement description of at least 150 words related to core functionality within service management functionality
          3. Classify it into one of these categories: 'functional', 'non-functional', 'security', 'performance'
          4. Assign a priority level: 'high', 'medium', or 'low'
          
          Important: Only extract requirements that are explicitly mentioned in this chunk.
          
          Format your response as a JSON array with comprehensive requirements, each with the properties 'title', 'description', 'category', and 'priority'.
          Example: [{"title": "Call Center Queue Logic", "description": "The target system must maintain the current call center queuing logic that routes cases based on SLA priority and agent skill matching... [detailed 150+ word description that thoroughly explains the requirement]", "category": "functional", "priority": "high"}, ...]
          
          Only output valid JSON with no additional text or explanations.
          
          TEXT CHUNK ${chunk.index}/${chunks.length} TO ANALYZE:
          ${chunkContent}
        `;
        
        try {
          // Generate content with Gemini
          logger.info(`Sending chunk ${chunk.index} to Gemini API`);
          const result = await model.generateContent(prompt);
          const response = await result.response;
          const text = response.text();
          
          // Parse JSON from response
          try {
            // Extract JSON array from response
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              const jsonText = jsonMatch[0];
              const chunkRequirements = JSON.parse(jsonText);
              logger.info(`Extracted ${chunkRequirements.length} requirements from chunk ${chunk.index}`);
              allRequirements = [...allRequirements, ...chunkRequirements];
            } else {
              // If no JSON array found, try parsing whole response
              const chunkRequirements = JSON.parse(text);
              if (Array.isArray(chunkRequirements)) {
                logger.info(`Extracted ${chunkRequirements.length} requirements from chunk ${chunk.index}`);
                allRequirements = [...allRequirements, ...chunkRequirements];
              } else {
                logger.warn(`No valid requirements extracted from chunk ${chunk.index}`);
              }
            }
          } catch (parseError) {
            logger.error(`Failed to parse requirements from chunk ${chunk.index}: ${parseError}`);
            // Continue with next chunk instead of failing
          }
          
          // Add a small delay between chunks to avoid rate limiting
          if (chunk.index < chunks.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (chunkError) {
          logger.error(`Error processing chunk ${chunk.index}: ${chunkError}`);
          // Continue with next chunk instead of failing
        }
      }
      
      // De-duplicate requirements based on titles
      const uniqueRequirements = allRequirements.filter((req, index, self) => {
        // If this requirement has no title, always include it
        if (!req.title) return true;
        
        // Find the first instance with this title
        return index === self.findIndex(r => r.title === req.title);
      });
      
      logger.info(`Generated ${uniqueRequirements.length} unique requirements from ${chunks.length} chunks`);
      
      // Clean up temp files
      for (const chunk of chunks) {
        try {
          await unlink(chunk.path);
        } catch (error) {
          logger.warn(`Failed to delete temporary chunk file ${chunk.path}: ${error}`);
        }
      }
      
      // Clean up temp directory
      try {
        await rmdir(tempDir);
      } catch (error) {
        logger.warn(`Failed to delete temporary directory ${tempDir}: ${error}`);
      }
      
      return uniqueRequirements;
    } catch (error) {
      // Clean up temp directory on error
      try {
        logger.warn(`Cleaning up temp directory due to error: ${tempDir}`);
        const files = await readdir(tempDir);
        for (const file of files) {
          await unlink(path.join(tempDir, file));
        }
        await rmdir(tempDir);
      } catch (cleanupError) {
        logger.warn(`Error during cleanup: ${cleanupError}`);
      }
      
      throw error;
    }
  } catch (error) {
    logger.error(`Error generating requirements from text: ${error}`);
    throw error;
  }
}

/**
 * Process a file using efficient streaming techniques to avoid memory exhaustion
 * @param filePath Path to the uploaded file
 * @param fileName Original file name
 * @param projectName Name of the project
 * @param contentType Type of content (workflow, documentation, etc.)
 * @param fileType Type of file (document, pdf, image, etc.)
 * @param numAnalyses Number of analysis perspectives
 * @param reqPerAnalysis Number of requirements per analysis
 * @param inputDataId Optional ID for the input data record
 * @returns Array of generated requirements
 */
/**
 * Process a DOCX document and analyze its content
 * @param filePath Path to the DOCX file
 * @returns Object containing extracted text and analysis results
 */
export async function analyzeDocx(filePath: string): Promise<any> {
  try {
    logger.info(`Analyzing DOCX file: ${filePath}`);
    
    // Extract text from the document
    const textResult = await extractTextFromDocx(filePath);
    
    if (!textResult.success) {
      logger.error(`Failed to extract text from DOCX: ${textResult.error}`);
      return {
        success: false,
        error: textResult.error,
        metadata: {},
        context: {
          domain: "unknown",
          docType: "DOCX document",
          keywords: [],
          hasRequirements: false
        }
      };
    }
    
    const text = textResult.text;
    
    // Simplified metadata extraction - in a more complex implementation, 
    // we could use mammoth to extract more document properties
    const metadata = {
      textLength: text.length,
      format: "DOCX",
      processingTime: new Date().toISOString()
    };
    
    // Basic context detection - this could be enhanced with NLP or AI
    const keywords = text.split(/\s+/)
      .filter(word => word.length > 5)
      .filter((word, index, self) => self.indexOf(word) === index)
      .slice(0, 20);
    
    // Check if it likely contains requirements based on keyword detection
    const requirementsKeywords = ['shall', 'must', 'required', 'requirement', 'should', 'necessary'];
    // Add null/undefined check before using toLowerCase
    const hasRequirements = text && typeof text === 'string' 
      ? requirementsKeywords.some(kw => text.toLowerCase().includes(kw))
      : false;
    
    // Infer domain from content with null/undefined safety
    let domain = "general";
    if (!text || typeof text !== 'string') {
      domain = "unknown";
    } else if (text.toLowerCase().includes("software") || text.toLowerCase().includes("application")) {
      domain = "software";
    } else if (text.toLowerCase().includes("service") || text.toLowerCase().includes("customer")) {
      domain = "service management";
    } else if (text.toLowerCase().includes("sales") || text.toLowerCase().includes("marketing")) {
      domain = "sales and marketing";
    }
    
    return {
      success: true,
      text,
      metadata,
      context: {
        domain,
        docType: "DOCX document",
        keywords,
        hasRequirements
      }
    };
  } catch (error) {
    logger.error(`Error analyzing DOCX file: ${error}`);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error analyzing DOCX',
      metadata: {},
      context: {
        domain: "unknown",
        docType: "DOCX document",
        keywords: [],
        hasRequirements: false
      }
    };
  }
}

/**
 * Extract text from a DOCX file
 * @param filePath Path to the DOCX file
 * @returns Object containing the extracted text and processing info
 */
export async function extractTextFromDocx(filePath: string): Promise<{text: string, success: boolean, error?: string}> {
  try {
    logger.info(`Extracting text from DOCX: ${filePath}`);
    
    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      logger.error(`DOCX file not found: ${filePath}`);
      return {
        text: '',
        success: false,
        error: 'File not found'
      };
    }
    
    // Read the file buffer
    const buffer = await readFile(filePath);
    
    // Extract text from the document
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value;
    
    // Log any warnings
    if (result.messages && result.messages.length > 0) {
      logger.warn(`Warnings while extracting text from DOCX: ${JSON.stringify(result.messages)}`);
    }
    
    if (!text || text.trim().length === 0) {
      logger.error('No text extracted from DOCX file');
      return {
        text: '',
        success: false,
        error: 'No text could be extracted from the document'
      };
    }
    
    logger.info(`Successfully extracted ${text.length} characters from DOCX`);
    return {
      text,
      success: true
    };
  } catch (error) {
    logger.error(`Error extracting text from DOCX file: ${error}`);
    return {
      text: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during DOCX text extraction'
    };
  }
}

/**
 * Analyze a TXT file and extract useful information
 * @param filePath Path to the text file
 * @returns Object containing extracted text and analysis results
 */
export async function analyzeTxt(filePath: string): Promise<any> {
  try {
    logger.info(`Analyzing text file: ${filePath}`);
    
    // Extract text from the document using our streaming-capable function
    const textResult = await extractTextFromTxt(filePath);
    
    if (!textResult.success) {
      logger.error(`Failed to extract text from file: ${textResult.error}`);
      return {
        success: false,
        error: textResult.error,
        metadata: {},
        context: {
          domain: "unknown",
          docType: "text document",
          keywords: [],
          hasRequirements: false
        }
      };
    }
    
    const text = textResult.text;
    
    // Create metadata with streaming information
    const metadata: any = {
      textLength: text.length,
      format: "TEXT",
      processingTime: new Date().toISOString(),
      isStreamingExtract: textResult.isStreaming || false
    };
    
    // If file was processed via streaming, indicate that in metadata
    if (textResult.isStreaming) {
      metadata.streamingNote = "This file was too large to load entirely in memory. Content is sampled from beginning, middle, and end.";
    }
    
    // Basic context detection - extract keywords and domain info
    const keywords = text.split(/\s+/)
      .filter(word => word.length > 5)
      .filter((word, index, self) => self.indexOf(word) === index)
      .slice(0, 20);
    
    // Check if it likely contains requirements based on keyword detection
    const requirementsKeywords = ['shall', 'must', 'required', 'requirement', 'should', 'necessary'];
    const hasRequirements = text && typeof text === 'string' 
      ? requirementsKeywords.some(kw => text.toLowerCase().includes(kw))
      : false;
    
    // Infer domain from content with null/undefined safety
    let domain = "general";
    if (!text || typeof text !== 'string') {
      domain = "unknown";
    } else if (text.toLowerCase().includes("software") || text.toLowerCase().includes("application")) {
      domain = "software";
    } else if (text.toLowerCase().includes("service") || text.toLowerCase().includes("customer")) {
      domain = "service management";
    } else if (text.toLowerCase().includes("sales") || text.toLowerCase().includes("marketing")) {
      domain = "sales and marketing";
    }
    
    return {
      success: true,
      text,
      metadata,
      context: {
        domain,
        docType: "text document",
        keywords,
        hasRequirements
      }
    };
  } catch (error) {
    logger.error(`Error analyzing text file: ${error}`);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error analyzing text file',
      metadata: {},
      context: {
        domain: "unknown",
        docType: "text document",
        keywords: [],
        hasRequirements: false
      }
    };
  }
}

/**
 * Extract text content from a text file
 * @param filePath Path to the text file
 * @param maxSizeInMemory Optional maximum size in MB to load the entire file into memory (default 10MB)
 * @returns Object containing the extracted text and processing info
 */
export async function extractTextFromTxt(
  filePath: string, 
  maxSizeInMemory: number = 10
): Promise<{text: string, success: boolean, error?: string, isStreaming?: boolean}> {
  try {
    logger.info(`Reading text from file: ${filePath}`);
    
    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      logger.error(`Text file not found: ${filePath}`);
      return {
        text: '',
        success: false,
        error: 'File not found'
      };
    }
    
    // Get file stats to check size
    const stats = await stat(filePath);
    const fileSizeMB = stats.size / (1024 * 1024);
    
    // For small files, read the whole file at once
    if (fileSizeMB <= maxSizeInMemory) {
      logger.info(`Reading text file directly (${fileSizeMB.toFixed(2)} MB)`);
      
      // Read the file content
      const text = await readFile(filePath, 'utf8');
      
      if (!text || text.trim().length === 0) {
        logger.error('Text file is empty');
        return {
          text: '',
          success: false,
          error: 'Text file is empty'
        };
      }
      
      logger.info(`Successfully read ${text.length} characters from text file`);
      return {
        text,
        success: true,
        isStreaming: false
      };
    } 
    // For large files, read a sample from the file
    else {
      logger.info(`Large text file detected (${fileSizeMB.toFixed(2)} MB). Using streaming approach.`);
      
      // Sample the beginning, middle, and end of the file
      const sampleSizeBytes = 100 * 1024; // 100KB samples
      let text = '';
      
      // Read first sample
      const startBuffer = Buffer.alloc(sampleSizeBytes);
      const startFd = fs.openSync(filePath, 'r');
      const startBytesRead = fs.readSync(startFd, startBuffer, 0, sampleSizeBytes, 0);
      fs.closeSync(startFd);
      
      // Read middle sample (if file is large enough)
      let middleText = '';
      if (stats.size > sampleSizeBytes * 3) {
        const middlePos = Math.floor(stats.size / 2) - Math.floor(sampleSizeBytes / 2);
        const middleBuffer = Buffer.alloc(sampleSizeBytes);
        const middleFd = fs.openSync(filePath, 'r');
        const middleBytesRead = fs.readSync(middleFd, middleBuffer, 0, sampleSizeBytes, middlePos);
        fs.closeSync(middleFd);
        middleText = middleBuffer.toString('utf8', 0, middleBytesRead);
      }
      
      // Read end sample
      const endPos = Math.max(0, stats.size - sampleSizeBytes);
      const endBuffer = Buffer.alloc(sampleSizeBytes);
      const endFd = fs.openSync(filePath, 'r');
      const endBytesRead = fs.readSync(endFd, endBuffer, 0, sampleSizeBytes, endPos);
      fs.closeSync(endFd);
      
      // Combine samples
      text = startBuffer.toString('utf8', 0, startBytesRead) + 
             (middleText ? '\n...[Content truncated due to large file size]...\n' + middleText : '') +
             '\n...[Content truncated due to large file size]...\n' + 
             endBuffer.toString('utf8', 0, endBytesRead);
      
      logger.info(`Successfully sampled ${text.length} characters from large text file`);
      return {
        text,
        success: true,
        isStreaming: true
      };
    }
  } catch (error) {
    logger.error(`Error reading text file: ${error}`);
    return {
      text: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during text file reading'
    };
  }
}

/**
 * Get file content based on file type 
 * @param filePath Path to the file
 * @param fileType Type of file (.pdf, .docx, .txt, etc)
 */
export async function getFileContent(filePath: string, fileType: string): Promise<{text: string, success: boolean, error?: string}> {
  try {
    logger.info(`Getting content from file: ${filePath} (type: ${fileType})`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      logger.error(`File not found: ${filePath}`);
      return { text: '', success: false, error: 'File not found' };
    }
    
    // Process based on file type
    if (fileType.toLowerCase() === '.docx' || fileType.toLowerCase() === '.doc') {
      return await extractTextFromDocx(filePath);
    } else if (fileType.toLowerCase() === '.txt' || fileType.toLowerCase() === '.md') {
      return await extractTextFromTxt(filePath);
    } else {
      logger.error(`Unsupported file type for text extraction: ${fileType}`);
      return { 
        text: '', 
        success: false, 
        error: `Unsupported file type: ${fileType}. Supported types include .docx, .doc, .txt, and .md` 
      };
    }
  } catch (error) {
    logger.error(`Error getting file content: ${error}`);
    return {
      text: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error extracting file content'
    };
  }
}

export async function streamProcessFile(
  filePath: string,
  fileName: string,
  projectName: string,
  contentType: string = 'general',
  fileType: string = 'other',
  numAnalyses: number = 2,
  reqPerAnalysis: number = 5,
  inputDataId?: number
): Promise<any[]> {
  // Create a temporary processing directory with a random ID
  const tempDir = path.join(path.dirname(filePath), `proc_${generateUniqueId(8)}`);
  try {
    // Create temporary directory for processing chunks
    await mkdir(tempDir, { recursive: true });
    
    // Get file information
    const stats = await stat(filePath);
    const fileSize = stats.size;
    const fileSizeInMB = fileSize / (1024 * 1024);
    
    console.log(`Stream processing file: ${fileName} (${fileSizeInMB.toFixed(2)} MB)`);
    console.log(`Using ${numAnalyses} analysis perspectives with ${reqPerAnalysis} requirements each`);
    
    // Extract domain information
    const domainsList = ['CRM', 'ERP', 'service cloud', 'sales cloud', 'marketing cloud', 'commerce cloud', 'call center', 
      'customer service', 'field service', 'salesforce', 'dynamics', 'sap', 'oracle', 'servicenow', 'zendesk'];
    
    // Check if any domain keywords are in the filename or project name
    // Add null/undefined checks
    const matchedKeywords = domainsList.filter(domain => 
      (fileName && typeof fileName === 'string' && domain && typeof domain === 'string' && fileName.toLowerCase().includes(domain.toLowerCase())) || 
      (projectName && typeof projectName === 'string' && domain && typeof domain === 'string' && projectName.toLowerCase().includes(domain.toLowerCase()))
    );
    
    const inferredDomain = matchedKeywords.length > 0 
      ? matchedKeywords.join(', ') 
      : "service management"; // Default to service management if no specific domain is detected
    
    // Define perspectives based on file type - similar to generateRequirementsForFile
    const perspectives = [
      {
        name: "Functional Requirements",
        focus: "core functionality and business processes that must be migrated"
      },
      {
        name: "Data Requirements",
        focus: "data structures, fields, and relationships that must be preserved"
      },
      {
        name: "Integration Requirements",
        focus: "integration points, APIs, and external system connections"
      },
      {
        name: "User Experience Requirements",
        focus: "user interfaces, workflows, and experience aspects"
      },
      {
        name: "Security & Compliance Requirements",
        focus: "security controls, access permissions, and compliance needs"
      }
    ];

    // Select perspectives based on numAnalyses
    const selectedPerspectives = perspectives.slice(0, Math.min(numAnalyses, perspectives.length));
    
    // Get file content based on file type
    let fileContent = '';
    let fileExtractSuccess = true;
    let fileExtractError = '';
    
    // Handle different file types for text extraction
    if (fileType.toLowerCase() === '.docx' || fileType.toLowerCase() === '.doc') {
      logger.info(`Processing DOCX file: ${filePath}`);
      const docxResult = await extractTextFromDocx(filePath);
      if (!docxResult.success) {
        logger.error(`Failed to extract text from DOCX: ${docxResult.error}`);
        fileExtractSuccess = false;
        fileExtractError = docxResult.error || 'Unknown error extracting DOCX text';
      } else {
        fileContent = docxResult.text;
        logger.info(`Successfully extracted ${fileContent.length} characters from DOCX`);
      }
    } else if (fileType.toLowerCase() === '.txt' || fileType.toLowerCase() === '.md') {
      logger.info(`Processing text file: ${filePath}`);
      const txtResult = await extractTextFromTxt(filePath);
      if (!txtResult.success) {
        logger.error(`Failed to extract text from text file: ${txtResult.error}`);
        fileExtractSuccess = false;
        fileExtractError = txtResult.error || 'Unknown error reading text file';
      } else {
        fileContent = txtResult.text;
        logger.info(`Successfully read ${fileContent.length} characters from text file`);
      }
    } else {
      // For other file types (binary, etc.), we might need specialized handling
      // but for now, we'll just proceed with the default stream processing
      logger.info(`Processing file with type ${fileType} using default method`);
    }
    
    // If text extraction failed, throw an error to be caught by the try/catch block
    if (!fileExtractSuccess) {
      throw new Error(`Failed to extract content from file: ${fileExtractError}`);
    }
    
    // Stream the file to a temporary location in chunks if needed
    // This process is more important for larger files
    const chunkSize = 5 * 1024 * 1024; // 5MB chunks for efficient processing
    const numChunks = Math.ceil(fileSize / chunkSize);
    
    // For smaller files, we can use the entire file as one chunk
    if (numChunks <= 1 || fileSize < 1024 * 1024) { // Under 1MB
      console.log(`Small file detected (${fileSizeInMB.toFixed(2)} MB). Processing as a single chunk.`);
      // No need to split the file into chunks
    } else {
      console.log(`Processing large file in ${numChunks} chunks of ~5MB each`);
      // For large files, we would implement a chunking mechanism here
      // but since we're mainly handling non-video files that are not huge,
      // this implementation is simplified for now
    }

    // Initialize an array to store all requirements
    let allRequirements: any[] = [];
    
    // Process from each perspective
    for (let i = 0; i < selectedPerspectives.length; i++) {
      const perspective = selectedPerspectives[i];
      console.log(`Processing analysis perspective ${i+1}/${selectedPerspectives.length}: ${perspective.name}`);
      
      // Get the Gemini model
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-pro",
        generationConfig,
        safetySettings,
      });

      // Create a specialized prompt for this file type and perspective
      const prompt = `
        You are a business systems analyst specializing in ${inferredDomain} systems with expertise in ${perspective.name.toLowerCase()}. 
        Your task is to generate migration requirements for a project that's moving functionality from a source system to a target system, 
        focusing specifically on ${perspective.focus}.
        
        Project context: ${projectName}
        File name: ${fileName}
        File type: ${fileType}
        Content type: ${contentType}
        Inferred domain: ${inferredDomain}
        Analysis perspective: ${perspective.name} (focusing on ${perspective.focus})
        
        ${contentType === 'workflow' ? 
          `This ${fileType} file documents workflows and business processes in a ${inferredDomain} system that must be recreated in a target system.
          
          Assume this file contains information about ${inferredDomain} workflows and processes.
          Generate detailed migration requirements focused on ${perspective.focus} aspects of these workflows.`
          
          : contentType === 'user_feedback' ? 
          `This ${fileType} file contains user feedback about a ${inferredDomain} system.
          
          Assume users are providing feedback about different aspects of the system.
          Generate requirements related to ${perspective.focus} that address specific user needs in the target system.` 
          
          : contentType === 'documentation' ? 
          `This ${fileType} file contains documentation about a ${inferredDomain} system.
          
          Assume this documentation describes various system capabilities.
          Generate requirements for ${perspective.focus} that ensure these documented capabilities are preserved in the target system.` 
          
          : contentType === 'specifications' ? 
          `This ${fileType} file contains technical specifications for a ${inferredDomain} system.
          
          Assume these specifications cover various technical aspects.
          Generate specific requirements related to ${perspective.focus} based on typical specifications for ${inferredDomain} systems.` 
          
          : `This ${fileType} file contains information related to a ${inferredDomain} system.
          
          Generate requirements focusing on ${perspective.focus} for ${inferredDomain} systems.`
        }
        
        For each requirement:
        1. Provide a concise title (3-10 words) that summarizes the requirement
        2. Provide a detailed, domain-specific requirement description of at least 150 words related to ${perspective.focus} within ${inferredDomain} functionality
        3. Classify it into one of these categories: 'functional', 'non-functional', 'security', 'performance'
        4. Assign a priority level: 'high', 'medium', or 'low'
        
        Format your response as a JSON array with exactly ${reqPerAnalysis} requirements, each with the properties 'title', 'description', 'category', and 'priority'.
        Example: [{"title": "Call Center Queue Logic", "description": "The target system must maintain the current call center queuing logic that routes cases based on SLA priority and agent skill matching... [detailed 150+ word description that thoroughly explains the requirement]", "category": "functional", "priority": "high"}, ...]
        
        Only output valid JSON with no additional text or explanations.
      `;

      try {
        // Store the prompt in a file to possibly refer back to it later
        const promptPath = path.join(tempDir, `prompt_${i}.txt`);
        fs.writeFileSync(promptPath, prompt, 'utf8');
        
        // Generate content
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // Parse the JSON response
        try {
          // Extract just the JSON part from the response
          const jsonMatch = text.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const jsonText = jsonMatch[0];
            const parsedResponse = JSON.parse(jsonText);
            
            // Transform the response to match the expected format
            const requirements = parsedResponse.map((item: any) => ({
              title: item.title || `${perspective.name} Requirement`,
              description: item.description || item.text, // Use description or fall back to text field for backward compatibility
              category: item.category,
              priority: item.priority
            }));
            
            allRequirements = [...allRequirements, ...requirements];
            console.log(`Added ${requirements.length} requirements from perspective ${perspective.name}`);
          } else {
            // If no JSON array was found, try parsing the whole response
            const parsedResponse = JSON.parse(text);
            
            // Transform the response to match the expected format
            const requirements = parsedResponse.map((item: any) => ({
              title: item.title || `${perspective.name} Requirement`,
              description: item.description || item.text, // Use description or fall back to text field for backward compatibility
              category: item.category,
              priority: item.priority
            }));
            
            allRequirements = [...allRequirements, ...requirements];
            console.log(`Added ${requirements.length} requirements from perspective ${perspective.name}`);
          }
        } catch (parseError) {
          console.error(`Error parsing Gemini response for perspective ${perspective.name}:`, parseError);
          console.error("Raw response:", text);
          // Continue with other perspectives even if one fails
        }
      } catch (perspectiveError) {
        console.error(`Error processing perspective ${perspective.name}:`, perspectiveError);
        // Continue with other perspectives even if one fails
      }
      
      // Small pause between analysis passes to avoid rate limiting
      if (i < selectedPerspectives.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Remove any duplicate requirements (comparing by title or description)
    const uniqueRequirements = allRequirements.filter((req, index, self) => {
      // Handle both new format (title/description) and legacy format (text)
      const reqText = req.description || req.text;
      return index === self.findIndex((r) => {
        const rText = r.description || r.text;
        return reqText === rText;
      });
    });
    
    console.log(`Extracted ${uniqueRequirements.length} unique requirements from ${selectedPerspectives.length} analysis perspectives`);
    
    // If we have an inputDataId, we could potentially process references here
    // Similar to how it's done in processTextFile or streamProcessPdfText
    
    return uniqueRequirements;
  } catch (error) {
    console.error("Error in stream file processor:", error);
    throw error;
  } finally {
    // Clean up temporary directory
    try {
      if (fs.existsSync(tempDir)) {
        // Remove all files in the temp directory
        const files = fs.readdirSync(tempDir);
        for (const file of files) {
          await unlink(path.join(tempDir, file));
        }
        // Remove the directory
        fs.rmdirSync(tempDir);
      }
    } catch (cleanupError) {
      console.error("Error cleaning up temporary directory:", cleanupError);
    }
  }
}

/**
 * Stream a file to disk, which is memory-efficient for large files
 * @param sourcePath Source file path
 * @param destPath Destination file path
 */
async function streamFileToDisk(sourcePath: string, destPath: string): Promise<void> {
  return pipeline(
    createReadStream(sourcePath),
    createWriteStream(destPath)
  );
}

// The generateUniqueId function is now defined at the top of the file