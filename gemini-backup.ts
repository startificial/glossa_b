import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import os from 'os';
import VideoProcessor, { VideoScene } from './video-processor';
import { processTextFileForRequirement, TextReference } from './text-processor';
import { processAudioFileForRequirement, AudioTimestamp } from './audio-processor';
import { GEMINI_REQUIREMENTS_PROMPT, EXPERT_REVIEW_PROMPT } from './llm_prompts';

/**
 * Expert Review type definition that matches the ExpertReview interface in client/src/lib/types.ts
 */
export interface ExpertReview {
  evaluation: {
    rating: 'good' | 'good with caveats' | 'bad';
    explanation: string;
    follow_up_questions: string[];
  }
}

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

      // Prepare content type specific instructions based on content type
      let contentTypeInstructions = '';
      if (contentType === 'workflow') {
        contentTypeInstructions = `Since the content type is workflow, the content describes business workflows that should be migrated from the source system to the target system. Focus on identifying the key user flows, business processes, data transformations, and integration points that need to be considered.`;
      } else if (contentType === 'user_feedback') {
        contentTypeInstructions = `Since the content type is user feedback, the content describes existing users' opinions about the legacy system. Focus on identifying the users' pain points and requested improvements so that the experience in the new system is an improvement.`;
      } else if (contentType === 'documentation' || contentType === 'specifications') {
        contentTypeInstructions = `Since the content type is documentation or specifications, the content describes technical or business systems in the legacy system. Use this to identify data structures, business logic, and system behaviors in the legacy system, which may need to be recreated in the new system.`;
      } else {
        contentTypeInstructions = `Please analyze this general content and extract requirements based on the text.`;
      }
      
      // Prepare chunking instructions
      const chunkingInstructions = chunks.length > 1 ? 
        'Only extract requirements that appear in this specific chunk. Do not manufacture requirements based on guessing what might be in other chunks.' : 
        '';
      
      // Create a prompt for requirement extraction using our centralized prompt
      const prompt = GEMINI_REQUIREMENTS_PROMPT
        .replace('{projectName}', projectName)
        .replace('{fileName}', fileName)
        .replace('{contentType}', contentType)
        .replace('{chunkIndex}', (i+1).toString())
        .replace('{totalChunks}', chunks.length.toString())
        .replace('{contentTypeInstructions}', contentTypeInstructions)
        .replace('{chunkingInstructions}', chunkingInstructions)
        .replace('{chunkContent}', chunks[i])
        .replace('{minRequirements}', minRequirements.toString());

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
    
    // Remove any duplicate requirements (comparing by title or description)
    const uniqueRequirements = allRequirements.filter((req, index, self) => {
      // Handle both new format (title/description) and legacy format (text)
      const reqText = req.description || req.text;
      return index === self.findIndex((r) => {
        const rText = r.description || r.text;
        return reqText === rText;
      });
    });
    
    console.log(`Extracted ${uniqueRequirements.length} unique requirements from ${chunks.length} chunks`);
    
    // If inputDataId is provided, find text references for each requirement
    if (inputDataId) {
      console.log('Finding text references for requirements...');
      
      // Process each requirement to find relevant text references
      const requirementsWithReferences = await Promise.all(
        uniqueRequirements.map(async (req) => {
          try {
            // Get the requirement text, handling both new format (description) and legacy format (text)
            const requirementText = req.description || req.text;
            
            // Make sure we have text to process
            if (!requirementText) {
              console.warn(`Skipping text references for requirement with missing text: ${JSON.stringify(req)}`);
              return req;
            }
            
            // Find relevant text passages for this requirement
            const textReferences = await processTextFileForRequirement(
              filePath,
              requirementText,
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
    
    // Extract domain information
    const domainsList = ['CRM', 'ERP', 'service cloud', 'sales cloud', 'marketing cloud', 'commerce cloud', 'call center', 
      'customer service', 'field service', 'salesforce', 'dynamics', 'sap', 'oracle', 'servicenow', 'zendesk'];
    
    // Check if any domain keywords are in the filename or project name
    const matchedKeywords = domainsList.filter(domain => 
      fileName.toLowerCase().includes(domain.toLowerCase()) || 
      projectName.toLowerCase().includes(domain.toLowerCase())
    );
    
    const inferredDomain = matchedKeywords.length > 0 
      ? matchedKeywords.join(', ') 
      : "service management"; // Default to service management if no specific domain is detected
    
    // Detect scenes from the video if inputDataId is provided
    let videoScenes: VideoScene[] = [];
    let videoSummary: string = '';
    
    if (inputDataId) {
      try {
        console.log('Detecting scenes in video...');
        const processor = new VideoProcessor(filePath, path.join(os.tmpdir(), 'video-scenes'), inputDataId);
        videoScenes = await processor.detectScenes();
        console.log(`Detected ${videoScenes.length} scenes in the video`);
        
        // Generate video summary for context-aware processing
        if (videoScenes.length > 0) {
          try {
            console.log('Generating overall video content summary...');
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
            
            const prompt = `
              # Video Analysis Task: Generate Overall Content Summary
              
              ## Instructions
              Generate a concise summary describing the overall content, purpose, and scope of the video this summary is derived from.
              This should be a high-level view that serves as the primary context for understanding individual scenes.
              
              ## Video Information:
              - Filename: ${fileName}
              - Project context: ${projectName}
              - Content type: ${contentType}
              - Duration: ${(videoScenes[videoScenes.length-1].endTime).toFixed(2)} seconds
              - Number of detected scenes: ${videoScenes.length}
              
              ## Domain context: 
              ${inferredDomain}
              
              ## Output Format:
              1. Summary should be 3-5 sentences, focusing on what appears to be the main purpose of the video
              2. Use neutral, descriptive language
              3. Focus on identifying the likely subject matter based on filename and project context
            `;
            
            const response = await model.generateContent(prompt);
            const result = await response.response;
            videoSummary = result.text().trim();
            console.log('Generated video summary:', videoSummary);
          } catch (summaryError) {
            console.error('Error generating video summary:', summaryError);
            // Continue processing even if summary generation fails
            videoSummary = `Video from ${projectName} related to ${contentType} showing ${inferredDomain} functionality.`;
            console.log('Using fallback video summary:', videoSummary);
          }
        }
      } catch (sceneError) {
        console.error('Error detecting scenes:', sceneError);
        // Continue with requirement generation even if scene detection fails
      }
    }

    // Log processing start
    console.log(`Processing video file: ${fileName} (${(fileInfo.size / (1024 * 1024)).toFixed(2)} MB)`);
    console.log(`Using ${numChunks} analysis passes with ${reqPerChunk} requirements each`);

    // We've already extracted domain information at the beginning of the function
    // No need to re-extract it here

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
        1. Provide a concise title (3-10 words) that summarizes the requirement
        2. Provide a detailed, domain-specific requirement description of at least 150 words that focuses on ${perspective.focus} within ${inferredDomain} functionality
        3. Classify it into one of these categories: 'functional', 'non-functional', 'security', 'performance'
        4. Assign a priority level: 'high', 'medium', or 'low'
        
        Format your response as a JSON array with exactly ${reqPerChunk} requirements, each with the properties 'title', 'description', 'category', and 'priority'.
        Example: [{"title": "Call Center Queue Management", "description": "The target system must implement the service call center queue management workflow with priority-based routing, skill-based assignment, and SLA tracking identical to the source system... [detailed 150+ word description that thoroughly explains the requirement]", "category": "functional", "priority": "high"}, ...]
        
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
              title: item.title || `${perspective.name} Requirement`,
              description: item.description || item.text, // Use description or fall back to text field for backward compatibility
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
              title: item.title || `${perspective.name} Requirement`,
              description: item.description || item.text, // Use description or fall back to text field for backward compatibility
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
    
    // Remove any duplicate requirements (comparing by title or description)
    const uniqueRequirements = allRequirements.filter((req, index, self) => {
      // Handle both new format (title/description) and legacy format (text)
      const reqText = req.description || req.text;
      return index === self.findIndex((r) => {
        const rText = r.description || r.text;
        return reqText === rText;
      });
    });
    
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
              // Use description as the requirement text (falls back to text if available)
              const requirementText = req.description || req.text;
              if (!requirementText) {
                console.warn(`Skipping scene matching for requirement with missing text: ${req.title}`);
                return req;
              }
              
              // Use the same processor instance
              const processor = new VideoProcessor(filePath, path.join(os.tmpdir(), 'video-scenes'), videoScenes[0].inputDataId);
              const matchedScenes = await processor.processScenes(videoScenes, requirementText, videoSummary);
              
              // Add the scenes to the requirement
              return {
                ...req,
                videoScenes: matchedScenes.length > 0 ? matchedScenes : undefined
              };
            } catch (error) {
              // Use available text (description or text) for error message
              const textExcerpt = (req.description || req.text)?.substring(0, 50) || req.title || 'unknown';
              console.error(`Error matching scenes for requirement: ${textExcerpt}...`, error);
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
                // Use description as the requirement text (falls back to text if available)
                const requirementText = req.description || req.text;
                if (!requirementText) {
                  console.warn(`Skipping audio timestamp extraction for requirement with missing text: ${req.title}`);
                  return req;
                }
                
                const audioTimestamps = await processAudioFileForRequirement(
                  filePath,
                  requirementText,
                  inputDataId
                );
                
                // Add the audio timestamps to the requirement if any were found
                return {
                  ...req,
                  audioTimestamps: audioTimestamps.length > 0 ? audioTimestamps : undefined
                };
              } catch (error) {
                // Use available text (description or text) for error message
                const textExcerpt = (req.description || req.text)?.substring(0, 50) || req.title || 'unknown';
                console.error(`Error finding audio timestamps for requirement: ${textExcerpt}...`, error);
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
              // Use description as the requirement text (falls back to text if available)
              const requirementText = req.description || req.text;
              if (!requirementText) {
                console.warn(`Skipping audio timestamp extraction for requirement with missing text: ${req.title}`);
                return req;
              }
              
              const audioTimestamps = await processAudioFileForRequirement(
                filePath,
                requirementText,
                inputDataId
              );
              
              // Add the audio timestamps to the requirement if any were found
              return {
                ...req,
                audioTimestamps: audioTimestamps.length > 0 ? audioTimestamps : undefined
              };
            } catch (error) {
              // Use available text (description or text) for error message
              const textExcerpt = (req.description || req.text)?.substring(0, 50) || req.title || 'unknown';
              console.error(`Error finding audio timestamps for requirement: ${textExcerpt}...`, error);
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

    // Extract domain information
    const domainsList = ['CRM', 'ERP', 'service cloud', 'sales cloud', 'marketing cloud', 'commerce cloud', 'call center', 
      'customer service', 'field service', 'salesforce', 'dynamics', 'sap', 'oracle', 'servicenow', 'zendesk'];
    
    // Check if any domain keywords are in the filename or project name
    const matchedKeywords = domainsList.filter(domain => 
      fileName.toLowerCase().includes(domain.toLowerCase()) || 
      projectName.toLowerCase().includes(domain.toLowerCase())
    );
    
    const inferredDomain = matchedKeywords.length > 0 
      ? matchedKeywords.join(', ') 
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
        1. Provide a concise title (3-10 words) that summarizes the requirement
        2. Provide a detailed, domain-specific requirement description of at least 150 words related to ${perspective.focus} within ${inferredDomain} functionality
        3. Classify it into one of these categories: 'functional', 'non-functional', 'security', 'performance'
        4. Assign a priority level: 'high', 'medium', or 'low'
        
        Format your response as a JSON array with exactly ${reqPerAnalysis} requirements, each with the properties 'title', 'description', 'category', and 'priority'.
        Example: [{"title": "Call Center Queue Logic", "description": "The target system must maintain the current call center queuing logic that routes cases based on SLA priority and agent skill matching... [detailed 150+ word description that thoroughly explains the requirement]", "category": "functional", "priority": "high"}, ...]
        
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
    return uniqueRequirements;
  } catch (error) {
    console.error("Error generating requirements with Gemini:", error);
    throw error;
  }
}

/**
 * Generate an expert review for a requirement using Google Gemini
 * @param requirementText The text of the requirement to review
 * @returns Promise resolving to the expert review results
 */
export async function generateExpertReview(requirementText: string): Promise<ExpertReview> {
  try {
    console.log(`Generating expert review for requirement: ${requirementText.substring(0, 50)}...`);
    
    // Get the Gemini model
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-pro",
      generationConfig,
      safetySettings,
    });

    // Create a prompt for expert review using our centralized prompt
    const prompt = EXPERT_REVIEW_PROMPT
      .replace('{requirementText}', requirementText);

    // Generate content
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse the JSON response
    try {
      // Extract just the JSON part from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonText = jsonMatch[0];
        return JSON.parse(jsonText);
      } else {
        // If no JSON object was found, try parsing the whole response
        return JSON.parse(text);
      }
    } catch (parseError) {
      console.error('Error parsing expert review response:', parseError);
      console.error('Raw response:', text);
      
      // Return a default error response if parsing fails
      return {
        evaluation: {
          rating: "bad",
          explanation: "Error processing review. The AI model did not return a valid JSON response.",
          follow_up_questions: [
            "Please try again with a clearer requirement description."
          ]
        }
      };
    }
  } catch (error) {
    console.error("Error generating expert review with Gemini:", error);
    throw error;
  }
}