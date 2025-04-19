import Anthropic from '@anthropic-ai/sdk';
import { AcceptanceCriterion, GherkinStructure } from '../shared/types';
import { ImplementationTask } from '../shared/schema';
import { 
  REQUIREMENTS_GENERATION_PROMPT, 
  ACCEPTANCE_CRITERIA_PROMPT,
  IMPLEMENTATION_TASKS_PROMPT,
  CLAUDE_SYSTEM_PROMPT_WORKFLOW
} from './llm_prompts';

// Initialize the Claude API with the API key
const apiKey = process.env.ANTHROPIC_API_KEY || '';
const anthropic = new Anthropic({
  apiKey
});

/**
 * Generate requirements using Claude AI
 * @param context Input context for Claude to analyze
 * @param projectName Name of the project for context
 * @param fileName Name of the file being processed
 * @param contentType Type of content in the file
 * @param minRequirements Minimum number of requirements to generate
 * @returns Array of requirements with titles, descriptions, categories, and priorities
 */
export async function generateRequirementsWithClaude(
  context: string,
  projectName: string,
  fileName: string,
  contentType: string = 'general',
  minRequirements: number = 5
): Promise<any[]> {
  try {
    if (!apiKey) {
      console.error('Missing ANTHROPIC_API_KEY environment variable');
      throw new Error('Claude API key is not configured. Please set the ANTHROPIC_API_KEY environment variable.');
    }

    console.log(`Generating requirements with Claude for ${fileName}, content type: ${contentType}`);
    
    // Create a Claude-specific prompt for requirement generation using template from llm_prompts
    let prompt = REQUIREMENTS_GENERATION_PROMPT
      .replace('{projectName}', projectName)
      .replace('{contentType}', contentType)
      .replace('{fileName}', fileName)
      .replace('{context}', context)
      .replace('{minRequirements}', minRequirements.toString());

    // Call Claude API to generate requirements
    const message = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219', // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
      max_tokens: 4000,
      temperature: 0.2,
      system: "You are a business analyst specializing in requirement extraction for software migration projects. Extract detailed, specific requirements from provided content and format them as valid JSON with no additional text.",
      messages: [
        { role: 'user', content: prompt }
      ]
    });

    // Extract the response text
    const responseText = typeof message.content[0] === 'object' && 'text' in message.content[0] 
      ? message.content[0].text as string
      : JSON.stringify(message.content[0]);
    
    // Parse the JSON response
    try {
      // Extract just the JSON part from the response 
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const jsonText = jsonMatch[0];
        const parsedResponse = JSON.parse(jsonText);
        
        console.log(`Claude extracted ${parsedResponse.length} requirements from the content`);
        return parsedResponse;
      } else {
        // If no JSON array was found, try parsing the whole response
        const parsedResponse = JSON.parse(responseText);
        console.log(`Claude extracted ${parsedResponse.length} requirements from the content`);
        return parsedResponse;
      }
    } catch (parseError) {
      console.error('Error parsing Claude response:', parseError);
      console.error('Raw response:', responseText);
      return []; // Return empty array on error
    }
  } catch (error) {
    console.error('Error generating requirements with Claude:', error);
    return []; // Return empty array on error
  }
}

/**
 * Generate Salesforce-specific implementation tasks for requirements
 * @param projectName Name of the project for context
 * @param sourceSystem Name of the source system
 * @param targetSystem Name of the target system (typically Salesforce)
 * @param projectDescription Description of the project for context
 * @param requirementText The requirement text
 * @param acceptanceCriteria Array of acceptance criteria for this requirement
 * @returns Promise resolving to an array of implementation tasks with Salesforce-specific details
 */
