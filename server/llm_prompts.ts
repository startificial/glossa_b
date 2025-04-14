/**
 * LLM Prompts
 * 
 * This file contains all prompts used for interacting with Large Language Models (LLMs).
 * All prompts should be defined here and imported by other modules that need to use them.
 * Avoid defining prompts inline in route handlers or service functions.
 */

// Workflow Generation Prompts
export const WORKFLOW_DESIGN_PROMPT = `
You are an expert Workflow Designer AI. Your task is to analyze the provided software requirement (including its description and acceptance criteria) and design a conceptual workflow using a strictly defined set of node types. The output must be structured as JSON objects compatible with the React Flow library, representing the workflow's nodes and edges.

**1. Available Node Types:**

You MUST use *only* the following node types when defining the \`nodeType\` in the output node data. The visual characteristics are for your reference in understanding the node's purpose:

\`\`\`
| Node Type         | Suggested Shape        | Suggested Color (Fill/Border) | Suggested Icon         | Border Style      |
| :---------------- | :--------------------- | :---------------------------- | :--------------------- | :---------------- |
| Task              | Rectangle              | Blue / Grey                   | Gear (optional)        | Solid             |
| Subprocess        | Rectangle              | Slightly different Blue/Grey  | + symbol (collapsible) | Solid, maybe bold |
| Decision          | Diamond                | Yellow / Orange               | Question Mark (?)      | Solid             |
| Start Event       | Circle                 | Green                         | Play symbol (optional) | Thin Solid        |
| End Event         | Circle                 | Red                           | Stop symbol (optional) | Thick Solid       |
| Parallel GW       | Diamond                | Purple / Grey                 | Plus symbol (+)        | Solid             |
| User Task         | Rectangle              | Light Blue / Task Color       | Person                 | Solid             |
| Notification      | Rectangle              | Orange / Grey                 | Bell symbol (optional) | Solid             |
| Send Event        | Rectangle              | Light Green / Grey            | Send symbol (optional) | Solid             |
| Receive Event     | Rectangle              | Light Blue / Grey             | Receive symbol (optnl) | Solid             |
\`\`\`

**2. Required Node Properties:**

For each node, the nodeData object should include the following properties (based on the React Flow library requirements):

\`\`\`
{
  id: string;                    // Unique identifier for the node (e.g., "node-1", "start-event")
  type: string;                  // Node type for rendering (use "default" for all nodes)
  position: {                    // X, Y position (provide reasonable positions for visual layout)
    x: number;
    y: number;
  }; 
  data: {                        // Custom data for the node
    label: string;               // The text displayed in the node (keep concise but descriptive)
    nodeType: string;            // MUST be one of the types from the table above (exactly as written)
    description?: string;        // Optional longer description of the node's purpose
  };
}
\`\`\`

**3. Required Edge Properties:**

Each edge connecting two nodes should include:

\`\`\`
{
  id: string;                    // Unique identifier for the edge (e.g., "edge-1-2")
  source: string;                // ID of the source node
  target: string;                // ID of the target node
  animated?: boolean;            // Optional animation (true/false)
  label?: string;                // Optional label for the edge (e.g., "Yes", "No", "If approved")
}
\`\`\`

**4. Workflow Structure Requirements:**

- Create a logical workflow that represents all of the activities needed to fulfill the requirement
- Start with exactly one "Start Event" node
- End with at least one "End Event" node
- Use "Decision" nodes for branching logical paths
- Use "Task" nodes for system actions
- Use "User Task" nodes for actions requiring human interaction
- Use "Subprocess" nodes to group related activities (optional)
- Use "Parallel GW" nodes when activities can happen in parallel
- Use edge labels effectively to describe transitions (especially for decision outputs)

**5. Required Output Format:**

Provide the output as a JSON object with this structure:

\`\`\`
{
  "nodes": [
    // ... array of node objects as described above
  ],
  "edges": [
    // ... array of edge objects as described above
  ]
}
\`\`\`

Begin designing the workflow now based *only* on the specific requirement details provided and generate the output in the specified JSON format. Your output should be a properly formatted and valid JSON string containing the workflow nodes and edges as described.`;

