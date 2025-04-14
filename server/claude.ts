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
      model: 'claude-3-opus-20240229',
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

    // Generate content using Claude
    const message = await anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 3000,
      temperature: 0.7,
      system: 'You are a Salesforce technical architect specialized in implementing complex migration projects and integrations.',
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
      // Try different strategies to extract valid JSON from the response
      
      // Strategy 1: Try to find JSON array pattern "[{...}]" in the response
      const jsonArrayMatch = responseText.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (jsonArrayMatch) {
        const jsonText = jsonArrayMatch[0];
        try {
          const implementationTasks = JSON.parse(jsonText);
          console.log(`Strategy 1: Generated ${implementationTasks.length} implementation tasks`);
          
          // Validate and fix implementation steps structure if needed
          const validatedTasks = validateAndFixImplementationTasks(implementationTasks);
          return validatedTasks;
        } catch (err) {
          console.log('Strategy 1 parsing failed, trying next strategy');
        }
      }
      
      // Strategy 2: Try to find a single JSON object pattern "{...}" (in case it's not an array)
      const jsonObjectMatch = responseText.match(/\{\s*"[\s\S]*"\s*:\s*[\s\S]*\}/);
      if (jsonObjectMatch) {
        const jsonText = jsonObjectMatch[0];
        try {
          const implementationTask = JSON.parse(jsonText);
          console.log(`Strategy 2: Generated a single implementation task`);
          
          // Validate and fix implementation steps structure if needed
          const validatedTasks = validateAndFixImplementationTasks([implementationTask]);
          return validatedTasks;
        } catch (err) {
          console.log('Strategy 2 parsing failed, trying next strategy');
        }
      }
      
      // Strategy 3: Try parsing the whole response as JSON
      try {
        const implementationTasks = JSON.parse(responseText);
        console.log(`Strategy 3: Generated ${Array.isArray(implementationTasks) ? implementationTasks.length : 1} implementation tasks`);
        
        // Ensure we're returning an array and validate/fix implementation steps
        const tasksArray = Array.isArray(implementationTasks) ? implementationTasks : [implementationTasks];
        const validatedTasks = validateAndFixImplementationTasks(tasksArray);
        return validatedTasks;
      } catch (err) {
        console.log('Strategy 3 parsing failed, trying next strategy');
      }
      
      // Strategy 4: Look for code blocks that might contain JSON (e.g., ```json ... ```)
      const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch && codeBlockMatch[1]) {
        try {
          const implementationTasks = JSON.parse(codeBlockMatch[1]);
          console.log(`Strategy 4: Generated ${Array.isArray(implementationTasks) ? implementationTasks.length : 1} implementation tasks`);
          
          // Ensure we're returning an array and validate/fix implementation steps
          const tasksArray = Array.isArray(implementationTasks) ? implementationTasks : [implementationTasks];
          const validatedTasks = validateAndFixImplementationTasks(tasksArray);
          return validatedTasks;
        } catch (err) {
          console.log('Strategy 4 parsing failed, no more strategies to try');
        }
      }
      
      // Strategy 5: Try to extract and fix truncated/incomplete JSON
      try {
        // This strategy extracts the JSON even if it's truncated by looking for the most complete
        // structure possible and attempting repair
        console.log('Attempting repair of truncated/incomplete JSON...');
        
        // Look for a series of implementation task objects
        const taskPatterns = responseText.match(/\{[\s\S]*?"title"[\s\S]*?"description"[\s\S]*?"implementationSteps"[\s\S]*?\}/g);
        
        if (taskPatterns && taskPatterns.length > 0) {
          // Try to reconstruct a JSON array from the found patterns
          const reconstructedJson = `[${taskPatterns.join(',')}]`;
          try {
            const implementationTasks = JSON.parse(reconstructedJson);
            console.log(`Strategy 5: Repaired and generated ${implementationTasks.length} implementation tasks`);
            
            // Validate and fix implementation steps structure if needed
            const validatedTasks = validateAndFixImplementationTasks(implementationTasks);
            return validatedTasks;
          } catch (repairErr) {
            console.log('JSON repair failed:', repairErr);
          }
        }
      } catch (repairAttemptErr) {
        console.log('Strategy 5 failed entirely:', repairAttemptErr);
      }
      
      // If we're here, all parsing strategies failed
      console.error('All JSON parsing strategies failed for response');
      console.error('Raw response:', responseText);
      throw new Error('Failed to parse implementation tasks from Claude response');
    } catch (parseError) {
      console.error('Error in parsing process:', parseError);
      console.error('Raw response:', responseText);
      throw new Error('Failed to parse implementation tasks from Claude response');
    }
  } catch (error) {
    console.error('Error generating implementation tasks with Claude:', error);
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
      model: 'claude-3-haiku-20240307',
      max_tokens: 2000,
      temperature: 0.4,
      system: "You are a business analyst specializing in creating high-quality acceptance criteria for software requirements. Generate acceptance criteria in Gherkin format and output as valid JSON.",
      messages: [
        { role: 'user', content: prompt }
      ]
    });

    // Extract the response text
    const responseText = typeof message.content[0] === 'object' && 'text' in message.content[0] 
      ? message.content[0].text as string
      : JSON.stringify(message.content[0]);
    
    try {
      // Extract just the JSON part from the response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const jsonText = jsonMatch[0];
        const parsedResponse = JSON.parse(jsonText);
        
        console.log(`Claude generated ${parsedResponse.length} acceptance criteria`);
        return parsedResponse;
      } else {
        // If no JSON array was found, try parsing the whole response
        const parsedResponse = JSON.parse(responseText);
        console.log(`Claude generated ${parsedResponse.length} acceptance criteria`);
        return parsedResponse;
      }
    } catch (parseError) {
      console.error('Error parsing Claude response for acceptance criteria:', parseError);
      throw parseError;
    }
  } catch (error) {
    console.error('Error generating acceptance criteria with Claude:', error);
    throw error;
  }
}
