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
 * Generate mock implementation tasks for demo purposes
 * This function creates realistic-looking Salesforce implementation tasks based on requirement text and acceptance criteria
 * @param requirementText The requirement text
 * @param acceptanceCriteria The acceptance criteria for the requirement
 * @param requirementId The requirement ID
 * @param sourceSystem The source system (e.g., Oracle)
 * @param targetSystem The target system (e.g., Salesforce)
 * @returns An array of mock implementation tasks
 */
function getMockImplementationTasks(
  requirementText: string, 
  acceptanceCriteria: AcceptanceCriterion[], 
  requirementId: number,
  sourceSystem: string,
  targetSystem: string
): any[] {
  const isDataMigration = requirementText.toLowerCase().includes('data') && 
                           (requirementText.toLowerCase().includes('migration') || 
                            requirementText.toLowerCase().includes('migrate'));
  
  const isIntegration = requirementText.toLowerCase().includes('integration') || 
                         requirementText.toLowerCase().includes('integrate');
  
  const isAccount = requirementText.toLowerCase().includes('account');
  const isContact = requirementText.toLowerCase().includes('contact');
  const isOpportunity = requirementText.toLowerCase().includes('opportunity');
  
  // Determine priority from requirement text or default to medium
  const priority = requirementText.toLowerCase().includes('high priority') ? 'high' : 
                   requirementText.toLowerCase().includes('low priority') ? 'low' : 'medium';
  
  // Generate appropriate tasks based on context
  let mockTasks = [];
  
  if (isDataMigration && isAccount) {
    // Account data migration tasks
    mockTasks = [
      {
        title: `Analyze ${sourceSystem} Account Object Schema`,
        description: `Conduct a comprehensive analysis of the Account object schema in ${sourceSystem}. Document all fields, data types, and relationships. Identify required fields, lookup relationships, and any custom fields that need to be migrated. Create a complete field inventory spreadsheet documenting field names, API names, data types, length restrictions, and business purpose. This analysis will serve as the foundation for the field mapping design document and migration strategy.`,
        status: "pending",
        priority: priority,
        system: "source",
        requirementId: requirementId,
        estimatedHours: 8,
        complexity: "medium",
        taskType: "analysis",
        sfDocumentation: []
      },
      {
        title: `Create Field Mapping Document for Account Migration`,
        description: `Develop a comprehensive field mapping document that maps each ${sourceSystem} Account field to its corresponding Salesforce Account field. Include source field name, target field name, data type transformations, default values for unmapped fields, and any data cleansing rules. For custom fields in ${sourceSystem} that don't have standard equivalents in Salesforce, document the custom field creation requirements. This document will serve as the blueprint for the migration development and validation.`,
        status: "pending",
        priority: priority,
        system: "both",
        requirementId: requirementId,
        estimatedHours: 12,
        complexity: "medium",
        taskType: "data-mapping",
        sfDocumentation: [
          {
            title: "Salesforce Account Object Reference",
            url: "https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_account.htm"
          }
        ]
      },
      {
        title: "Create Custom Fields for Account Object in Salesforce",
        description: `Set up custom fields in the Salesforce Account object to accommodate ${sourceSystem}-specific data that doesn't map to standard Salesforce fields. Create field labels, API names, and help text that align with business terminology. Configure appropriate field types (text, picklist, formula, etc.) and set field-level security to ensure proper data access control. Include any necessary validation rules to maintain data integrity. Update page layouts to include the new custom fields in appropriate sections.`,
        status: "pending",
        priority: priority,
        system: "target",
        requirementId: requirementId,
        estimatedHours: 6,
        complexity: "medium",
        taskType: "data-modeling",
        sfDocumentation: [
          {
            title: "Creating Custom Fields in Salesforce",
            url: "https://help.salesforce.com/s/articleView?id=sf.adding_fields.htm"
          },
          {
            title: "Field-Level Security in Salesforce",
            url: "https://help.salesforce.com/s/articleView?id=sf.admin_fls.htm"
          }
        ]
      },
      {
        title: "Develop Account Data Extraction Script from Oracle",
        description: `Create an extraction script to pull Account data from ${sourceSystem} in a format suitable for Salesforce import. The script should include filters to select relevant accounts based on business criteria (active accounts, accounts created after a specific date, etc.). Implement error handling and logging mechanisms to track any issues during extraction. The script should output data in CSV format with encoding that preserves special characters. Include data cleaning routines to address known data quality issues.`,
        status: "pending",
        priority: priority,
        system: "source",
        requirementId: requirementId,
        estimatedHours: 16,
        complexity: "high",
        taskType: "integration",
        sfDocumentation: []
      },
      {
        title: "Build Salesforce Data Loader Configuration for Account Import",
        description: `Configure Salesforce Data Loader for Account data import from ${sourceSystem}. Create mapping files based on the field mapping document. Set up appropriate processing options including batch size, error handling, and duplicate management rules. Configure success and error logs to capture import results. Create command-line scripts for automated execution. Test the configuration with a small subset of data before full implementation.`,
        status: "pending",
        priority: priority,
        system: "target",
        requirementId: requirementId,
        estimatedHours: 8,
        complexity: "medium",
        taskType: "data-migration",
        sfDocumentation: [
          {
            title: "Salesforce Data Loader Guide",
            url: "https://help.salesforce.com/s/articleView?id=sf.data_loader.htm"
          },
          {
            title: "Best Practices for Importing Data",
            url: "https://help.salesforce.com/s/articleView?id=sf.data_import_best_practices.htm"
          }
        ]
      }
    ];
  } else if (isIntegration) {
    // Integration tasks
    mockTasks = [
      {
        title: `Design Integration Architecture between ${sourceSystem} and ${targetSystem}`,
        description: `Create a comprehensive integration architecture document outlining the connectivity between ${sourceSystem} and ${targetSystem}. Define integration patterns (real-time vs batch), API selection (REST, SOAP, bulk APIs), authentication mechanisms, error handling, and retry policies. Include data flow diagrams showing the direction and volume of data exchange between systems. Document security considerations including encryption requirements, IP restrictions, and credential management. This blueprint will guide all integration development activities.`,
        status: "pending",
        priority: priority,
        system: "both",
        requirementId: requirementId,
        estimatedHours: 16,
        complexity: "high",
        taskType: "architecture",
        sfDocumentation: [
          {
            title: "Salesforce Integration Patterns",
            url: "https://developer.salesforce.com/docs/atlas.en-us.integration_patterns_and_practices.meta/integration_patterns_and_practices/integ_pat_intro_patterns.htm"
          }
        ]
      },
      {
        title: `Create Connected App in Salesforce for ${sourceSystem} Integration`,
        description: `Configure a Connected App in Salesforce to enable secure API access from ${sourceSystem}. Set up OAuth 2.0 authentication with appropriate scopes based on integration requirements. Configure callback URLs, IP relaxation settings, and refresh token policies. Generate and securely store consumer key and secret. Set up appropriate user permissions and profiles to ensure the integration user has access to required objects and fields but follows the principle of least privilege.`,
        status: "pending",
        priority: priority,
        system: "target",
        requirementId: requirementId,
        estimatedHours: 4,
        complexity: "medium",
        taskType: "security",
        sfDocumentation: [
          {
            title: "Create a Connected App in Salesforce",
            url: "https://help.salesforce.com/s/articleView?id=sf.connected_app_create.htm"
          },
          {
            title: "OAuth Authorization Flows",
            url: "https://help.salesforce.com/s/articleView?id=sf.remoteaccess_oauth_flows.htm"
          }
        ]
      },
      {
        title: `Develop Integration Middleware for ${sourceSystem} to Salesforce Data Sync`,
        description: `Build a middleware component to orchestrate data synchronization between ${sourceSystem} and Salesforce. Implement both scheduled batch processes and real-time event-based triggers as appropriate. Create robust error handling with automatic retry logic and detailed logging. Develop data transformation routines to convert between different data formats and structures. Implement transaction management to ensure data consistency across systems. Build monitoring dashboards to track integration health and performance metrics.`,
        status: "pending",
        priority: priority,
        system: "both",
        requirementId: requirementId,
        estimatedHours: 40,
        complexity: "high",
        taskType: "integration",
        sfDocumentation: [
          {
            title: "Salesforce API Reference",
            url: "https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/intro_what_is_rest_api.htm"
          }
        ]
      }
    ];
  } else if (isContact) {
    // Contact-specific tasks
    mockTasks = [
      {
        title: "Configure Contact Field Mapping for Salesforce Migration",
        description: `Create a detailed field mapping document for migrating Contact data from ${sourceSystem} to Salesforce. Map standard fields like First Name, Last Name, Email, and Phone directly. For custom fields, determine appropriate Salesforce equivalents or define new custom fields. Address special cases like contact preferences, communication history, and relationship data. Document data transformation rules for fields requiring format changes or data cleansing.`,
        status: "pending",
        priority: priority,
        system: "both",
        requirementId: requirementId,
        estimatedHours: 8,
        complexity: "medium",
        taskType: "data-mapping",
        sfDocumentation: [
          {
            title: "Contact Object Reference",
            url: "https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_contact.htm"
          }
        ]
      }
    ];
  } else if (isOpportunity) {
    // Opportunity-specific tasks
    mockTasks = [
      {
        title: "Configure Opportunity Field Mapping for Salesforce Migration",
        description: `Create a detailed field mapping document for migrating Opportunity data from ${sourceSystem} to Salesforce. Map standard fields like Opportunity Name, Amount, Close Date, and Stage directly. For custom fields, determine appropriate Salesforce equivalents or define new custom fields. Address special cases like sales process stages, probability calculations, and forecast categories. Document data transformation rules for fields requiring format changes or data cleansing.`,
        status: "pending",
        priority: priority,
        system: "both",
        requirementId: requirementId,
        estimatedHours: 8,
        complexity: "medium",
        taskType: "data-mapping",
        sfDocumentation: [
          {
            title: "Opportunity Object Reference",
            url: "https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_opportunity.htm"
          }
        ]
      }
    ];
  } else {
    // Generic migration tasks
    mockTasks = [
      {
        title: `Design Data Migration Plan for ${sourceSystem} to Salesforce`,
        description: `Develop a comprehensive data migration strategy for transitioning from ${sourceSystem} to Salesforce. Include data prioritization (which objects migrate first), validation criteria, cutover approach, and rollback procedures. Define success metrics and quality gates that must be passed at each stage. Create a detailed timeline with dependencies and resource assignments. Document risk factors and mitigation strategies. This plan will serve as the roadmap for the entire migration project.`,
        status: "pending",
        priority: priority,
        system: "both",
        requirementId: requirementId,
        estimatedHours: 20,
        complexity: "high",
        taskType: "planning",
        sfDocumentation: [
          {
            title: "Salesforce Data Migration Best Practices",
            url: "https://help.salesforce.com/s/articleView?id=sf.data_import_best_practices.htm"
          }
        ]
      }
    ];
  }
  
  // If we have acceptance criteria, try to match tasks to them
  if (acceptanceCriteria && acceptanceCriteria.length > 0) {
    // Add tasks based on acceptance criteria
    acceptanceCriteria.forEach((criterion, index) => {
      if (criterion.description.toLowerCase().includes("missing") || criterion.description.toLowerCase().includes("incomplete")) {
        // Add data validation task
        mockTasks.push({
          title: "Implement Data Validation Rules for Migration",
          description: `Develop data validation rules to handle missing or incomplete data during the migration process. Create pre-migration validation scripts to identify records with data issues before the migration begins. Implement logging mechanisms to track problematic records. Design a process for data remediation, including automated fixes for common issues and workflows for manual review of complex problems. Develop reporting dashboards to monitor validation status and progress.`,
          status: "pending",
          priority: priority,
          system: "both",
          requirementId: requirementId,
          estimatedHours: 16,
          complexity: "medium",
          taskType: "data-quality",
          sfDocumentation: [
            {
              title: "Validation Rules in Salesforce",
              url: "https://help.salesforce.com/s/articleView?id=sf.fields_about_field_validation.htm"
            }
          ]
        });
      }
      
      if (criterion.description.toLowerCase().includes("field mapping")) {
        // Add field mapping task if not already present
        const hasFieldMappingTask = mockTasks.some(task => task.title.toLowerCase().includes("field mapping"));
        if (!hasFieldMappingTask) {
          mockTasks.push({
            title: "Create Comprehensive Field Mapping Documentation",
            description: `Develop detailed field mapping documentation that translates each ${sourceSystem} field to its Salesforce equivalent. For each field, specify the source name, target name, data type transformations, and any business logic needed during conversion. Include mappings for standard and custom fields. Document any default values for new fields in Salesforce that don't exist in the source system. Verify mappings with business stakeholders to ensure they meet functional requirements.`,
            status: "pending",
            priority: priority,
            system: "both",
            requirementId: requirementId,
            estimatedHours: 12,
            complexity: "medium",
            taskType: "documentation",
            sfDocumentation: [
              {
                title: "Standard and Custom Object Basics",
                url: "https://help.salesforce.com/s/articleView?id=sf.customize_objects_understanding_objects.htm"
              }
            ]
          });
        }
      }
    });
  }
  
  // Ensure we have at least 3 tasks
  if (mockTasks.length < 3) {
    mockTasks.push({
      title: "Develop Test Plan for Migration Validation",
      description: `Create a comprehensive test plan to validate the successful migration of data from ${sourceSystem} to Salesforce. Include test cases for data completeness, accuracy, and business functionality. Define criteria for testing data transformations, calculated fields, and relationships between objects. Develop automated test scripts where possible to facilitate regression testing. Include user acceptance testing scenarios to be performed by business stakeholders.`,
      status: "pending",
      priority: priority,
      system: "both",
      requirementId: requirementId,
      estimatedHours: 12,
      complexity: "medium",
      taskType: "testing",
      sfDocumentation: [
        {
          title: "Salesforce Testing Best Practices",
          url: "https://developer.salesforce.com/docs/atlas.en-us.api_testing.meta/api_testing/testing_best_practices.htm"
        }
      ]
    });
  }
  
  return mockTasks;
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

    // Use Claude API to generate the acceptance criteria
    console.log('Generating acceptance criteria with Claude...');
    
    // Create a prompt for generating acceptance criteria
    const prompt = `
      You are an expert software engineer and business analyst specializing in creating high-quality acceptance criteria in Gherkin format for software requirements.

      Project Name: ${projectName}
      Project Description: ${projectDescription}
      Requirement: ${requirementText}

      Your task is to create 10-20 comprehensive acceptance criteria for this requirement using the Gherkin format with properly structured Scenario, Given, When, And, Then components.

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
      max_tokens: 4000, // Increased to handle 10-20 acceptance criteria
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

/**
 * Generate mock acceptance criteria for demo purposes
 * This function creates realistic-looking acceptance criteria based on the requirement text
 * @param requirementText The requirement text to generate criteria for
 * @returns An array of mock acceptance criteria
 */
function getMockAcceptanceCriteria(requirementText: string): AcceptanceCriterion[] {
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };
  
  // Determine context from requirement text
  const isDataMigration = requirementText.toLowerCase().includes('data') && 
                           (requirementText.toLowerCase().includes('migration') || 
                            requirementText.toLowerCase().includes('migrate'));
  
  const isIntegration = requirementText.toLowerCase().includes('integration') || 
                         requirementText.toLowerCase().includes('integrate');
  
  const isAccount = requirementText.toLowerCase().includes('account');
  const isUser = requirementText.toLowerCase().includes('user');
  const isAuthentication = requirementText.toLowerCase().includes('authentication') || 
                            requirementText.toLowerCase().includes('login');
  
  // Generate appropriate acceptance criteria based on context
  let mockCriteria: AcceptanceCriterion[] = [];
  
  if (isDataMigration && isAccount) {
    // Account data migration criteria
    mockCriteria = [
      {
        id: generateUUID(),
        gherkin: {
          scenario: "Successful migration of all account data from Oracle to Salesforce",
          given: "the Oracle system contains account data with complete field information",
          when: "the data migration process is executed",
          and: ["the field mapping configuration is correct"],
          then: "all account records should be created in Salesforce",
          andThen: ["the account count in Salesforce should match the source count in Oracle"]
        },
        description: "Scenario: Successful migration of all account data from Oracle to Salesforce\nGiven the Oracle system contains account data with complete field information\nWhen the data migration process is executed\nAnd the field mapping configuration is correct\nThen all account records should be created in Salesforce\nAnd the account count in Salesforce should match the source count in Oracle",
        status: "pending",
        notes: ""
      },
      {
        id: generateUUID(),
        gherkin: {
          scenario: "Accurate field mapping from Oracle to Salesforce account objects",
          given: "the field mapping configuration is defined",
          when: "an account record is migrated from Oracle to Salesforce",
          and: [],
          then: "all standard fields should be mapped to their Salesforce equivalents",
          andThen: ["custom fields in Oracle should be mapped to custom fields in Salesforce"]
        },
        description: "Scenario: Accurate field mapping from Oracle to Salesforce account objects\nGiven the field mapping configuration is defined\nWhen an account record is migrated from Oracle to Salesforce\nThen all standard fields should be mapped to their Salesforce equivalents\nAnd custom fields in Oracle should be mapped to custom fields in Salesforce",
        status: "pending",
        notes: ""
      },
      {
        id: generateUUID(),
        gherkin: {
          scenario: "Handling of missing or incomplete account data during migration",
          given: "some account records in Oracle have missing or incomplete data",
          when: "the data migration process is executed",
          and: [],
          then: "the system should log all records with data issues",
          andThen: [
            "records with missing required fields should be flagged for review",
            "a detailed migration report should be generated showing success and failure counts"
          ]
        },
        description: "Scenario: Handling of missing or incomplete account data during migration\nGiven some account records in Oracle have missing or incomplete data\nWhen the data migration process is executed\nThen the system should log all records with data issues\nAnd records with missing required fields should be flagged for review\nAnd a detailed migration report should be generated showing success and failure counts",
        status: "pending",
        notes: ""
      }
    ];
  } else if (isIntegration) {
    // Generic integration criteria
    mockCriteria = [
      {
        id: generateUUID(),
        gherkin: {
          scenario: "Successful API connection between source and target systems",
          given: "both systems are online and available",
          when: "the integration process attempts to establish a connection",
          and: ["valid authentication credentials are provided"],
          then: "a successful connection should be established",
          andThen: ["the system should log the successful connection attempt"]
        },
        description: "Scenario: Successful API connection between source and target systems\nGiven both systems are online and available\nWhen the integration process attempts to establish a connection\nAnd valid authentication credentials are provided\nThen a successful connection should be established\nAnd the system should log the successful connection attempt",
        status: "pending",
        notes: ""
      },
      {
        id: generateUUID(),
        gherkin: {
          scenario: "Error handling during integration failures",
          given: "the target system is unavailable",
          when: "the integration process attempts to send data",
          and: [],
          then: "the system should retry the connection up to 3 times",
          andThen: [
            "after 3 failed attempts, the system should send an alert notification",
            "failed transactions should be queued for later processing"
          ]
        },
        description: "Scenario: Error handling during integration failures\nGiven the target system is unavailable\nWhen the integration process attempts to send data\nThen the system should retry the connection up to 3 times\nAnd after 3 failed attempts, the system should send an alert notification\nAnd failed transactions should be queued for later processing",
        status: "pending",
        notes: ""
      }
    ];
  } else if (isAuthentication || isUser) {
    // User/authentication criteria
    mockCriteria = [
      {
        id: generateUUID(),
        gherkin: {
          scenario: "Successful user authentication",
          given: "a user has valid credentials",
          when: "the user attempts to log in",
          and: [],
          then: "the user should be successfully authenticated",
          andThen: ["the user should be granted appropriate system access"]
        },
        description: "Scenario: Successful user authentication\nGiven a user has valid credentials\nWhen the user attempts to log in\nThen the user should be successfully authenticated\nAnd the user should be granted appropriate system access",
        status: "pending",
        notes: ""
      },
      {
        id: generateUUID(),
        gherkin: {
          scenario: "Failed authentication with invalid credentials",
          given: "a user exists in the system",
          when: "the user enters invalid credentials",
          and: [],
          then: "the authentication should fail",
          andThen: [
            "an appropriate error message should be displayed",
            "the failed attempt should be logged"
          ]
        },
        description: "Scenario: Failed authentication with invalid credentials\nGiven a user exists in the system\nWhen the user enters invalid credentials\nThen the authentication should fail\nAnd an appropriate error message should be displayed\nAnd the failed attempt should be logged",
        status: "pending",
        notes: ""
      }
    ];
  } else {
    // Generic/default criteria if context is unclear
    mockCriteria = [
      {
        id: generateUUID(),
        gherkin: {
          scenario: "Successful implementation of core requirement functionality",
          given: "the system is properly configured",
          when: "the feature is accessed by an authorized user",
          and: ["all necessary inputs are provided"],
          then: "the system should process the request correctly",
          andThen: ["the expected output should be produced"]
        },
        description: "Scenario: Successful implementation of core requirement functionality\nGiven the system is properly configured\nWhen the feature is accessed by an authorized user\nAnd all necessary inputs are provided\nThen the system should process the request correctly\nAnd the expected output should be produced",
        status: "pending",
        notes: ""
      },
      {
        id: generateUUID(),
        gherkin: {
          scenario: "Handling edge cases and exceptions",
          given: "the system is operational",
          when: "an edge case scenario is encountered",
          and: [],
          then: "the system should gracefully handle the exception",
          andThen: [
            "appropriate error messages should be displayed",
            "the system state should remain consistent"
          ]
        },
        description: "Scenario: Handling edge cases and exceptions\nGiven the system is operational\nWhen an edge case scenario is encountered\nThen the system should gracefully handle the exception\nAnd appropriate error messages should be displayed\nAnd the system state should remain consistent",
        status: "pending",
        notes: ""
      },
      {
        id: generateUUID(),
        gherkin: {
          scenario: "Performance requirements under load",
          given: "the system is under expected production load",
          when: "multiple concurrent requests are processed",
          and: [],
          then: "all requests should be completed within the specified time limit",
          andThen: ["system resources should remain within acceptable thresholds"]
        },
        description: "Scenario: Performance requirements under load\nGiven the system is under expected production load\nWhen multiple concurrent requests are processed\nThen all requests should be completed within the specified time limit\nAnd system resources should remain within acceptable thresholds",
        status: "pending",
        notes: ""
      }
    ];
  }
  
  return mockCriteria;
}