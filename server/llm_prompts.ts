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
| Wait / Delay      | Circle                 | Brown / Yellow                | Clock                  | Intermediate Solid|
| Message Event     | Circle                 | Orange / Teal                 | Envelope               | Intermediate Solid|
| Error Event       | Circle                 | Red Border                    | Lightning Bolt         | Thick/Intermediate|
| Annotation        | Open Rectangle [\`]     | No Fill / Grey Text           | None                   | (Connected via Dotted Line) |
\`\`\`

**2. Requirement to Implement:**

Analyze the following requirement carefully:

\`\`\`
Requirement ID: {requirementId}
Requirement Title: {requirementTitle}

Description:
{requirementDescription}

Acceptance Criteria:
{acceptanceCriteria}
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
6. Include 3-5 step-by-step implementation steps that clearly outline how to accomplish the task

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
    "priority": "high|medium|low",
    "implementationSteps": [
      {
        "stepNumber": 1,
        "stepDescription": "Detailed description of the first implementation step",
        "relevantDocumentationLinks": ["URL to relevant documentation or empty array"]
      },
      {
        "stepNumber": 2,
        "stepDescription": "Detailed description of the second implementation step",
        "relevantDocumentationLinks": ["URL to relevant documentation or empty array"]
      }
    ]
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

// Gemini Prompts
export const GEMINI_VIDEO_REQUIREMENTS_PROMPT = `
You are a business process expert specializing in software migration projects with expertise in {perspectiveName}. 
Your task is to analyze a video file that demonstrates workflows in a source system and generate specific requirements 
for implementing these workflows in a target system. Focus specifically on {perspectiveFocus}.

Project context: {projectName}
Video file details:
- Name: {fileName}
- Size: {fileSize} MB
- Created: {fileCreated}
- Modified: {fileModified}
- Content type: {contentType}
- Inferred domain: {inferredDomain}
- Analysis perspective: {perspectiveName} (focusing on {perspectiveFocus})

{contentTypeInstructions}

For each requirement:
1. Provide a concise title (3-10 words) that summarizes the requirement
2. Provide a detailed, domain-specific requirement description of at least 150 words that focuses on {perspectiveFocus} within {inferredDomain} functionality
3. Classify it into one of these categories: 'functional', 'non-functional', 'security', 'performance'
4. Assign a priority level: 'high', 'medium', or 'low'

Format your response as a JSON array with exactly {reqPerChunk} requirements, each with the properties 'title', 'description', 'category', and 'priority'.
Example: [{"title": "Call Center Queue Management", "description": "The target system must implement the service call center queue management workflow with priority-based routing, skill-based assignment, and SLA tracking identical to the source system... [detailed 150+ word description that thoroughly explains the requirement]", "category": "functional", "priority": "high"}, ...]

Only output valid JSON with no additional text or explanations.
`;

// AI Expert Review Prompts for Google Gemini
export const EXPERT_REVIEW_PROMPT = `
**Role:** You are an expert Software Migration Consultant (powered by Google Gemini) with deep experience in analyzing project requirements for complex system migrations (e.g., legacy to cloud, on-premise to SaaS, database migrations). Your expertise lies in identifying requirements that are clear, feasible, testable, and directly relevant to the migration effort, while flagging those that are ambiguous, introduce scope creep, or pose risks.

**Task:** Evaluate the quality, clarity, feasibility, and testability of the following software migration requirement provided below. Based on your expert assessment, determine if the requirement is well-defined and suitable for guiding development and testing efforts within the specific context of a *migration* project. If the requirement is not rated as "good", identify specific follow-up questions that need to be answered to address the identified shortcomings.

**Input Requirement:**
\`\`\`
{requirementText}
\`\`\`

**Evaluation Criteria:**
When evaluating the requirement, consider these key aspects from a migration perspective:
1.  **Clarity & Unambiguity:** Is the requirement easily understood? Is it specific and free from vague language? Is there only one likely interpretation?
2.  **Testability/Verifiability:** Can the successful implementation of this requirement be objectively proven? Does it define clear success criteria?
3.  **Feasibility (Migration Context):** Is this requirement achievable within the typical constraints and goals of a migration (e.g., migrating existing functionality/data, not building significant *new* features)? Does it seem technically plausible for the likely source/target systems?
4.  **Relevance:** Is this requirement essential for the migration's success? Does it directly address a necessary function, data element, or non-functional aspect (like performance or security) that *must* be carried over or adapted in the target system? Or does it represent potential scope creep (a new feature)?
5.  **Completeness:** Does the requirement contain sufficient detail (e.g., specific data fields, performance metrics, security standards) to be actionable by developers and testers?
6.  **Atomicity:** Does the requirement represent a single, distinct need, or does it improperly bundle multiple unrelated needs?

**Output Format:**
Provide your evaluation strictly as a JSON object adhering to the following structure. Do not include any introductory text or explanations outside the JSON structure itself.

\`\`\`json
{
  "evaluation": {
    "rating": "<rating>",
    "explanation": "<explanation_text>",
    "follow_up_questions": [
      "<question_1>",
      "<question_2>",
      ...
    ]
  }
}
\`\`\`

**Instructions for JSON Content:**

1.  **\`rating\`**: This field MUST contain one of the following three string values:
    * \`"good"\`: The requirement is clear, testable, feasible, relevant, and sufficiently complete for a migration context. It meets the evaluation criteria well.
    * \`"good with caveats"\`: The requirement is generally useful but has one or more minor issues (e.g., slight ambiguity needing clarification, missing a specific detail, could be more easily testable). It's usable but needs refinement.
    * \`"bad"\`: The requirement has significant flaws (e.g., it's fundamentally unclear, untestable, clearly out of scope for a migration, technically infeasible, bundles too many distinct needs). It should be rejected or completely rewritten.

2.  **\`explanation\`**:
    * If the \`rating\` is \`"good with caveats"\` or \`"bad"\`, this field MUST contain a concise text explanation detailing *why* the requirement received that rating. Focus on which evaluation criteria were not met and provide specific reasons.
    * If the \`rating\` is \`"good"\`, this field MUST be present but should contain an empty string (\`""\`).

3.  **\`follow_up_questions\`**:
    * If the \`rating\` is \`"good with caveats"\` or \`"bad"\`, this field MUST contain an array of specific, targeted questions. These questions should directly address the issues raised in the \`explanation\` and aim to elicit the information needed to refine the requirement into a "good" one (i.e., making it more clear, testable, feasible, complete, atomic, or relevant).
    * If the \`rating\` is \`"good"\`, this field MUST be present but should be an empty array (\`[]\`).

**Rating Guidelines:**
* **good:** The requirement meets most/all evaluation criteria; it is clear, testable, feasible, relevant, and sufficiently complete for a migration context.
* **good with caveats:** The requirement is generally understandable and useful, but has minor issues (e.g., slight ambiguity, missing minor details, could be more testable) that need clarification or refinement. Explain these caveats and ask questions to resolve them.
* **bad:** The requirement has significant flaws (e.g., fundamentally unclear, untestable, infeasible for migration, irrelevant, introduces major scope creep, bundles too many needs). Explain the critical issues and ask questions needed for a complete rewrite or clarification of intent.

**Now, analyze the provided Input Requirement based on the criteria and generate the JSON output including relevant follow-up questions if necessary.**
`;

export const GEMINI_REQUIREMENTS_PROMPT = `
You are a requirements analysis expert. Your task is to extract or generate software requirements from the following context:
Project context: {projectName}
Source file: {fileName}
Content type: {contentType}
Chunk: {chunkIndex} of {totalChunks}

The source file contains customer-specific context about their business processes, data structures, workflows, or other specifications. Your job is to generate detailed, thorough requirements from the source file that will be used by a system implementor to migrate the customer from their legacy system to Salesforce.

The requirements should be clear, comprehensive, and detailed. They should thoroughly describe the key workflows, processes, or structures that need to be solved for in the new system. Each requirement should contain a Name, which summarizes the requirement, and a Description, which details what's needed to fulfill the requirement. Each requirement description should be at least 75 words to ensure sufficient detail.

Each requirement should also be labeled with a single category. Most requirements will be Functional.
Functional: these requirements are related to business processes, workflows, data structures, and system capabilities
Non-Functional: these requirements are related to usability and other non-functional capabilities
Security: these requirements are related to permissions, access, and security
Performance: these requirements are related to scale, data volumes, and processing speed

Each requirement should also be labeled with a priority. Most requirements will be Medium priority.
High: these requirements are essential to the success of the project overall
Medium: these requirements are important to the project, but if one are two are missed the project will not fail
Low: these requirements are nice to have, and the project will be successful without them

The source file is tagged with the content type: {contentType}.
{contentTypeInstructions}

{chunkingInstructions}

Please analyze the following content and extract as many requirements as needed (there is no upper limit):

{chunkContent}

Extract as many requirements as necessary to comprehensively cover the content provided. Do not limit yourself to a specific number - extract all valid requirements from the text. You should aim to extract at least {minRequirements} requirements if the content supports it, but extract more if necessary.

Format your response as a JSON array of requirements, where each requirement has:
1. 'title' (string): A concise title for the requirement (3-10 words)
2. 'description' (string): A detailed description of at least 150 words that thoroughly explains what needs to be implemented
3. 'category' (string): One of 'functional', 'non-functional', 'security', 'performance'
4. 'priority' (string): One of 'high', 'medium', 'low'

Example format (but with much more detailed descriptions for each requirement):
[
  {
    "title": "Case Management Workflow",
    "description": "The system must implement a comprehensive case management workflow that allows customer service representatives to...[detailed 150+ word description]",
    "category": "functional", 
    "priority": "high"
  },
  {
    "title": "Knowledge Base Integration",
    "description": "The Salesforce implementation must support a knowledge base integration that...[detailed 150+ word description]",
    "category": "functional",
    "priority": "medium"
  }
]

Only output valid JSON with no additional text or explanations.
`;