export async function generateImplementationTasks(
  projectName: string,
  sourceSystem: string,
  targetSystem: string,
  projectDescription: string,
  requirementText: string,
  acceptanceCriteria: AcceptanceCriterion[],
  requirementId: number
): Promise<any[]> {
  try {
    if (!apiKey) {
      console.error('Missing ANTHROPIC_API_KEY environment variable');
      throw new Error('Claude API key is not configured. Please set the ANTHROPIC_API_KEY environment variable.');
    }

    console.log(`Generating Salesforce implementation tasks for requirement: ${requirementText.substring(0, 100)}...`);

    // Use Claude API for generating implementation tasks
    console.log('Generating implementation tasks with Claude...');
    // Format acceptance criteria for the prompt
    const formattedCriteria = acceptanceCriteria.map((ac, index) => {
      return `Acceptance Criterion ${index + 1}: ${ac.description}`;
    }).join('\n\n');

    // Create a prompt for generating implementation tasks using template from llm_prompts
    let prompt = IMPLEMENTATION_TASKS_PROMPT
      .replace('{projectName}', projectName)
      .replace('{sourceSystem}', sourceSystem)
      .replace('{targetSystem}', targetSystem)
      .replace('{requirementText}', requirementText)
      .replace('{acceptanceCriteria}', formattedCriteria);

    // Generate content using Claude with improved system prompt
    const message = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219', // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
      max_tokens: 3000,
      temperature: 0.7,
      system: `You are a Salesforce technical architect specialized in implementing complex migration projects and integrations.
Your task is to create detailed implementation tasks for Salesforce development.
You must respond ONLY with valid JSON formatted as an array of implementation task objects.
Each task must have:
- title: string
- description: string
- system: string
- taskType: string (one of: "development", "integration", "configuration", "testing")
- complexity: string (one of: "simple", "moderate", "complex")
- estimatedHours: number
- priority: string (one of: "low", "medium", "high")
- implementationSteps: array of objects with stepNumber, stepDescription, and relevantDocumentationLinks (array of strings)

Do not include any explanations, markdown formatting, or non-JSON content in your response.
Your entire response must be parseable as a JSON array.`,
      messages: [
        { role: 'user', content: prompt }
      ]
    });

    // Extract and parse the JSON response
    let responseText = '';
    
    // Handle different types of content from Claude
    if (message.content && message.content.length > 0) {
      const content = message.content[0];
      if (typeof content === 'object') {
        const contentObj = content as any;
        responseText = contentObj.text || JSON.stringify(content);
      } else {
        responseText = String(content);
      }
    }
    
    // Helper function to validate and fix implementation tasks structure 
    const validateAndFixImplementationTasks = (tasks: any[]): any[] => {
      return tasks.map(task => {
        // If the task has no implementation steps, add an empty array
        if (!task.implementationSteps) {
          task.implementationSteps = [];
        }
        
        // Validate each implementation step
        if (Array.isArray(task.implementationSteps)) {
          task.implementationSteps = task.implementationSteps.map((step: any, index: number) => {
            // Ensure each step has the required properties
            const validStep: any = {
              stepNumber: step.stepNumber || index + 1,
              stepDescription: step.stepDescription || '',
              relevantDocumentationLinks: []
            };
            
            // Handle relevantDocumentationLinks
            if (step.relevantDocumentationLinks) {
              // Make sure it's an array
              if (Array.isArray(step.relevantDocumentationLinks)) {
                validStep.relevantDocumentationLinks = step.relevantDocumentationLinks;
              } else if (typeof step.relevantDocumentationLinks === 'string') {
                // If it's a string, try to parse it as JSON or make a single-item array
                try {
                  validStep.relevantDocumentationLinks = JSON.parse(step.relevantDocumentationLinks);
                } catch (e) {
                  validStep.relevantDocumentationLinks = [step.relevantDocumentationLinks];
                }
              }
            }
            
            return validStep;
          });
        }
        
        // Handle relevantDocuments field (from the new prompt format)
        if (task.relevantDocuments) {
          // If we have relevantDocuments, add them to both sfDocumentationLinks and overallDocumentationLinks
          const links: string[] = [];
          const sfDocs: {title: string, url: string}[] = [];
          
          if (Array.isArray(task.relevantDocuments)) {
            task.relevantDocuments.forEach((doc: any) => {
              if (doc.link) {
                links.push(doc.link);
              }
              if (doc.documentTitle && doc.link) {
                sfDocs.push({
                  title: doc.documentTitle,
                  url: doc.link
                });
              }
            });
          }
          
          // Add to overallDocumentationLinks
          if (!task.overallDocumentationLinks) {
            task.overallDocumentationLinks = links;
          } else {
            task.overallDocumentationLinks = [...task.overallDocumentationLinks, ...links];
          }
          
          // Add to sfDocumentationLinks
          if (!task.sfDocumentationLinks) {
            task.sfDocumentationLinks = sfDocs;
          } else {
            task.sfDocumentationLinks = [...task.sfDocumentationLinks, ...sfDocs];
          }
        }
        
        // If sfDocumentationLinks is missing, add an empty array
        if (!task.sfDocumentationLinks) {
          task.sfDocumentationLinks = [];
        }
        
        // If overallDocumentationLinks is missing, add an empty array
        if (!task.overallDocumentationLinks) {
          task.overallDocumentationLinks = [];
        }
        
        return task;
      });
    };

    try {
      // Log the first part of the response for debugging
      console.log('Claude response excerpt:', responseText.substring(0, 500));
      
      // Clean the response - remove any markdown formatting if present
      const cleanedResponse = responseText
        .replace(/^```json\s*/gm, '') // Remove ```json at the start of lines
        .replace(/^```\s*/gm, '')     // Remove ``` at the start of lines
        .replace(/\s*```$/gm, '')     // Remove ``` at the end of lines
        .replace(/^\s*```$/gm, '');   // Remove standalone ``` lines
      
      console.log('Cleaned response excerpt:', cleanedResponse.substring(0, 200));
      
      // Strategy 1: Direct JSON parsing - most likely to work with the improved system prompt
      try {
        const implementationTasks = JSON.parse(cleanedResponse);
        console.log(`Strategy 1: Successfully parsed full response, generated ${Array.isArray(implementationTasks) ? implementationTasks.length : 1} implementation tasks`);
        
        // Ensure we're returning an array and validate/fix implementation steps
        const tasksArray = Array.isArray(implementationTasks) ? implementationTasks : [implementationTasks];
        const validatedTasks = validateAndFixImplementationTasks(tasksArray);
        return validatedTasks;
      } catch (err) {
        console.log('Strategy 1 (direct parsing) failed:', err.message);
        console.log('Trying alternative parsing strategies...');
      }
      
      // Strategy 2: Try to find JSON array pattern "[{...}]" in the response
      const jsonArrayMatch = cleanedResponse.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (jsonArrayMatch) {
        const jsonText = jsonArrayMatch[0];
        try {
          const implementationTasks = JSON.parse(jsonText);
          console.log(`Strategy 2: Found JSON array pattern, generated ${implementationTasks.length} implementation tasks`);
          
          // Validate and fix implementation steps structure if needed
          const validatedTasks = validateAndFixImplementationTasks(implementationTasks);
          return validatedTasks;
        } catch (err) {
          console.log('Strategy 2 parsing failed:', err.message);
        }
      }
      
      // Strategy 3: Extract individual task objects and reconstruct
      const taskObjects = cleanedResponse.match(/\{\s*"title"\s*:[\s\S]*?("implementationSteps"\s*:[\s\S]*?\])\s*\}/g);
      if (taskObjects && taskObjects.length > 0) {
        try {
          console.log(`Found ${taskObjects.length} potential task objects to reconstruct`);
          const reconstructedJson = `[${taskObjects.join(',')}]`;
          const implementationTasks = JSON.parse(reconstructedJson);
          console.log(`Strategy 3: Reconstructed ${implementationTasks.length} implementation tasks`);
          
          // Validate and fix implementation steps structure if needed
          const validatedTasks = validateAndFixImplementationTasks(implementationTasks);
          return validatedTasks;
        } catch (err) {
          console.log('Strategy 3 (reconstruction) failed:', err.message);
        }
      }
      
      // Strategy 4: Look for code blocks that might contain JSON (e.g., ```json ... ```)
      const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch && codeBlockMatch[1]) {
        try {
          const implementationTasks = JSON.parse(codeBlockMatch[1]);
          console.log(`Strategy 4: Extracted content from code block, generated ${Array.isArray(implementationTasks) ? implementationTasks.length : 1} implementation tasks`);
          
          // Ensure we're returning an array and validate/fix implementation steps
          const tasksArray = Array.isArray(implementationTasks) ? implementationTasks : [implementationTasks];
          const validatedTasks = validateAndFixImplementationTasks(tasksArray);
          return validatedTasks;
        } catch (err) {
          console.log('Strategy 4 (code block) parsing failed:', err.message);
        }
      }
      
      // Strategy 5: Aggressive cleanup - remove all non-JSON characters and try again
      try {
        // This strategy tries to clean the response more aggressively
        console.log('Attempting aggressive cleanup of response...');
        
        // Remove any non-JSON content before the first [ or {
        const jsonStartIdx = Math.min(
          cleanedResponse.indexOf('[') >= 0 ? cleanedResponse.indexOf('[') : Infinity,
          cleanedResponse.indexOf('{') >= 0 ? cleanedResponse.indexOf('{') : Infinity
        );
        
        // Remove any non-JSON content after the last ] or }
        const jsonEndIdx = Math.max(
          cleanedResponse.lastIndexOf(']'),
          cleanedResponse.lastIndexOf('}') + 1
        );
        
        if (jsonStartIdx < Infinity && jsonEndIdx > 0) {
          const extractedJson = cleanedResponse.substring(jsonStartIdx, jsonEndIdx);
          try {
            const implementationTasks = JSON.parse(extractedJson);
            console.log(`Strategy 5: Aggressively cleaned, generated ${Array.isArray(implementationTasks) ? implementationTasks.length : 1} implementation tasks`);
            
            // Ensure we're returning an array and validate/fix implementation steps
            const tasksArray = Array.isArray(implementationTasks) ? implementationTasks : [implementationTasks];
            const validatedTasks = validateAndFixImplementationTasks(tasksArray);
            return validatedTasks;
          } catch (err) {
            console.log('Strategy 5 (aggressive cleanup) failed:', err.message);
          }
        }
      } catch (repairAttemptErr) {
        console.log('Strategy 5 failed entirely:', repairAttemptErr);
      }
      
      // If we're here, all parsing strategies failed
      console.error('All JSON parsing strategies failed for response');
      console.error('Raw response:', responseText);
      
      // Throw an error instead of creating a fallback task
      throw new Error('Failed to parse implementation tasks from Claude response');
    } catch (parseError) {
      console.error('Error in parsing process:', parseError);
      console.error('Raw response:', responseText);
      
      // Throw an error instead of creating a fallback task
      throw new Error('Failed to parse implementation tasks from Claude response');
    }
  } catch (error) {
    console.error('Error generating implementation tasks with Claude:', error);
    
    // Throw the error to be handled by the caller
    throw error;
  }
}

