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

    // Extract potential domain information from filename and project name
    const potentialDomains = ['CRM', 'ERP', 'service cloud', 'sales cloud', 'marketing cloud', 'commerce cloud', 'call center', 
      'customer service', 'field service', 'salesforce', 'dynamics', 'sap', 'oracle', 'servicenow', 'zendesk'];
    
    // Check if any domain keywords are in the filename or project name
    const domainKeywords = potentialDomains.filter(domain => 
      fileName.toLowerCase().includes(domain.toLowerCase()) || 
      projectName.toLowerCase().includes(domain.toLowerCase())
    );
    
    const inferredDomain = domainKeywords.length > 0 
      ? domainKeywords.join(', ') 
      : "service management"; // Default to service management if no specific domain is detected

    // Get the Gemini model
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-pro",
      generationConfig,
      safetySettings,
    });

    // Create a specialized prompt for video content based on the content type
    const prompt = `
      You are a business process expert specializing in software migration projects. Your task is to analyze a video file that demonstrates workflows in a source system and generate specific requirements for implementing these workflows in a target system.
      
      Project context: ${projectName}
      Video file details:
      - Name: ${fileName}
      - Size: ${(fileInfo.size / (1024 * 1024)).toFixed(2)} MB
      - Created: ${new Date(fileInfo.created).toLocaleString()}
      - Modified: ${new Date(fileInfo.modified).toLocaleString()}
      - Content type: ${contentType}
      - Inferred domain: ${inferredDomain}
      
      ${contentType === 'workflow' ? 
        `This video demonstrates specific workflows and business processes in a ${inferredDomain} system that must be recreated in a target system.
        Based on the file name '${fileName}' and project context '${projectName}', this video likely shows:
        
        1. Service call center functionality in a service cloud or CRM system
        2. Customer service representative workflows when handling customer inquiries
        3. Case management, customer information lookup, and service request handling
        4. Integration with knowledge bases, customer history, and service level agreements
        5. Data entry, validation, and workflow approval processes
        
        Generate requirements that focus on implementing these specific service cloud workflows in the target system, 
        with emphasis on preserving business rules, user experience, data relationships, and integration points.
        
        Your requirements should include details about:
        - Specific call center functionality that must be migrated
        - User role permissions and access controls
        - Customer data management capabilities
        - Service level agreement tracking
        - Reporting and analytics needs
        - Integration with telephony or communication systems`
        
        : contentType === 'user_feedback' ?
        `This video shows users providing feedback about a ${inferredDomain} system.
        Based on the file name '${fileName}' and project context '${projectName}', users are likely discussing:
        
        1. Pain points in the current service center or CRM workflows
        2. Difficulties with customer information access or updates
        3. Challenges with service request management or routing
        4. Suggestions for improving customer engagement processes
        5. Issues with reporting or performance metrics
        
        Generate requirements that address these specific pain points and suggestions for the target system.`
        
        : contentType === 'training' ? 
        `This video shows training for users of a ${inferredDomain} system.
        Based on the file name '${fileName}' and project context '${projectName}', this training likely covers:
        
        1. Step-by-step procedures for handling different types of service requests
        2. Navigation of customer information screens and service history
        3. Best practices for service ticket categorization and prioritization
        4. How to use knowledge articles or solution databases
        5. Processes for escalation and supervisor involvement
        
        Generate requirements that ensure these training scenarios are supported in the target system.`
        
        : contentType === 'demonstration' ?
        `This video demonstrates features of a ${inferredDomain} system.
        Based on the file name '${fileName}' and project context '${projectName}', this demo likely shows:
        
        1. Core functionality of the service cloud or CRM platform
        2. Customer service representative interface and workflow
        3. Case management and routing capabilities
        4. Integration with knowledge bases and customer data
        5. Reporting and dashboard features
        
        Generate requirements that ensure these demonstrated capabilities are implemented in the target system.`
        
        : `This video shows aspects of a ${inferredDomain} system that need to be migrated.
        Based on the file name '${fileName}' and project context '${projectName}', the video likely demonstrates key service management or CRM functionality that must be preserved in the target system.`
      }

      For each requirement:
      1. Provide a detailed, domain-specific requirement text that focuses on service cloud/CRM functionality
      2. Classify it into one of these categories: 'functional', 'non-functional', 'security', 'performance'
      3. Assign a priority level: 'high', 'medium', or 'low'
      
      Format your response as a JSON array with exactly 5 requirements, each with the properties 'text', 'category', and 'priority'.
      Example: [{"text": "The target system must implement the service call center queue management workflow with priority-based routing, skill-based assignment, and SLA tracking identical to the source system", "category": "functional", "priority": "high"}, ...]
      
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

    // Extract potential domain information from filename and project name
    const potentialDomains = ['CRM', 'ERP', 'service cloud', 'sales cloud', 'marketing cloud', 'commerce cloud', 'call center', 
      'customer service', 'field service', 'salesforce', 'dynamics', 'sap', 'oracle', 'servicenow', 'zendesk'];
    
    // Check if any domain keywords are in the filename or project name
    const domainKeywords = potentialDomains.filter(domain => 
      fileName.toLowerCase().includes(domain.toLowerCase()) || 
      projectName.toLowerCase().includes(domain.toLowerCase())
    );
    
    const inferredDomain = domainKeywords.length > 0 
      ? domainKeywords.join(', ') 
      : "service management"; // Default to service management if no specific domain is detected

    // Get the Gemini model
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-pro",
      generationConfig,
      safetySettings,
    });

    // Create a prompt based on the file type and content type, with domain-specific guidance
    const prompt = `
      You are a business systems analyst specializing in CRM and service management systems. Your task is to generate migration requirements for a project that's moving functionality from a source system to a target system.
      
      Project context: ${projectName}
      File name: ${fileName}
      File type: ${fileType}
      Content type: ${contentType}
      Inferred domain: ${inferredDomain}
      
      ${contentType === 'workflow' ? 
        `This ${fileType} file documents workflows and business processes in a ${inferredDomain} system that must be recreated in a target system.
        
        Assume this file contains information about:
        1. Service call center functionality and customer service workflows
        2. Case management, routing, and escalation processes
        3. Customer information retrieval and service request handling
        4. Knowledge base integration and service level agreement tracking
        5. Integration with telephony and communication systems
        
        Generate detailed migration requirements focused on these specific service workflows.` 
        
        : contentType === 'user_feedback' ? 
        `This ${fileType} file contains user feedback about a ${inferredDomain} system.
        
        Assume users are providing feedback about:
        1. Pain points in the current service center or CRM workflows
        2. Difficulties with customer information access or updates
        3. Challenges with service request management or routing
        4. Suggestions for improving customer engagement processes
        5. Issues with reporting or performance metrics
        
        Generate requirements that address these specific user needs in the target system.` 
        
        : contentType === 'documentation' ? 
        `This ${fileType} file contains documentation about a ${inferredDomain} system.
        
        Assume this documentation describes:
        1. Core service functionality and business rules
        2. User roles, permissions, and access controls
        3. Case management and workflow configuration
        4. Integration with other systems and data sources
        5. Reporting and analytics capabilities
        
        Generate requirements that ensure these documented capabilities are preserved in the target system.` 
        
        : contentType === 'specifications' ? 
        `This ${fileType} file contains technical specifications for a ${inferredDomain} system.
        
        Assume these specifications cover:
        1. Data models and entity relationships for customer service
        2. API requirements for integration with communication channels
        3. Business logic for case handling and service level agreements
        4. Technical constraints and performance requirements
        5. Security requirements for customer data
        
        Generate specific technical requirements based on these aspects.` 
        
        : `This ${fileType} file contains information related to a ${inferredDomain} system.
        
        Generate requirements focused on service management capabilities including:
        1. Customer service workflows and case management
        2. Service level agreement tracking and reporting
        3. Knowledge base integration and customer information access
        4. Agent productivity tools and user interface requirements
        5. Integration with communication systems`
      }
      
      For each requirement:
      1. Provide a detailed, specific requirement text focused on service management functionality
      2. Classify it into one of these categories: 'functional', 'non-functional', 'security', 'performance'
      3. Assign a priority level: 'high', 'medium', or 'low'
      
      Format your response as a JSON array with exactly 5 requirements, each with the properties 'text', 'category', and 'priority'.
      Example: [{"text": "The target system must implement the service call center queue management workflow with priority-based routing, skill-based assignment, and SLA tracking identical to the source system", "category": "functional", "priority": "high"}, ...]
      
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