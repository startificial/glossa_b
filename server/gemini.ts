import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import os from 'os';
import VideoProcessor, { VideoScene } from './video-processor';
import { processTextFileForRequirement, TextReference } from './text-processor';
import { processAudioFileForRequirement, AudioTimestamp } from './audio-processor';

// Initialize the Gemini API with the API key
const apiKey = process.env.GOOGLE_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

// Gemini 2.5 model configuration with reduced token limit to prevent memory issues
const generationConfig = {
  temperature: 0.7,
  topK: 32,
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
 * Split a text file into chunks for processing
 * @param fileContent The content of the file to chunk
 * @param chunkSize The approximate size of each chunk (in characters)
 * @param overlapSize The number of characters to overlap between chunks
 * @returns Array of text chunks
 */
function chunkTextContent(fileContent: string, chunkSize: number = 4000, overlapSize: number = 500): string[] {
  const chunks: string[] = [];
  
  // If file is smaller than chunk size, return it as a single chunk
  if (fileContent.length <= chunkSize) {
    chunks.push(fileContent);
    return chunks;
  }
  
  let startIndex = 0;
  
  while (startIndex < fileContent.length) {
    // Calculate the end index for this chunk
    const endIndex = Math.min(startIndex + chunkSize, fileContent.length);
    
    // Find a good break point (end of paragraph or sentence)
    let breakPoint = endIndex;
    if (endIndex < fileContent.length) {
      // Try to find the end of a paragraph within the last 1000 characters of the chunk
      const searchStartIndex = Math.max(endIndex - 1000, startIndex);
      const searchText = fileContent.substring(searchStartIndex, endIndex);
      
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
    chunks.push(fileContent.substring(startIndex, breakPoint));
    
    // Move the start index for the next chunk, ensuring overlap
    startIndex = Math.max(startIndex, breakPoint - overlapSize);
  }
  
  return chunks;
}

/**
 * Process a text file to extract requirements using Gemini
 * @param filePath Path to the text file
 * @param projectName Name of the project for context
 * @param fileName Name of the file being processed
 * @param contentType Type of content in the file (workflow, user_feedback, documentation, specifications, etc.)
 * @param numRequirements Number of requirements to extract per chunk (default 5)
 * @returns Array of requirements with categories and priorities
 */
export async function processTextFile(filePath: string, projectName: string, fileName: string, contentType: string = 'general', minRequirements: number = 5, inputDataId?: number): Promise<any[]> {
  // No upper limit on requirements - extract as many as needed from the content
  try {
    // Read the file content
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Get file size in KB
    const fileSizeKB = Buffer.byteLength(fileContent, 'utf8') / 1024;
    console.log(`Processing text file: ${fileName} (${fileSizeKB.toFixed(2)} KB)`);
    
    // Split into chunks if large file
    const chunks = chunkTextContent(fileContent);
    console.log(`Split into ${chunks.length} chunks for processing`);
    
    // Initialize an array to store all requirements
    let allRequirements: any[] = [];
    
    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      console.log(`Processing chunk ${i+1}/${chunks.length}`);
      
      // Get the Gemini model
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-pro",
        generationConfig,
        safetySettings,
      });

      // Create a prompt for requirement extraction based on content type and the user-specified prompt
      const prompt = `
        You are a requirements analysis expert. Your task is to extract or generate software requirements from the following context:
        Project context: ${projectName}
        Source file: ${fileName}
        Content type: ${contentType}
        Chunk: ${i+1} of ${chunks.length}

        The source file contains customer-specific context about their business processes, data structures, workflows, or other specifications. Your job is to generate detailed, thorough requirements from the source file that will be used by a system implementor to migrate the customer from their legacy system to Salesforce.
        
        The requirements should be clear, comprehensive, and detailed. They should thoroughly describe the key workflows, processes, or structures that need to be solved for in the new system. Each requirement should contain a Name, which summarizes the requirement, and a Description, which details what's needed to fulfill the requirement. Each requirement description should be at least 75 words to ensure sufficient detail.
        
        Each requirement should also be labeled with a single category. Most requirements will be Functional.
        Functional: these requirements are related to business processes, workflows, data structures, and system capabilities
        Non-Functional: these requirements are related to usability and other non-functional capabilities
        Security: these requirements are related to permissions, access, and security
        Performance: these requirements are related to scale, data volumes, and processing speed
        
        Each requirement should also be labeled with a priority. Most requirements will be Medium priority.
        High: these requirements are essential to the success of the project overall
        Medium: these requirements are important to the project, but if one are two are missed the project will not fail
        Low: these requirements are nice to have, and the project will be successful without them
        
        The source file is tagged with the content type: ${contentType}.
        ${contentType === 'workflow' ? 
          `Since the content type is workflow, the content describes business workflows that should be migrated from the source system to the target system. Focus on identifying the key user flows, business processes, data transformations, and integration points that need to be considered.` 
          : contentType === 'user_feedback' ? 
          `Since the content type is user feedback, the content describes existing users' opinions about the legacy system. Focus on identifying the users' pain points and requested improvements so that the experience in the new system is an improvement.` 
          : contentType === 'documentation' || contentType === 'specifications' ? 
          `Since the content type is documentation or specifications, the content describes technical or business systems in the legacy system. Use this to identify data structures, business logic, and system behaviors in the legacy system, which may need to be recreated in the new system.` 
          : `Please analyze this general content and extract requirements based on the text.`
        }
        
        ${chunks.length > 1 ? 'Only extract requirements that appear in this specific chunk. Do not manufacture requirements based on guessing what might be in other chunks.' : ''}
        
        Please analyze the following content and extract as many requirements as needed (there is no upper limit):
        
        ${chunks[i]}
        
        Extract as many requirements as necessary to comprehensively cover the content provided. Do not limit yourself to a specific number - extract all valid requirements from the text. You should aim to extract at least ${minRequirements} requirements if the content supports it, but extract more if necessary.
        
        Format your response as a JSON array of requirements, where each requirement has:
        1. 'text' (string): A detailed description of at least 150 words that thoroughly explains what needs to be implemented
        2. 'category' (string): One of 'functional', 'non-functional', 'security', 'performance'
        3. 'priority' (string): One of 'high', 'medium', 'low'
        
        Example format (but with much more detailed text for each requirement):
        [
          {
            "text": "The system must implement a comprehensive case management workflow that allows customer service representatives to...[detailed 150+ word description]",
            "category": "functional", 
            "priority": "high"
          },
          {
            "text": "The Salesforce implementation must support a knowledge base integration that...[detailed 150+ word description]",
            "category": "functional",
            "priority": "medium"
          }
        ]
        
        Only output valid JSON with no additional text or explanations.
      `;

      try {
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
            const chunkRequirements = JSON.parse(jsonText);
            allRequirements = [...allRequirements, ...chunkRequirements];
          } else {
            // If no JSON array was found, try parsing the whole response
            const chunkRequirements = JSON.parse(text);
            allRequirements = [...allRequirements, ...chunkRequirements];
          }
        } catch (parseError) {
          console.error(`Error parsing Gemini response for chunk ${i+1}:`, parseError);
          console.error("Raw response:", text);
          // Continue with other chunks even if one fails
        }
      } catch (chunkError) {
        console.error(`Error processing chunk ${i+1}:`, chunkError);
        // Continue with other chunks even if one fails
      }
      
      // Small pause between chunk processing to avoid rate limiting
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Remove any duplicate requirements (comparing by text)
    const uniqueRequirements = allRequirements.filter((req, index, self) =>
      index === self.findIndex((r) => r.text === req.text)
    );
    
    console.log(`Extracted ${uniqueRequirements.length} unique requirements from ${chunks.length} chunks`);
    
    // If inputDataId is provided, find text references for each requirement
    if (inputDataId) {
      console.log('Finding text references for requirements...');
      
      // Process each requirement to find relevant text references
      const requirementsWithReferences = await Promise.all(
        uniqueRequirements.map(async (req) => {
          try {
            // Find relevant text passages for this requirement
            const textReferences = await processTextFileForRequirement(
              filePath,
              req.text,
              inputDataId
            );
            
            // Add the text references to the requirement if any were found
            return {
              ...req,
              textReferences: textReferences.length > 0 ? textReferences : undefined
            };
          } catch (error) {
            console.error(`Error finding text references for requirement: ${req.text.substring(0, 50)}...`, error);
            return req; // Return the original requirement without references
          }
        })
      );
      
      console.log(`Found text references for ${requirementsWithReferences.filter(r => r.textReferences).length} requirements`);
      return requirementsWithReferences;
    }
    
    return uniqueRequirements;
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
 * @param numChunks Number of different analysis chunks to generate (default 3)
 * @param reqPerChunk Number of requirements to extract per chunk (default 5)
 * @returns Array of requirements with categories and priorities
 */
