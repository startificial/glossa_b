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

    // Strong system prompt that forces JSON output
    const systemPrompt = `You are a Salesforce technical architect specialized in implementing complex migration projects and integrations.
Your task is to create detailed implementation tasks for Salesforce development.
You must respond ONLY with valid JSON formatted as an array of implementation task objects.

The JSON array must follow this exact structure, with 2-3 tasks maximum:
[
  {
    "title": "Task title - keep this concise",
    "description": "Detailed task description with specific technical details",
    "system": "${targetSystem}",
    "taskType": "development|configuration|integration|testing",
    "complexity": "simple|moderate|complex",
    "estimatedHours": number,
    "priority": "high|medium|low",
    "implementationSteps": [
      {
        "stepNumber": 1,
        "stepDescription": "Detailed explanation with minimum 35 words that includes specific technical details like field mappings, configuration settings, or code examples as appropriate",
        "relevantDocumentationLinks": ["URL1", "URL2"]
      },
      {
        "stepNumber": 2,
        "stepDescription": "Detailed explanation with minimum 35 words that includes specific technical details",
        "relevantDocumentationLinks": ["URL1", "URL2"]
      }
    ],
    "sfDocumentationLinks": [],
    "overallDocumentationLinks": []
  }
]

For each implementation step:
1. Each stepDescription must include specific technical instructions (minimum 35 words)
2. Include exact field definitions, API parameters, component names, or configuration values
3. Provide concrete, actionable guidance a developer can follow without additional context

DO NOT include any text, explanations, markdown formatting, or non-JSON content in your response.
Your response must begin with "[" and end with "]" and be valid parseable JSON.`;

    console.log('Calling Claude API with enhanced JSON system prompt...');

    // Generate content using Claude with improved system prompt
    const message = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219', // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
      max_tokens: 4000,
      temperature: 0.2, // Lower temperature for more predictable, structured output
      system: systemPrompt,
      messages: [
        { role: 'user', content: prompt }
      ]
    });

    // Extract the response text
    let responseText = '';
    if (message.content && message.content.length > 0) {
      const content = message.content[0];
      if (typeof content === 'object' && 'text' in content) {
        responseText = content.text as string;
      } else {
        responseText = JSON.stringify(content);
      }
    }

    // Clean any potential markdown or unnecessary text from the response
    const cleanedResponse = responseText
      .replace(/^```json\s*/gm, '') // Remove ```json at the start
      .replace(/^```\s*/gm, '')     // Remove ``` at the start
      .replace(/\s*```$/gm, '')     // Remove ``` at the end
      .replace(/^\s*```$/gm, '');   // Remove standalone ```

    console.log('Claude response (first 200 chars):', cleanedResponse.substring(0, 200));

    // Function to validate and process implementation tasks
    const processImplementationTasks = (tasksArray: any[]): any[] => {
      return tasksArray.map(task => {
        // Ensure implementationSteps exists and is an array
        if (!task.implementationSteps) {
          task.implementationSteps = [];
        }
        
        // Process each implementation step
        if (Array.isArray(task.implementationSteps)) {
          task.implementationSteps = task.implementationSteps.map((step: any, index: number) => {
            return {
              stepNumber: step.stepNumber || index + 1,
              stepDescription: step.stepDescription || 'No step description provided',
              relevantDocumentationLinks: Array.isArray(step.relevantDocumentationLinks) 
                ? step.relevantDocumentationLinks 
                : []
            };
          });
        }
        
        // Ensure documentation links are present
        if (!task.sfDocumentationLinks) {
          task.sfDocumentationLinks = [];
        }
        
        if (!task.overallDocumentationLinks) {
          task.overallDocumentationLinks = [];
        }
        
        return task;
      });
    };

    // First attempt: try direct JSON parsing of the cleaned response
    try {
      const parsedTasks = JSON.parse(cleanedResponse);
      if (Array.isArray(parsedTasks) && parsedTasks.length > 0) {
        console.log(`Successfully parsed ${parsedTasks.length} implementation tasks`);
        return processImplementationTasks(parsedTasks);
      }
    } catch (error) {
      console.log('Direct JSON parsing failed:', error.message);
    }

    // Second attempt: try to extract just the JSON array part
    try {
      const jsonMatch = cleanedResponse.match(/\[\s*{[\s\S]*}\s*\]/);
      if (jsonMatch) {
        const jsonText = jsonMatch[0];
        const parsedTasks = JSON.parse(jsonText);
        console.log(`Extracted JSON array with ${parsedTasks.length} implementation tasks`);
        return processImplementationTasks(parsedTasks);
      }
    } catch (error) {
      console.log('JSON array extraction failed:', error.message);
    }

    // Fallback: provide a simple default task if all parsing attempts fail
    console.log('All parsing attempts failed, creating fallback task');
    return [{
      title: `Implement ${requirementText.substring(0, 40)}...`,
      description: requirementText,
      system: targetSystem,
      taskType: "development",
      complexity: "moderate",
      estimatedHours: 4,
      priority: "medium",
      implementationSteps: [
        {
          stepNumber: 1,
          stepDescription: `Analyze the requirement details carefully to understand: ${requirementText.substring(0, 100)}... Create a design document outlining the approach for implementation in ${targetSystem} including any objects and fields needed.`,
          relevantDocumentationLinks: []
        },
        {
          stepNumber: 2,
          stepDescription: `Implement the core components needed to satisfy this requirement in ${targetSystem}. Create or customize objects, fields, validation rules, workflows, and processes as appropriate. Ensure all components are properly configured.`,
          relevantDocumentationLinks: []
        },
        {
          stepNumber: 3,
          stepDescription: `Thoroughly test the implementation against the acceptance criteria. Create test cases covering various scenarios, validate data integrity, and ensure the solution works as expected. Make any necessary adjustments.`,
          relevantDocumentationLinks: []
        }
      ],
      sfDocumentationLinks: [],
      overallDocumentationLinks: []
    }];
  } catch (error) {
    console.error('Error generating implementation tasks:', error);
    return [];
  }
}

/**
 * Generate acceptance criteria for a requirement using Claude
 * @param requirementText The requirement text to analyze
 * @returns Promise resolving to an array of acceptance criteria with descriptions
 */
export async function generateAcceptanceCriteria(
  requirementText: string, 
  projectName: string = "Software Migration Project",
  projectDescription: string = "Migration project to modernize legacy systems"
): Promise<AcceptanceCriterion[]> {
  try {
    if (!apiKey) {
      console.error('Missing ANTHROPIC_API_KEY environment variable');
      throw new Error('Claude API key is not configured. Please set the ANTHROPIC_API_KEY environment variable.');
    }
    
    console.log(`Generating acceptance criteria for requirement: ${requirementText.substring(0, 100)}...`);
    
    // Create a prompt for generating acceptance criteria using template
    let prompt = ACCEPTANCE_CRITERIA_PROMPT
      .replace('{requirementText}', requirementText)
      .replace('{projectName}', projectName)
      .replace('{projectDescription}', projectDescription);
    
    // Call Claude API to generate acceptance criteria with improved system prompt
    const message = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219', // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
      max_tokens: 3000,
      temperature: 0.5, // Lower temperature for more focused, relevant responses
      system: `You are a business analyst specializing in writing clear, specific acceptance criteria.
Your task is to analyze a given requirement in the context of its project and create acceptance criteria that directly verify its implementation.

IMPORTANT INSTRUCTIONS:
1. Each acceptance criterion MUST be directly related to the specific requirement provided.
2. Do NOT generate generic criteria that could apply to any software system.
3. Focus on the actual functionality described in the requirement text.
4. Use Gherkin format (Given/When/Then) that is specific and testable.
5. Include specific details from the requirement in your criteria.
6. Do NOT add features or requirements that are not mentioned or strongly implied.
7. Include both happy path and error/edge cases that are relevant to the specific requirement.

Return your response as a valid JSON array where each item has a 'title', 'description', and 'type' field.`,
      messages: [
        { role: 'user', content: prompt }
      ]
    });
    
    // Extract and parse the response
    let responseText = '';
    if (message.content && message.content.length > 0) {
      const content = message.content[0];
      if (typeof content === 'object' && 'text' in content) {
        responseText = content.text as string;
      } else {
        responseText = JSON.stringify(content);
      }
    }
    
    try {
      // Clean the response - remove any markdown formatting if present
      const cleanedResponse = responseText
        .replace(/^```json\s*/gm, '') // Remove ```json at the start
        .replace(/^```\s*/gm, '')     // Remove ``` at the start
        .replace(/\s*```$/gm, '')     // Remove ``` at the end
        .replace(/^\s*```$/gm, '');   // Remove standalone ```
      
      // Try to find a JSON array in the response
      const jsonMatch = cleanedResponse.match(/\[\s*{[\s\S]*}\s*\]/);
      if (jsonMatch) {
        const jsonText = jsonMatch[0];
        const acceptanceCriteria = JSON.parse(jsonText);
        console.log(`Generated ${acceptanceCriteria.length} acceptance criteria`);
        
        // Add status field to each criterion
        return acceptanceCriteria.map((criterion: any) => ({
          ...criterion,
          status: 'pending'
        }));
      } else {
        // If no JSON array was found, try parsing the whole response
        const acceptanceCriteria = JSON.parse(cleanedResponse);
        console.log(`Generated ${acceptanceCriteria.length} acceptance criteria`);
        
        // Add status field to each criterion
        return acceptanceCriteria.map((criterion: any) => ({
          ...criterion,
          status: 'pending'
        }));
      }
    } catch (parseError) {
      console.error('Error parsing Claude response for acceptance criteria:', parseError);
      // Return a single default acceptance criterion
      return [{
        description: `The system should implement the requirement: ${requirementText.substring(0, 100)}...`,
        status: 'pending'
      }];
    }
  } catch (error) {
    console.error('Error generating acceptance criteria with Claude:', error);
    return [{
      description: `The system should implement the requirement: ${requirementText.substring(0, 100)}...`,
      status: 'pending'
    }];
  }
}

/**
 * Generate a workflow diagram using Claude's understanding of requirements
 * @param requirementTexts Array of requirement texts to analyze
 * @param projectName Name of the project for context
 * @returns Promise resolving to a mermaid diagram string
 */
export async function generateWorkflowDiagram(requirementTexts: string[], projectName: string): Promise<string> {
  try {
    if (!apiKey) {
      console.error('Missing ANTHROPIC_API_KEY environment variable');
      throw new Error('Claude API key is not configured. Please set the ANTHROPIC_API_KEY environment variable.');
    }
    
    console.log(`Generating workflow diagram for ${requirementTexts.length} requirements...`);
    
    // Combine the requirements texts
    const combinedRequirements = requirementTexts.join('\n\n');
    
    // Create a prompt
    const prompt = `
    Project: ${projectName}
    
    Requirements:
    ${combinedRequirements}
    
    Based on these requirements, create a workflow diagram that shows the key processes, entities, and their relationships. 
    Use Mermaid.js flowchart syntax (https://mermaid.js.org/syntax/flowchart.html).
    
    The diagram should:
    1. Be comprehensive and cover all major processes described in the requirements
    2. Show the flow and relationships between different entities and steps
    3. Use clear, concise labels
    4. Include all important decision points and conditional flows
    5. Be properly formatted in Mermaid.js syntax
    
    Return ONLY the Mermaid diagram code without any explanations.
    `;
    
    // Call Claude API to generate workflow diagram
    const message = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219', // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
      max_tokens: 2000,
      temperature: 0.5,
      system: CLAUDE_SYSTEM_PROMPT_WORKFLOW,
      messages: [
        { role: 'user', content: prompt }
      ]
    });
    
    // Extract the response
    let diagramText = '';
    if (message.content && message.content.length > 0) {
      const content = message.content[0];
      if (typeof content === 'object' && 'text' in content) {
        diagramText = content.text as string;
      } else {
        diagramText = String(content);
      }
    }
    
    // Extract just the mermaid diagram part (between ```mermaid and ```)
    const mermaidMatch = diagramText.match(/```(?:mermaid)?\s*([\s\S]*?)\s*```/);
    if (mermaidMatch && mermaidMatch[1]) {
      return mermaidMatch[1].trim();
    }
    
    // If no mermaid block was found, return the whole response
    return diagramText.trim();
  } catch (error) {
    console.error('Error generating workflow diagram with Claude:', error);
    return `graph TD
      A[Error] -->|Failed to generate diagram| B[Please try again]
      
      style A fill:#f55,stroke:#333,stroke-width:2px
      style B fill:#ddd,stroke:#333,stroke-width:1px`;
  }
}

/**
 * Generate Gherkin test scenarios for a requirement using Claude
 * @param requirementText The requirement text to analyze
 * @param acceptanceCriteria Array of acceptance criteria for this requirement
 * @returns Promise resolving to a Gherkin structure
 */
export async function generateGherkinScenarios(
  requirementText: string,
  acceptanceCriteria: AcceptanceCriterion[]
): Promise<GherkinStructure> {
  try {
    if (!apiKey) {
      console.error('Missing ANTHROPIC_API_KEY environment variable');
      throw new Error('Claude API key is not configured. Please set the ANTHROPIC_API_KEY environment variable.');
    }
    
    console.log(`Generating Gherkin scenarios for requirement: ${requirementText.substring(0, 100)}...`);
    
    // Format acceptance criteria for the prompt
    const formattedCriteria = acceptanceCriteria.map((ac, index) => {
      return `Acceptance Criterion ${index + 1}: ${ac.description}`;
    }).join('\n\n');
    
    // Create a prompt
    const prompt = `
    Requirement: ${requirementText}
    
    Acceptance Criteria:
    ${formattedCriteria}
    
    Based on this requirement and its acceptance criteria, create a Gherkin feature file with scenarios that thoroughly test this requirement.
    Include a feature description, background (if needed), and multiple scenarios.
    
    Ensure the Gherkin scenarios:
    1. Cover all acceptance criteria
    2. Include specific, testable steps (Given, When, Then)
    3. Use realistic test data and expected outcomes
    4. Consider both happy path and failure scenarios
    
    Format your response as a valid Gherkin feature file.
    `;
    
    // Call Claude API to generate Gherkin scenarios
    const message = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219', // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
      max_tokens: 3000,
      temperature: 0.7,
      system: `You are a software test engineer specializing in writing comprehensive Gherkin test scenarios.
Return ONLY the Gherkin feature code without any explanations or commentary.`,
      messages: [
        { role: 'user', content: prompt }
      ]
    });
    
    // Extract the response
    let gherkinText = '';
    if (message.content && message.content.length > 0) {
      const content = message.content[0];
      if (typeof content === 'object' && 'text' in content) {
        gherkinText = content.text as string;
      } else {
        gherkinText = String(content);
      }
    }
    
    // Clean up the response - remove any code blocks
    gherkinText = gherkinText
      .replace(/^```gherkin\s*/gm, '')
      .replace(/^```\s*/gm, '')
      .replace(/\s*```$/gm, '')
      .replace(/^\s*```$/gm, '')
      .trim();
    
    // Parse the Gherkin text to extract feature, background, and scenarios
    let featureMatch = gherkinText.match(/Feature:([^\n]+)/);
    let featureTitle = featureMatch ? featureMatch[1].trim() : 'Generated Feature';
    
    let featureDescriptionMatch = gherkinText.match(/Feature:[^\n]+\n((?:(?!Background:|Scenario:|Scenario Outline:).|\n)*)/);
    let featureDescription = featureDescriptionMatch ? featureDescriptionMatch[1].trim() : '';
    
    let backgroundMatch = gherkinText.match(/Background:((?:.|\n)*?)(?=Scenario:|Scenario Outline:|$)/);
    let background = backgroundMatch ? backgroundMatch[1].trim() : '';
    
    let scenariosMatches = [...gherkinText.matchAll(/(?:Scenario:|Scenario Outline:)([^\n]+)\n((?:.|\n)*?)(?=Scenario:|Scenario Outline:|$)/g)];
    let scenarios = scenariosMatches.map(match => ({
      title: match[1].trim(),
      steps: match[2].trim()
    }));
    
    return {
      title: featureTitle,
      description: featureDescription,
      background: background,
      scenarios: scenarios
    };
  } catch (error) {
    console.error('Error generating Gherkin scenarios with Claude:', error);
    return {
      title: 'Error Generating Scenarios',
      description: 'There was an error generating Gherkin scenarios for this requirement.',
      background: '',
      scenarios: [{
        title: 'Fallback Scenario',
        steps: `Given the requirement "${requirementText.substring(0, 100)}..."
When the system is implemented according to specifications
Then all acceptance criteria should be satisfied`
      }]
    };
  }
}