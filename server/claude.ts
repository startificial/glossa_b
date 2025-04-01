import Anthropic from '@anthropic-ai/sdk';
// Define local interface to avoid import issues
interface AcceptanceCriterion {
  id: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
}

// Initialize the Claude API with the API key
const apiKey = process.env.ANTHROPIC_API_KEY || '';
const anthropic = new Anthropic({
  apiKey
});

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

      Your task is to create 3-5 comprehensive acceptance criteria for this requirement using the Gherkin format, specifically in tabular structure with Scenario, Given, When, And, Then components.

      Each acceptance criterion should:
      1. Have a clear Scenario title that summarizes the specific test case
      2. Include proper Given, When, Then (and And where appropriate) statements
      3. Be specific, measurable, and testable
      4. Cover both happy path and edge cases
      5. Be relevant to the specific requirement

      Please format your response as a JSON array of acceptance criteria, where each criterion has:
      1. 'id' (string): A unique identifier (UUID)
      2. 'description' (string): The Gherkin-formatted acceptance criterion in tabular format
      3. 'status' (string): Always set to 'pending'
      4. 'notes' (string): Always set to an empty string

      The description should follow this exact structure:
      """
      Scenario: [Title of the scenario]
      Given [Precondition]
      When [Action]
      [And [Additional Action]] (optional)
      Then [Expected Result]
      [And [Additional Expected Result]] (optional)
      """

      Example format:
      [
        {
          "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
          "description": "Scenario: Successful user login with valid credentials\\nGiven a user has a registered account\\nWhen the user enters valid email and password\\nAnd clicks the login button\\nThen the user should be redirected to the dashboard\\nAnd a welcome message should be displayed",
          "status": "pending",
          "notes": ""
        },
        {
          "id": "d8c10b57-5fd9-42c1-a6d1-ce02b2c3a482",
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