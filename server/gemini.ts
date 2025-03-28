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
 * @param contentType Type of content in the file (workflow, user_feedback, documentation, specifications, etc.)
 * @returns Array of requirements with categories and priorities
 */
export async function processTextFile(filePath: string, projectName: string, fileName: string, contentType: string = 'general'): Promise<any[]> {
  try {
    // Read the file content
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Get the Gemini model
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-pro",
      generationConfig,
      safetySettings,
    });

    // Create a prompt for requirement extraction based on content type
    const prompt = `
      You are a requirements analysis expert. Your task is to extract or generate software requirements from the following text.
      
      Project context: ${projectName}
      Source file: ${fileName}
      Content type: ${contentType}
      
      ${contentType === 'workflow' ? 
        `This content contains workflow descriptions that should be migrated from a source system to a target system. 
        Focus on identifying business processes, user flows, data transformations, and integration points that need to be recreated.` 
        : contentType === 'user_feedback' ? 
        `This content contains user feedback about an existing system. 
        Focus on identifying pain points, requested improvements, and user expectations that should be addressed in the target system.` 
        : contentType === 'documentation' ? 
        `This content contains documentation about a system or its features. 
        Focus on identifying core functionality, business rules, and system behaviors that must be preserved in the target system.` 
        : contentType === 'specifications' ? 
        `This content contains technical specifications. 
        Focus on identifying data structures, API requirements, business logic, and technical constraints that must be implemented.` 
        : `Please analyze this general content and extract requirements based on the text.`
      }
      
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
 * @param contentType Type of content in the video (workflow, user_feedback, demonstration, training, etc.)
 * @returns Array of requirements with categories and priorities
 */
export async function processVideoFile(filePath: string, fileName: string, projectName: string, contentType: string = 'workflow'): Promise<any[]> {
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

    // Create a specialized prompt for video content based on the content type
    const prompt = `
      You are a business process analysis expert specializing in requirement extraction from videos. Your task is to analyze a video file and generate requirements for a software system.
      
      Project context: ${projectName}
      Video file details:
      - Name: ${fileName}
      - Size: ${(fileInfo.size / (1024 * 1024)).toFixed(2)} MB
      - Created: ${new Date(fileInfo.created).toLocaleString()}
      - Modified: ${new Date(fileInfo.modified).toLocaleString()}
      - Content type: ${contentType}
      
      ${contentType === 'workflow' ? 
        `This video shows one or more business workflows or processes being performed in a source system that need to be recreated in a target system.
        Analyze the video file name and metadata to infer what workflows might be captured, and then generate requirements for implementing these workflows in the target system.
        
        Your requirements should:
        1. Identify specific business workflows that would likely be shown in this type of video
        2. Specify how these workflows should be implemented in the target system
        3. Include details about user interactions, data flow, validation rules, and business logic
        4. Consider integration points with other systems
        5. Address migration-specific concerns (data mapping, transformation rules, etc.)`
        
        : contentType === 'user_feedback' ?
        `This video contains user feedback about an existing system. 
        The video likely shows users discussing their experiences, demonstrating pain points, or suggesting improvements.
        
        Your requirements should:
        1. Identify user pain points and frustrations that would likely be discussed
        2. Capture user suggestions and desired improvements
        3. Specify usability enhancements needed in the target system
        4. Identify workflow improvements based on user feedback
        5. Prioritize changes that would have the highest impact on user satisfaction`
        
        : contentType === 'training' ? 
        `This video contains training material that demonstrates how to use a system.
        The video likely walks through specific procedures, features, or workflows step by step.
        
        Your requirements should:
        1. Identify the key procedures being demonstrated
        2. Specify how these procedures should be implemented in the target system
        3. Capture any best practices or guidelines mentioned in the training
        4. Identify features that require user education or documentation
        5. Specify any training-specific tools or modes that should be implemented`
        
        : contentType === 'demonstration' ?
        `This video contains a demonstration of system features or capabilities.
        The video likely showcases functionality, user interfaces, and system behaviors.
        
        Your requirements should:
        1. Identify the key features being demonstrated
        2. Specify how these features should be implemented in the target system
        3. Capture the user experience aspects that should be preserved
        4. Identify integration points with other systems shown in the demo
        5. Specify performance expectations based on the demonstrated behavior`
        
        : `Assume the video shows various aspects of a system that need to be implemented or migrated.
        Analyze the video file name and metadata to infer what might be captured, and then generate requirements accordingly.`
      }

      For each requirement:
      1. Provide a detailed requirement text that is specific and actionable
      2. Classify it into one of these categories: 'functional', 'non-functional', 'security', 'performance'
      3. Assign a priority level: 'high', 'medium', or 'low'
      4. Include a brief 1-2 sentence rationale explaining why this requirement is important
      
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
 * @param contentType Type of content in the file (workflow, user_feedback, documentation, specifications, etc.)
 * @returns Array of requirements with categories and priorities
 */
export async function generateRequirementsForFile(fileType: string, fileName: string, projectName: string, filePath?: string, contentType: string = 'general'): Promise<any[]> {
  try {
    // Special handling for video files if path is provided
    if (fileType === 'video' && filePath) {
      return await processVideoFile(filePath, fileName, projectName, contentType);
    }

    // Get the Gemini model
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-pro",
      generationConfig,
      safetySettings,
    });

    // Create a prompt based on the file type and content type
    const prompt = `
      You are a requirements analysis expert. Your task is to generate software requirements for handling a ${fileType} file in a software application.
      
      Project context: ${projectName}
      File name: ${fileName}
      File type: ${fileType}
      Content type: ${contentType}
      
      ${contentType === 'workflow' ? 
        `This ${fileType} file contains workflow information that should be migrated from a source system to a target system.
        Focus on generating requirements related to business processes, user flows, data transformations, and system integrations.` 
        : contentType === 'user_feedback' ? 
        `This ${fileType} file contains user feedback about an existing system.
        Focus on requirements that address user pain points, improvements, and expectations.` 
        : contentType === 'documentation' ? 
        `This ${fileType} file contains documentation about a system or its features.
        Focus on requirements that preserve core functionality, business rules, and system behaviors.` 
        : contentType === 'specifications' ? 
        `This ${fileType} file contains technical specifications.
        Focus on requirements related to data structures, APIs, business logic, and technical constraints.` 
        : `Please analyze this ${fileType} file and generate general requirements for processing, managing, and interacting with it.`
      }
      
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