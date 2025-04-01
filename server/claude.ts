import Anthropic from '@anthropic-ai/sdk';
import { AcceptanceCriterion, GherkinStructure } from '../shared/types';
import { ImplementationTask } from '../shared/schema';

// Initialize the Claude API with the API key
const apiKey = process.env.ANTHROPIC_API_KEY || '';
const anthropic = new Anthropic({
  apiKey
});

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

    // Create a prompt for generating Salesforce-specific implementation tasks
    const prompt = `
      You are a certified Salesforce technical architect, developer, and consultant specialized in migration projects and complex implementations.
      
      Project Name: ${projectName}
      Project Description: ${projectDescription}
      Source System: ${sourceSystem}
      Target System: ${targetSystem}
      
      Requirement: ${requirementText}
      
      Acceptance Criteria:
      ${formattedCriteria}
      
      Your task is to create detailed implementation tasks for this requirement. Generate at least one implementation task for EACH acceptance criterion, but create as many tasks as necessary to fully implement the requirement. Each task must be specifically focused on Salesforce implementation.
      
      For each task:
      1. Consider both source system analysis tasks and Salesforce target implementation tasks
      2. Include specific Salesforce features, objects, and components relevant to the implementation
      3. Reference appropriate Salesforce documentation URLs wherever possible
      4. Include specific technical details about HOW to implement in Salesforce
      5. Accurately estimate complexity (low, medium, high) and development hours
      6. Task descriptions should be at least 50 words and include comprehensive implementation details
      7. Classify each task into a specific type (data-mapping, workflow, ui, integration, security, etc.)
      
      Format your response as a JSON array of implementation tasks, where each task has:
      - title: Brief, clear task title
      - description: Detailed and extensive description (minimum 50 words) including technical Salesforce implementation details
      - status: Always "pending"
      - priority: Derive from the requirement priority (high, medium, low)
      - system: Either "source" or "target" (Salesforce would be "target")
      - requirementId: ${requirementId}
      - estimatedHours: Reasonable hour estimate for the task (number)
      - complexity: "low", "medium", or "high"
      - taskType: A specific categorization (data-mapping, workflow, ui, integration, security, testing, etc.)
      - sfDocumentation: Array of documentation reference objects with title and url
      
      Example format:
      [
        {
          "title": "Create Custom Object for Product Catalog in Salesforce",
          "description": "Design and implement a custom object in Salesforce to store product catalog data migrated from ManufacturePro. The custom object should incorporate all necessary fields including product code (text), name (text), description (long text area), category (picklist), pricing tiers (multi-picklist), and inventory status (picklist). Ensure proper field-level security configuration to restrict access based on user profiles. Develop comprehensive page layouts tailored to different user roles, with sales representatives seeing pricing and availability while product managers have access to detailed inventory metrics. Implement field history tracking on critical fields like price and inventory status. Establish proper object relationships with other entities such as Opportunities and Orders using lookup and master-detail relationships.",
          "status": "pending",
          "priority": "high",
          "system": "target",
          "requirementId": ${requirementId},
          "estimatedHours": 5,
          "complexity": "medium",
          "taskType": "data-modeling",
          "sfDocumentation": [
            {
              "title": "Custom Object Creation in Salesforce",
              "url": "https://help.salesforce.com/s/articleView?id=sf.dev_objectcreation.htm"
            },
            {
              "title": "Field Types Reference",
              "url": "https://help.salesforce.com/s/articleView?id=sf.custom_field_types.htm"
            }
          ]
        }
      ]
      
      Only output valid JSON with no additional text or explanations.
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
    
    try {
      // Extract just the JSON part from the response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const jsonText = jsonMatch[0];
        const implementationTasks = JSON.parse(jsonText);
        console.log(`Generated ${implementationTasks.length} implementation tasks`);
        return implementationTasks;
      } else {
        // If no JSON array was found, try parsing the whole response
        const implementationTasks = JSON.parse(responseText);
        console.log(`Generated ${implementationTasks.length} implementation tasks`);
        return implementationTasks;
      }
    } catch (parseError) {
      console.error('Error parsing Claude response:', parseError);
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

    console.log(`Generating acceptance criteria for requirement: ${requirementText.substring(0, 100)}...`);

    // Create a prompt for generating acceptance criteria
    const prompt = `
      You are an expert software engineer and business analyst specializing in creating high-quality acceptance criteria in Gherkin format for software requirements.

      Project Name: ${projectName}
      Project Description: ${projectDescription}
      Requirement: ${requirementText}

      Your task is to create 3-5 comprehensive acceptance criteria for this requirement using the Gherkin format with properly structured Scenario, Given, When, And, Then components.

      Each acceptance criterion should:
      1. Have a clear Scenario title that summarizes the specific test case
      2. Include proper Given, When, Then (and And where appropriate) statements
      3. Be specific, measurable, and testable
      4. Cover both happy path and edge cases
      5. Be relevant to the specific requirement

      Please format your response as a JSON array of acceptance criteria, where each criterion has:
      1. 'id' (string): A unique identifier (UUID)
      2. 'gherkin': An object containing the structured Gherkin components:
         - 'scenario' (string): The title of the scenario
         - 'given' (string): The precondition
         - 'when' (string): The action
         - 'and' (array of strings): Additional actions or conditions (can be empty)
         - 'then' (string): The expected result
         - 'andThen' (array of strings): Additional expected results (can be empty)
      3. 'description' (string): The full Gherkin-formatted acceptance criterion as text
      4. 'status' (string): Always set to 'pending'
      5. 'notes' (string): Always set to an empty string

      Example format:
      [
        {
          "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
          "gherkin": {
            "scenario": "Successful user login with valid credentials",
            "given": "a user has a registered account",
            "when": "the user enters valid email and password",
            "and": ["clicks the login button"],
            "then": "the user should be redirected to the dashboard",
            "andThen": ["a welcome message should be displayed"]
          },
          "description": "Scenario: Successful user login with valid credentials\\nGiven a user has a registered account\\nWhen the user enters valid email and password\\nAnd clicks the login button\\nThen the user should be redirected to the dashboard\\nAnd a welcome message should be displayed",
          "status": "pending",
          "notes": ""
        },
        {
          "id": "d8c10b57-5fd9-42c1-a6d1-ce02b2c3a482",
          "gherkin": {
            "scenario": "Failed login attempt with invalid credentials",
            "given": "a user has a registered account",
            "when": "the user enters an incorrect password",
            "and": [],
            "then": "an error message should be displayed",
            "andThen": ["the user should remain on the login page"]
          },
          "description": "Scenario: Failed login attempt with invalid credentials\\nGiven a user has a registered account\\nWhen the user enters an incorrect password\\nThen an error message should be displayed\\nAnd the user should remain on the login page",
          "status": "pending",
          "notes": ""
        }
      ]

      Only output valid JSON with no additional text or explanations.
    `;

    // Generate content using Claude
    const message = await anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 2000,
      temperature: 0.7,
      system: 'You are an expert in software requirements engineering, specializing in creating Gherkin-formatted acceptance criteria.',
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
        // Use type assertion to handle the response safely
        const contentObj = content as any;
        responseText = contentObj.text || JSON.stringify(content);
      } else {
        responseText = String(content);
      }
    }
    
    try {
      // Extract just the JSON part from the response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const jsonText = jsonMatch[0];
        const acceptanceCriteria = JSON.parse(jsonText);
        console.log(`Generated ${acceptanceCriteria.length} acceptance criteria`);
        return acceptanceCriteria;
      } else {
        // If no JSON array was found, try parsing the whole response
        const acceptanceCriteria = JSON.parse(responseText);
        console.log(`Generated ${acceptanceCriteria.length} acceptance criteria`);
        return acceptanceCriteria;
      }
    } catch (parseError) {
      console.error('Error parsing Claude response:', parseError);
      console.error('Raw response:', responseText);
      throw new Error('Failed to parse acceptance criteria from Claude response');
    }
  } catch (error) {
    console.error('Error generating acceptance criteria with Claude:', error);
    throw error;
  }
}