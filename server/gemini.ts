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
 * Generate requirements for non-text files using Gemini
 * @param fileType Type of the file (audio, video, etc.)
 * @param fileName Name of the file
 * @param projectName Name of the project for context
 * @returns Array of requirements with categories and priorities
 */
export async function generateRequirementsForFile(fileType: string, fileName: string, projectName: string): Promise<any[]> {
  try {
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