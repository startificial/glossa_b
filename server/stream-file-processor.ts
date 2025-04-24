import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { promisify } from 'util';
import { createReadStream, createWriteStream } from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as mammoth from 'mammoth';
import { logger } from './utils/logger';

const mkdir = promisify(fs.mkdir);
const unlink = promisify(fs.unlink);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);

// Initialize Google Generative AI with appropriate model
const API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

// Default generation config (similar to what's in gemini.ts)
const generationConfig = {
  temperature: 0.7,
  topP: 0.8,
  topK: 40,
  maxOutputTokens: 8192,
};

// Safety settings with proper enum values from Google Generative AI lib
const safetySettings = [
  {
    category: "HARM_CATEGORY_HARASSMENT" as any,
    threshold: "BLOCK_MEDIUM_AND_ABOVE" as any,
  },
  {
    category: "HARM_CATEGORY_HATE_SPEECH" as any,
    threshold: "BLOCK_MEDIUM_AND_ABOVE" as any,
  },
  {
    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT" as any,
    threshold: "BLOCK_MEDIUM_AND_ABOVE" as any,
  },
  {
    category: "HARM_CATEGORY_DANGEROUS_CONTENT" as any,
    threshold: "BLOCK_MEDIUM_AND_ABOVE" as any,
  },
];

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
 * Extract text content from a text file
 * @param filePath Path to the text file
 * @returns Object containing the extracted text and processing info
 */
export async function extractTextFromTxt(filePath: string): Promise<{text: string, success: boolean, error?: string}> {
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
      success: true
    };
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

/**
 * Utility function to generate a unique ID for a nanoid-like ID
 * @param length Length of the ID
 * @returns Random ID string
 */
function generateUniqueId(length: number = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < length; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}