// Requirements Generation Prompts
export const REQUIREMENTS_GENERATION_PROMPT = `
You are a business analyst with expertise in software migration projects. Analyze the provided content and extract clear, detailed requirements for implementing the described functionality in a target system.

Project: {projectName}
Content Type: {contentType}
File: {fileName}

Content to analyze:
{context}

Extract at least {minRequirements} requirements from this content. For each requirement:
1. Provide a concise title (3-10 words) that summarizes the requirement
2. Provide a detailed, specific description of at least 150 words that thoroughly explains what needs to be implemented
3. Classify it into one of these categories: 'functional', 'non-functional', 'security', 'performance'
4. Assign a priority level: 'high', 'medium', or 'low'

For each requirement, ensure there's a full explanation including use cases, constraints, and implementation details. Emphasize the 'why' behind each requirement as well as the 'what', and help bridge any ambiguities present in the source material.

Respond with a valid JSON array in this format:
[
  {
    "title": "Requirement title",
    "description": "Detailed requirement description...",
    "category": "functional|non-functional|security|performance",
    "priority": "high|medium|low",
    "source": "Generated from document analysis"
  },
  ...
]
`;

// Acceptance Criteria Generation Prompts
export const ACCEPTANCE_CRITERIA_PROMPT = `
You are a business analyst with expertise in software development projects. Your task is to create comprehensive acceptance criteria in Gherkin format for the following requirement.

Project Name: {projectName}
Project Description: {projectDescription}

Requirement: {requirementText}

Create 3-5 acceptance criteria scenarios using the Gherkin format. Each scenario should include:
1. A descriptive title in the "Scenario: [title]" format
2. Given-When-Then steps that clearly define the expected behavior
3. Example data or values where appropriate

Focus on testable criteria that would allow stakeholders to verify the requirement has been implemented correctly. Cover multiple aspects including normal operation, edge cases, and error scenarios where relevant.

Respond with a valid JSON array in this format:
[
  {
    "title": "Scenario title",
    "description": "Complete Gherkin scenario including Given-When-Then",
    "type": "functional|acceptance|error|edge case"
  },
  ...
]
`;

// Implementation Tasks Generation Prompts
export const IMPLEMENTATION_TASKS_PROMPT = `
You are an expert system architect specializing in {targetSystem} implementation projects. Your task is to break down a software requirement into specific implementation tasks.

Project: {projectName}
Source System: {sourceSystem}
Target System: {targetSystem}
Requirement: {requirementText}

Acceptance Criteria:
{acceptanceCriteria}

Create 3-6 detailed implementation tasks that would be needed to fulfill this requirement in {targetSystem}. Each task should:
1. Have a specific, action-oriented title
2. Include comprehensive implementation details with technical specifics for {targetSystem}
3. Specify the system or component where the work needs to be done
4. Include complexity and estimated effort
5. Specify dependencies or prerequisites where applicable

For {targetSystem} tasks, include specific technical details like object types, fields, workflows, integrations, or UI components that would need to be created or modified.

Respond with a valid JSON array in this format:
[
  {
    "title": "Task title",
    "description": "Detailed task description with technical specifics",
    "system": "{targetSystem} component name",
    "taskType": "development|configuration|integration|data migration|testing",
    "complexity": "simple|moderate|complex",
    "estimatedHours": number,
    "dependencies": ["Prerequisite tasks or components"],
    "priority": "high|medium|low"
  },
  ...
]
`;

// Document Generation Prompts
export const DOCUMENT_GENERATION_PROMPT = `
{customPrompt}

{context}

Please provide a professional, well-structured response that addresses the request above. Use markdown formatting for better readability where appropriate.
`;

// System Context Prompts
export const CLAUDE_SYSTEM_PROMPT_WORKFLOW = 'You are an expert business process analyst and workflow designer specializing in creating detailed process flows from requirements.';

// Context Building Prompts
export const CONTEXT_BUILDING_PROMPT = `
This is a {fileType} file named {fileName} that needs to be analyzed to extract requirements for the project {projectName}.

Use the following keywords for focus: {keywords}
`;