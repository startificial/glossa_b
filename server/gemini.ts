import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

// Initialize the Gemini API with the API key
const apiKey = process.env.GOOGLE_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

// Gemini 2.5 model configuration
const generationConfig = {
  temperature: 0.7,
  topK: 32,
  topP: 0.95,
  maxOutputTokens: 8192,
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
 * Process a text file to extract requirements using Gemini
 * @param filePath Path to the text file
 * @param projectName Name of the project for context
 * @param fileName Name of the file being processed
 * @returns Array of requirements with categories and priorities
 */
export async function processTextFile(filePath: string, projectName: string, fileName: string): Promise<any[]> {
  try {
    // Read the file content
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Get the Gemini model
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-pro",
      generationConfig,
      safetySettings,
    });

    // Create a prompt for requirement extraction
    const prompt = `
      You are a requirements analysis expert. Your task is to extract or generate software requirements from the following text.
      
      Project context: ${projectName}
      Source file: ${fileName}
      
      Please analyze the following content and extract clear, specific software requirements:
      
      ${fileContent}
      
      For each requirement:
      1. Provide the requirement text (clear, specific, actionable)
      2. Classify it into one of these categories: 'functional', 'non-functional', 'security', 'performance'
      3. Assign a priority level: 'high', 'medium', or 'low'
      
      Format your response as a JSON array with exactly 5 requirements, each with the properties 'text', 'category', and 'priority'.
      Example: [{"text": "The system must allow users to reset their password", "category": "functional", "priority": "high"}, ...]
      
      Only output valid JSON with no additional text or explanations.
    `;

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
        return JSON.parse(jsonText);
      }
      
      // If no JSON array was found, try parsing the whole response
      return JSON.parse(text);
    } catch (parseError) {
      console.error("Error parsing Gemini response as JSON:", parseError);
      throw new Error("Failed to parse requirements from Gemini response");
    }
  } catch (error) {
    console.error("Error processing file with Gemini:", error);
    throw error;
  }
}

/**
 * Generate requirements specifically for video files using Gemini
 * @param filePath Path to the video file
 * @param fileName Name of the file
 * @param projectName Name of the project for context
 * @returns Array of requirements with categories and priorities
 */
export async function processVideoFile(filePath: string, fileName: string, projectName: string): Promise<any[]> {
  try {
    // Get file info (size, creation date, etc.)
    const stats = fs.statSync(filePath);
    const fileInfo = {
      name: fileName,
      size: stats.size,
      created: stats.birthtime.toISOString(),
      modified: stats.mtime.toISOString(),
    };

    // Get the Gemini model
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-pro",
      generationConfig,
      safetySettings,
    });

    // Create a specialized prompt for video content focused on workflow identification
    const prompt = `
      You are a business process analysis expert specializing in workflow extraction from videos. Your task is to analyze a video file that potentially contains business workflows and generate requirements for migrating these workflows to a target system.
      
      Project context: ${projectName}
      Video file details:
      - Name: ${fileName}
      - Size: ${(fileInfo.size / (1024 * 1024)).toFixed(2)} MB
      - Created: ${new Date(fileInfo.created).toLocaleString()}
      - Modified: ${new Date(fileInfo.modified).toLocaleString()}
      
      Assume the video shows one or more workflows or business processes being performed in a source system that need to be recreated in a target system. 
      
      Analyze the video file name and other metadata to infer what workflows might be captured, and then generate 5 requirements for implementing these workflows in the target system.
      
      Your requirements should:
      1. Identify specific business workflows that would likely be shown in this type of video
      2. Specify how these workflows should be implemented in the target system
      3. Include details about user interactions, data flow, validation rules, and business logic
      4. Consider integration points with other systems
      5. Address migration-specific concerns (data mapping, transformation rules, etc.)

      For each requirement:
      1. Provide a detailed requirement text that describes a workflow that needs to be recreated (be specific and detailed)
      2. Classify it into one of these categories: 'functional', 'non-functional', 'security', 'performance'
      3. Assign a priority level: 'high', 'medium', or 'low'
      4. Include a brief 1-2 sentence rationale explaining why this workflow is important to migrate
      
      Format your response as a JSON array with exactly 5 requirements, each with the properties 'text', 'category', 'priority', and 'rationale'.
      Example: [{"text": "The system must replicate the order fulfillment workflow from the source system, including the 5-step approval process, conditional routing based on order value, and integration with the inventory management system", "category": "functional", "priority": "high", "rationale": "The order fulfillment process is a core business function that must be maintained with identical business rules to ensure operational continuity."}, ...]
      
      Only output valid JSON with no additional text or explanations.
    `;

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
        
        // Transform the response to match the expected format (without rationale)
        return parsedResponse.map((item: any) => ({
          text: item.text,
          category: item.category,
          priority: item.priority
        }));
      }
      
      // If no JSON array was found, try parsing the whole response
      const parsedResponse = JSON.parse(text);
      
      // Transform the response to match the expected format (without rationale)
      return parsedResponse.map((item: any) => ({
        text: item.text,
        category: item.category,
        priority: item.priority
      }));
    } catch (parseError) {
      console.error("Error parsing Gemini response as JSON:", parseError);
      throw new Error("Failed to parse requirements from Gemini response");
    }
  } catch (error) {
    console.error("Error processing video file with Gemini:", error);
    throw error;
  }
}

/**
 * Generate requirements for non-text files using Gemini
 * @param fileType Type of the file (audio, video, etc.)
 * @param fileName Name of the file
 * @param projectName Name of the project for context
 * @param filePath Optional path to the file for content-based analysis
 * @returns Array of requirements with categories and priorities
 */
export async function generateRequirementsForFile(fileType: string, fileName: string, projectName: string, filePath?: string): Promise<any[]> {
  try {
    // Special handling for video files if path is provided
    if (fileType === 'video' && filePath) {
      return await processVideoFile(filePath, fileName, projectName);
    }

    // Get the Gemini model
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-pro",
      generationConfig,
      safetySettings,
    });

    // Create a prompt based on the file type
    const prompt = `
      You are a requirements analysis expert. Your task is to generate software requirements for handling a ${fileType} file in a software application.
      
      Project context: ${projectName}
      File name: ${fileName}
      File type: ${fileType}
      
      Please generate 5 realistic software requirements for processing, managing, and interacting with this ${fileType} file.
      
      For each requirement:
      1. Provide the requirement text (clear, specific, actionable)
      2. Classify it into one of these categories: 'functional', 'non-functional', 'security', 'performance'
      3. Assign a priority level: 'high', 'medium', or 'low'
      
      Format your response as a JSON array with exactly 5 requirements, each with the properties 'text', 'category', and 'priority'.
      Example: [{"text": "The system must support playback of ${fileType} files", "category": "functional", "priority": "high"}, ...]
      
      Only output valid JSON with no additional text or explanations.
    `;

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
        return JSON.parse(jsonText);
      }
      
      // If no JSON array was found, try parsing the whole response
      return JSON.parse(text);
    } catch (parseError) {
      console.error("Error parsing Gemini response as JSON:", parseError);
      throw new Error("Failed to parse requirements from Gemini response");
    }
  } catch (error) {
    console.error("Error generating requirements with Gemini:", error);
    throw error;
  }
}