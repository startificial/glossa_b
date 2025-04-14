/**
 * Workflow Service
 * 
 * Provides services for generating and managing workflow diagrams using LLM integration.
 * This service centralizes workflow-related logic away from the route handlers.
 */

import Anthropic from '@anthropic-ai/sdk';
import { WORKFLOW_DESIGN_PROMPT, CLAUDE_SYSTEM_PROMPT_WORKFLOW } from '../llm_prompts';

// Initialize the Claude API with the API key
const apiKey = process.env.ANTHROPIC_API_KEY || '';
const anthropic = new Anthropic({
  apiKey
});

/**
 * Interface for requirement data needed to generate a workflow
 */
interface RequirementForWorkflow {
  id: number;
  codeId?: string;
  title: string;
  description: string;
  acceptanceCriteria?: Array<{ description: string }>;
}

/**
 * Generate a workflow diagram based on a requirement using Claude AI
 * 
 * @param requirement The requirement data to generate a workflow for
 * @returns Promise resolving to a workflow JSON object with nodes and edges
 */
export async function generateWorkflowDiagram(requirement: RequirementForWorkflow): Promise<any> {
  try {
    if (!apiKey) {
      console.error('Missing ANTHROPIC_API_KEY environment variable');
      throw new Error('Claude API key is not configured. Please set the ANTHROPIC_API_KEY environment variable.');
    }

    console.log(`Generating workflow diagram with Claude for ${requirement.title}...`);

    // Format acceptance criteria for the prompt
    let acceptanceCriteriaText = "No specific acceptance criteria provided.";
    if (requirement.acceptanceCriteria && 
        Array.isArray(requirement.acceptanceCriteria) && 
        requirement.acceptanceCriteria.length > 0) {
      acceptanceCriteriaText = requirement.acceptanceCriteria
        .map((ac, index) => `${index + 1}. ${ac.description}`)
        .join('\n');
    }

    // Prepare the prompt by replacing placeholders with actual values
    let prompt = WORKFLOW_DESIGN_PROMPT
      .replace('{requirementId}', requirement.codeId || requirement.id.toString())
      .replace('{requirementTitle}', requirement.title)
      .replace('{requirementDescription}', requirement.description)
      .replace('{acceptanceCriteria}', acceptanceCriteriaText);

    // Generate content using Claude
    const message = await anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 4000,
      temperature: 0.2,
      system: CLAUDE_SYSTEM_PROMPT_WORKFLOW,
      messages: [
        { role: 'user', content: prompt }
      ]
    });
    
    // Parse the JSON from Claude's response
    if (message.content && message.content.length > 0 && 'text' in message.content[0]) {
      const claudeResponse = message.content[0].text;
      const jsonMatch = claudeResponse.match(/```json\s*({[\s\S]*?})\s*```/) || 
                        claudeResponse.match(/```\s*({[\s\S]*?})\s*```/) ||
                        claudeResponse.match(/{[\s\S]*?}/);
      
      if (jsonMatch && jsonMatch[1]) {
        try {
          const workflowJson = JSON.parse(jsonMatch[1]);
          console.log('Successfully parsed workflow JSON from Claude response');
          return workflowJson;
        } catch (error) {
          console.error('Failed to parse JSON from Claude response:', error);
          throw new Error('Invalid JSON in Claude response');
        }
      } else {
        console.error('No JSON found in Claude response');
        throw new Error('No JSON found in Claude response');
      }
    } else {
      console.error('Invalid Claude response format');
      throw new Error('Invalid Claude response format');
    }
  } catch (error) {
    console.error('Error generating workflow diagram:', error);
    throw error;
  }
}