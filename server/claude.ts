import Anthropic from '@anthropic-ai/sdk';
import { AcceptanceCriterion, GherkinStructure } from '../shared/types';
import { ImplementationTask } from '../shared/schema';

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
    
    // Create a Claude-specific prompt for requirement generation
    const prompt = `
    You are a business analyst with expertise in software migration projects. Analyze the provided content and extract clear, detailed requirements for implementing the described functionality in a target system.

    Project: ${projectName}
    Content Type: ${contentType}
    File: ${fileName}

    Content to analyze:
    ${context}

    Extract at least ${minRequirements} requirements from this content. For each requirement:
    1. Provide a concise title (3-10 words) that summarizes the requirement
    2. Provide a detailed, specific description of at least 150 words that thoroughly explains what needs to be implemented
    3. Classify it into one of these categories: 'functional', 'non-functional', 'security', 'performance'
    4. Assign a priority level: 'high', 'medium', or 'low'

    Format your response as a JSON array of requirements, each with the properties 'title', 'description', 'category', and 'priority'.
    
    Example:
    [
      {
        "title": "Customer Data Migration",
        "description": "The system must implement a comprehensive customer data migration process that preserves all customer information... [detailed 150+ word description]",
        "category": "functional",
        "priority": "high"
      }
    ]
    `;

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

    // Create a prompt for generating Salesforce-specific implementation tasks
    const prompt = `
      You are an AI assistant tasked with generating detailed implementation tasks for a software migration project. Your responses should be grounded in the provided documentation of the Target System.

      **Please use the following information to generate one implementation task:**

      **Project Description:** ${projectDescription || `Migration from ${sourceSystem} to ${targetSystem}`}

      **Target System:** ${targetSystem}

      **Requirement Description:** ${requirementText}

      **Acceptance Criteria:**
      ${formattedCriteria}

      **Based on the above information and your understanding of the Target System, generate a single implementation task with the following structure, returned as a structured JSON object:**

      {
        "title": "[A concise and descriptive title for the task]",
        "description": "[A detailed overview of what the task entails, at least 50 words]",
        "status": "pending",
        "priority": "[high, medium, or low - derive from the requirement priority]",
        "system": "[source, target, or both - what system is this task for]",
        "requirementId": ${requirementId},
        "estimatedHours": [reasonable hour estimate for the task],
        "complexity": "[low, medium, or high]",
        "taskType": "[data-mapping, workflow, ui, integration, security, testing, etc.]",
        "implementationSteps": [
          {
            "stepNumber": 1,
            "stepDescription": "[A specific, actionable step grounded in the Target System's documentation. Include a reference to the relevant documentation within the description if possible.]"
          },
          {
            "stepNumber": 2,
            "stepDescription": "[Another specific, actionable step grounded in the Target System's documentation. Include a reference to the relevant documentation within the description if possible.]"
          }
          // ... more steps as needed
        ],
        "relevantDocuments": [
          {
            "documentTitle": "[Title of the relevant document]",
            "link": "[Link to the document or descriptive reference]"
          },
          {
            "documentTitle": "[Title of another relevant document]",
            "link": "[Link to the document or descriptive reference]"
          }
          // ... more relevant documents as needed
        ],
        "sfDocumentationLinks": [
          {
            "title": "[Documentation Title]",
            "url": "[Documentation URL]"
          }
        ],
        "overallDocumentationLinks": ["[Link 1]", "[Link 2]"]
      }
      
      Only output valid JSON with no additional text or explanations. Focus on creating a single high-quality, detailed task rather than multiple tasks.
    `;

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
    
    // Create a prompt for Claude to generate acceptance criteria
    const prompt = `
    You are a business analyst with expertise in software development projects. Your task is to create comprehensive acceptance criteria in Gherkin format for the following requirement.

    Project Name: ${projectName}
    Project Description: ${projectDescription}
    
    Requirement: ${requirementText}

    Generate 5-8 acceptance criteria in Gherkin format for this requirement. Each criterion should:
    
    1. Start with "Scenario:" followed by a brief title
    2. Follow the Given-When-Then format:
      - Given: the initial context
      - When: the action being taken
      - Then: the expected outcome
      - (And: additional conditions or outcomes where appropriate)
    3. Be specific, measurable, and testable
    4. Cover different aspects of the requirement
    5. Be realistic and implementable

    Format your response as a JSON array of acceptance criteria, each with an "id" (UUID), "description" (the full Gherkin scenario), "status" (always "pending"), "notes" (empty string), and "gherkin" object with structured components.

    Example:
    [
      {
        "id": "a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6",
        "description": "Scenario: Successful data migration\\nGiven the source system contains customer data\\nWhen the migration process is executed\\nThen all customer records should be transferred to the target system\\nAnd data integrity should be maintained",
        "status": "pending",
        "notes": "",
        "gherkin": {
          "scenario": "Successful data migration",
          "given": "the source system contains customer data",
          "when": "the migration process is executed",
          "and": [],
          "then": "all customer records should be transferred to the target system",
          "andThen": ["data integrity should be maintained"]
        }
      }
    ]
    `;

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