/**
 * Generate acceptance criteria in Gherkin format using Claude
 * @param projectName Name of the project for context
 * @param projectDescription Description of the project for context
 * @param requirementText The requirement text to generate acceptance criteria for
 * @returns Promise resolving to an array of acceptance criteria in Gherkin format
 */
export async function generateAcceptanceCriteria(
  projectName: string,
  projectDescription: string,
  requirementText: string
): Promise<AcceptanceCriterion[]> {
  try {
    if (!apiKey) {
      console.error('Missing ANTHROPIC_API_KEY environment variable');
      throw new Error('Claude API key is not configured. Please set the ANTHROPIC_API_KEY environment variable.');
    }

    console.log(`Generating acceptance criteria with Claude for: ${requirementText.substring(0, 100)}...`);
    
    // Create a prompt for Claude to generate acceptance criteria using template from llm_prompts
    let prompt = ACCEPTANCE_CRITERIA_PROMPT
      .replace('{projectName}', projectName)
      .replace('{projectDescription}', projectDescription)
      .replace('{requirementText}', requirementText);

    // Generate acceptance criteria using Claude
    const message = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219', // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
      max_tokens: 2000,
      temperature: 0.4,
      system: "You are a business analyst specializing in creating high-quality acceptance criteria for software requirements. Generate acceptance criteria in Gherkin format and output ONLY valid JSON with no additional text. Your entire response MUST be a valid JSON array containing the acceptance criteria objects. Do not include markdown formatting, explanation text, or code blocks.",
      messages: [
        { role: 'user', content: prompt }
      ]
    });

    // Extract the response text
    const responseText = typeof message.content[0] === 'object' && 'text' in message.content[0] 
      ? message.content[0].text as string
      : JSON.stringify(message.content[0]);
    
    try {
      // Extract just the JSON part from the response using a more robust approach
      // Strategy 1: Try to find a JSON array pattern
      const jsonArrayMatch = responseText.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (jsonArrayMatch) {
        try {
          const jsonText = jsonArrayMatch[0];
          const parsedResponse = JSON.parse(jsonText);
          console.log(`Claude generated ${parsedResponse.length} acceptance criteria`);
          return parsedResponse;
        } catch (err) {
          console.log('JSON array parsing failed, trying next strategy');
        }
      }
      
      // Strategy 2: Look for code blocks that might contain JSON (e.g., ```json ... ```)
      const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch && codeBlockMatch[1]) {
        try {
          const parsedResponse = JSON.parse(codeBlockMatch[1]);
          console.log(`Claude generated ${Array.isArray(parsedResponse) ? parsedResponse.length : 1} acceptance criteria from code block`);
          return Array.isArray(parsedResponse) ? parsedResponse : [parsedResponse];
        } catch (err) {
          console.log('Code block parsing failed, trying next strategy');
        }
      }
      
      // Strategy 3: Try parsing the whole response as JSON
      try {
        const parsedResponse = JSON.parse(responseText);
        console.log(`Claude generated ${Array.isArray(parsedResponse) ? parsedResponse.length : 1} acceptance criteria from full response`);
        return Array.isArray(parsedResponse) ? parsedResponse : [parsedResponse];
      } catch (err) {
        console.log('Full response parsing failed, trying next strategy');
      }
      
      // Strategy 4: Try to extract individual criteria object patterns and reconstruct
      const criteriaPatterns = responseText.match(/\{[\s\S]*?"description"[\s\S]*?\}/g);
      if (criteriaPatterns && criteriaPatterns.length > 0) {
        try {
          const reconstructedJson = `[${criteriaPatterns.join(',')}]`;
          const parsedResponse = JSON.parse(reconstructedJson);
          console.log(`Claude generated ${parsedResponse.length} acceptance criteria from reconstructed JSON`);
          return parsedResponse;
        } catch (repairErr) {
          console.log('JSON reconstruction failed:', repairErr);
        }
      }
      
      // If all strategies failed, log the response and throw a helpful error
      console.error('All JSON parsing strategies failed for response');
      console.error('Raw Claude response:', responseText);
      throw new Error('Failed to parse acceptance criteria from Claude response. The AI generated an invalid JSON format.');
    } catch (parseError) {
      console.error('Error parsing Claude response for acceptance criteria:', parseError);
      console.error('Raw Claude response:', responseText);
      
      // Throw an error to prevent using fallback content
      throw new Error('Failed to parse acceptance criteria from Claude response');
    }
  } catch (error) {
    console.error('Error generating acceptance criteria with Claude:', error);
    // Throw the error to be handled by the caller
    throw error;
  }
}