export async function processVideoFile(
  filePath: string, 
  fileName: string, 
  projectName: string, 
  contentType: string = 'workflow',
  numChunks: number = 3,
  reqPerChunk: number = 5,
  inputDataId?: number
): Promise<any[]> {
  try {
    // Get file info (size, creation date, etc.)
    const stats = fs.statSync(filePath);
    const fileInfo = {
      name: fileName,
      size: stats.size,
      created: stats.birthtime.toISOString(),
      modified: stats.mtime.toISOString(),
    };
    
    // Detect scenes from the video if inputDataId is provided
    let videoScenes: VideoScene[] = [];
    if (inputDataId) {
      try {
        console.log('Detecting scenes in video...');
        const processor = new VideoProcessor(filePath, path.join(os.tmpdir(), 'video-scenes'), inputDataId);
        videoScenes = await processor.detectScenes();
        console.log(`Detected ${videoScenes.length} scenes in the video`);
      } catch (sceneError) {
        console.error('Error detecting scenes:', sceneError);
        // Continue with requirement generation even if scene detection fails
      }
    }

    // Log processing start
    console.log(`Processing video file: ${fileName} (${(fileInfo.size / (1024 * 1024)).toFixed(2)} MB)`);
    console.log(`Using ${numChunks} analysis passes with ${reqPerChunk} requirements each`);

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

    // Initialize an array to store all requirements
    let allRequirements: any[] = [];

    // Generate multiple analyses with different perspectives for more comprehensive requirements
    const perspectives = [
      {
        name: "User Interface & Experience",
        focus: "user interface, navigation flows, and user experience aspects of the workflows"
      },
      {
        name: "Business Process & Rules",
        focus: "business rules, workflow logic, approval processes, and conditional paths"
      },
      {
        name: "Data & Integration",
        focus: "data structures, field mappings, integration points, and data transformations"
      },
      {
        name: "Security & Compliance",
        focus: "access controls, data privacy, audit trails, and compliance requirements"
      },
      {
        name: "Performance & Scalability",
        focus: "performance expectations, response times, volume handling, and scalability needs"
      }
    ];

    // Select perspectives based on numChunks (for smaller values use most important ones)
    const selectedPerspectives = perspectives.slice(0, Math.min(numChunks, perspectives.length));
    
    // Process from each perspective
    for (let i = 0; i < selectedPerspectives.length; i++) {
      const perspective = selectedPerspectives[i];
      console.log(`Processing analysis pass ${i+1}/${selectedPerspectives.length}: ${perspective.name}`);
      
      // Get the Gemini model
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-pro",
        generationConfig,
        safetySettings,
      });

      // Create a specialized prompt for video content based on the content type and current perspective
      const prompt = `
        You are a business process expert specializing in software migration projects with expertise in ${perspective.name}. 
        Your task is to analyze a video file that demonstrates workflows in a source system and generate specific requirements 
        for implementing these workflows in a target system. Focus specifically on ${perspective.focus}.
        
        Project context: ${projectName}
        Video file details:
        - Name: ${fileName}
        - Size: ${(fileInfo.size / (1024 * 1024)).toFixed(2)} MB
        - Created: ${new Date(fileInfo.created).toLocaleString()}
        - Modified: ${new Date(fileInfo.modified).toLocaleString()}
        - Content type: ${contentType}
        - Inferred domain: ${inferredDomain}
        - Analysis perspective: ${perspective.name} (focusing on ${perspective.focus})
        
        ${contentType === 'workflow' ? 
          `This video demonstrates specific workflows and business processes in a ${inferredDomain} system that must be recreated in a target system.
          Based on the file name '${fileName}' and project context '${projectName}', this video likely shows:
          
          1. Service call center functionality in a service cloud or CRM system
          2. Customer service representative workflows when handling customer inquiries
          3. Case management, customer information lookup, and service request handling
          4. Integration with knowledge bases, customer history, and service level agreements
          5. Data entry, validation, and workflow approval processes
          
          Generate requirements focusing on ${perspective.focus} aspects of these workflows that must be implemented in the target system.`
          
          : contentType === 'user_feedback' ?
          `This video shows users providing feedback about a ${inferredDomain} system.
          Based on the file name '${fileName}' and project context '${projectName}', users are likely discussing pain points related to ${perspective.focus}.
          
          Generate requirements that address specific user feedback about ${perspective.focus} for the target system.`
          
          : contentType === 'training' ? 
          `This video shows training for users of a ${inferredDomain} system.
          Based on the file name '${fileName}' and project context '${projectName}', this training likely covers ${perspective.focus} aspects of the system.
          
          Generate requirements to ensure these training scenarios related to ${perspective.focus} are well-supported in the target system.`
          
          : contentType === 'demonstration' ?
          `This video demonstrates features of a ${inferredDomain} system with a focus on ${perspective.focus}.
          Based on the file name '${fileName}' and project context '${projectName}', this demo likely shows key capabilities that must be preserved.
          
          Generate requirements to ensure these demonstrated capabilities related to ${perspective.focus} are implemented in the target system.`
          
          : `This video shows aspects of a ${inferredDomain} system that need to be migrated, with focus on ${perspective.focus}.
          Based on the file name '${fileName}' and project context '${projectName}', generate requirements to ensure proper implementation in the target system.`
        }

        For each requirement:
        1. Provide a detailed, domain-specific requirement text of at least 150 words that focuses on ${perspective.focus} within ${inferredDomain} functionality
        2. Classify it into one of these categories: 'functional', 'non-functional', 'security', 'performance'
        3. Assign a priority level: 'high', 'medium', or 'low'
        
        Format your response as a JSON array with exactly ${reqPerChunk} requirements, each with the properties 'text', 'category', and 'priority'.
        Example: [{"text": "The target system must implement the service call center queue management workflow with priority-based routing, skill-based assignment, and SLA tracking identical to the source system... [detailed 150+ word description that thoroughly explains the requirement]", "category": "functional", "priority": "high"}, ...]
        
        Only output valid JSON with no additional text or explanations.
      `;

      try {
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
            
            // Transform the response to match the expected format and add to collection
            const chunkRequirements = parsedResponse.map((item: any) => ({
              text: item.text,
              category: item.category,
              priority: item.priority
            }));
            
            allRequirements = [...allRequirements, ...chunkRequirements];
            console.log(`Added ${chunkRequirements.length} requirements from perspective ${perspective.name}`);
          } else {
            // If no JSON array was found, try parsing the whole response
            const parsedResponse = JSON.parse(text);
            
            // Transform the response to match the expected format and add to collection
            const chunkRequirements = parsedResponse.map((item: any) => ({
              text: item.text,
              category: item.category,
              priority: item.priority
            }));
            
            allRequirements = [...allRequirements, ...chunkRequirements];
            console.log(`Added ${chunkRequirements.length} requirements from perspective ${perspective.name}`);
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
      
      // Small pause between chunk processing to avoid rate limiting
      if (i < selectedPerspectives.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Remove any duplicate requirements (comparing by text)
    const uniqueRequirements = allRequirements.filter((req, index, self) =>
      index === self.findIndex((r) => r.text === req.text)
    );
    
    console.log(`Extracted ${uniqueRequirements.length} unique requirements from ${selectedPerspectives.length} perspectives`);
    
    // Process references based on input type
    if (inputDataId) {
      // Match video scenes to requirements if scenes are available
      if (videoScenes.length > 0) {
        console.log('Matching video scenes to requirements...');
        
        // Process each requirement to find relevant scenes
        const requirementsWithScenes = await Promise.all(
          uniqueRequirements.map(async (req) => {
            try {
              // Find relevant scenes for this requirement
              // Use the same processor instance
              const processor = new VideoProcessor(filePath, path.join(os.tmpdir(), 'video-scenes'), videoScenes[0].inputDataId);
              const matchedScenes = await processor.processScenes(videoScenes, req.text);
              
              // Add the scenes to the requirement
              return {
                ...req,
                videoScenes: matchedScenes.length > 0 ? matchedScenes : undefined
              };
            } catch (error) {
              console.error(`Error matching scenes for requirement: ${req.text.substring(0, 50)}...`, error);
              return req; // Return the original requirement without scenes
            }
          })
        );
        
        console.log(`Matched scenes for ${requirementsWithScenes.filter(r => r.videoScenes).length} requirements`);
        
        // Also try to extract audio timestamps if possible
        try {
          console.log('Extracting audio timestamps from video...');
          
          // Process each requirement to find relevant audio timestamps
          const requirementsWithTimestamps = await Promise.all(
            requirementsWithScenes.map(async (req) => {
              try {
                // Find relevant audio timestamps for this requirement
                const audioTimestamps = await processAudioFileForRequirement(
                  filePath,
                  req.text,
                  inputDataId
                );
                
                // Add the audio timestamps to the requirement if any were found
                return {
                  ...req,
                  audioTimestamps: audioTimestamps.length > 0 ? audioTimestamps : undefined
                };
              } catch (error) {
                console.error(`Error finding audio timestamps for requirement: ${req.text.substring(0, 50)}...`, error);
                return req; // Return the original requirement without timestamps
              }
            })
          );
          
          console.log(`Found audio timestamps for ${requirementsWithTimestamps.filter(r => r.audioTimestamps).length} requirements`);
          return requirementsWithTimestamps;
        } catch (audioError) {
          console.error('Error processing audio from video:', audioError);
          return requirementsWithScenes;
        }
      } else if (fileInfo.name.toLowerCase().endsWith('.mp3') || fileInfo.name.toLowerCase().endsWith('.wav') || fileInfo.name.toLowerCase().endsWith('.m4a')) {
        // This is an audio file, try to extract audio timestamps
        console.log('Extracting audio timestamps...');
        
        // Process each requirement to find relevant audio timestamps
        const requirementsWithTimestamps = await Promise.all(
          uniqueRequirements.map(async (req) => {
            try {
              // Find relevant audio timestamps for this requirement
              const audioTimestamps = await processAudioFileForRequirement(
                filePath,
                req.text,
                inputDataId
              );
              
              // Add the audio timestamps to the requirement if any were found
              return {
                ...req,
                audioTimestamps: audioTimestamps.length > 0 ? audioTimestamps : undefined
              };
            } catch (error) {
              console.error(`Error finding audio timestamps for requirement: ${req.text.substring(0, 50)}...`, error);
              return req; // Return the original requirement without timestamps
            }
          })
        );
        
        console.log(`Found audio timestamps for ${requirementsWithTimestamps.filter(r => r.audioTimestamps).length} requirements`);
        return requirementsWithTimestamps;
      }
    }
    
    return uniqueRequirements;
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
 * @param numAnalyses Number of different analysis perspectives to use (default 2)
 * @param reqPerAnalysis Number of requirements to extract per analysis (default 5)
 * @returns Array of requirements with categories and priorities
 */
export async function generateRequirementsForFile(
  fileType: string, 
  fileName: string, 
  projectName: string, 
  filePath?: string, 
  contentType: string = 'general',
  numAnalyses: number = 2,
  reqPerAnalysis: number = 5
): Promise<any[]> {
  try {
    // Special handling for video files if path is provided
    if (fileType === 'video' && filePath) {
      return await processVideoFile(filePath, fileName, projectName, contentType, numAnalyses, reqPerAnalysis);
    }

    console.log(`Processing ${fileType} file: ${fileName}`);
    console.log(`Using ${numAnalyses} analysis perspectives with ${reqPerAnalysis} requirements each`);

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

    // Initialize an array to store all requirements
    let allRequirements: any[] = [];

    // Define analysis perspectives based on file type
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

      // Create a prompt based on the file type, content type, and current perspective
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
        1. Provide a detailed, domain-specific requirement text of at least 150 words related to ${perspective.focus} within ${inferredDomain} functionality
        2. Classify it into one of these categories: 'functional', 'non-functional', 'security', 'performance'
        3. Assign a priority level: 'high', 'medium', or 'low'
        
        Format your response as a JSON array with exactly ${reqPerAnalysis} requirements, each with the properties 'text', 'category', and 'priority'.
        Example: [{"text": "The target system must maintain the current call center queuing logic that routes cases based on SLA priority and agent skill matching... [detailed 150+ word description that thoroughly explains the requirement]", "category": "functional", "priority": "high"}, ...]
        
        Only output valid JSON with no additional text or explanations.
      `;

      try {
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
            allRequirements = [...allRequirements, ...parsedResponse];
            console.log(`Added ${parsedResponse.length} requirements from perspective ${perspective.name}`);
          } else {
            // If no JSON array was found, try parsing the whole response
            const parsedResponse = JSON.parse(text);
            allRequirements = [...allRequirements, ...parsedResponse];
            console.log(`Added ${parsedResponse.length} requirements from perspective ${perspective.name}`);
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
    
    // Remove any duplicate requirements (comparing by text)
    const uniqueRequirements = allRequirements.filter((req, index, self) =>
      index === self.findIndex((r) => r.text === req.text)
    );
    
    console.log(`Extracted ${uniqueRequirements.length} unique requirements from ${selectedPerspectives.length} analysis perspectives`);
    return uniqueRequirements;
  } catch (error) {
    console.error("Error generating requirements with Gemini:", error);
    throw error;
  }
}