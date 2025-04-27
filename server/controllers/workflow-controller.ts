import { Request, Response } from 'express';
import { db } from '../db';
import { storage } from '../storage';
import { projects, requirements } from '@shared/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { insertWorkflowSchema } from '@shared/schema';
import { logger } from '../utils/logger';
import { z } from 'zod';

// Types for workflow nodes and edges
interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: any;
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: string;
  animated?: boolean;
}

/**
 * Controller for workflow-related operations
 */
export class WorkflowController {
  /**
   * Get all workflows for a project
   * @param req Express request object
   * @param res Express response object
   */
  async getWorkflowsByProject(req: Request, res: Response): Promise<Response> {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      // Check if project exists in the database
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, projectId)
      });
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const workflows = await storage.getWorkflowsByProject(projectId);
      return res.json(workflows);
    } catch (error) {
      logger.error("Error fetching workflows:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Get a workflow by ID
   * @param req Express request object
   * @param res Express response object
   */
  async getWorkflowById(req: Request, res: Response): Promise<Response> {
    try {
      const workflowId = parseInt(req.params.id);
      if (isNaN(workflowId)) {
        return res.status(400).json({ message: "Invalid workflow ID" });
      }

      const workflow = await storage.getWorkflow(workflowId);
      if (!workflow) {
        return res.status(404).json({ message: "Workflow not found" });
      }

      return res.json(workflow);
    } catch (error) {
      logger.error("Error fetching workflow:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Create a new workflow
   * @param req Express request object
   * @param res Express response object
   */
  async createWorkflow(req: Request, res: Response): Promise<Response> {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      // Check if project exists in the database
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, projectId)
      });
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Validate the workflow data
      const workflowData = insertWorkflowSchema.parse({
        ...req.body,
        projectId // Override with the path parameter
      });

      const newWorkflow = await storage.createWorkflow(workflowData);
      
      // Log the creation of a new workflow as an activity
      await storage.createActivity({
        type: "created_workflow",
        description: `Created workflow "${newWorkflow.name}"`,
        userId: req.session.userId || 1, // Use demo user if not logged in
        projectId,
        relatedEntityId: newWorkflow.id
      });

      return res.status(201).json(newWorkflow);
    } catch (error) {
      logger.error("Error creating workflow:", error);
      return res.status(400).json({ message: "Invalid workflow data", error });
    }
  }

  /**
   * Update a workflow
   * @param req Express request object
   * @param res Express response object
   */
  async updateWorkflow(req: Request, res: Response): Promise<Response> {
    try {
      const workflowId = parseInt(req.params.id);
      if (isNaN(workflowId)) {
        return res.status(400).json({ message: "Invalid workflow ID" });
      }

      // Check if workflow exists
      const existingWorkflow = await storage.getWorkflow(workflowId);
      if (!existingWorkflow) {
        return res.status(404).json({ message: "Workflow not found" });
      }

      // Validate the update data
      const workflowData = insertWorkflowSchema.partial().parse(req.body);

      // Update the workflow
      const updatedWorkflow = await storage.updateWorkflow(workflowId, workflowData);
      if (!updatedWorkflow) {
        return res.status(500).json({ message: "Failed to update workflow" });
      }

      // Log the update as an activity
      await storage.createActivity({
        type: "updated_workflow",
        description: `Updated workflow "${updatedWorkflow.name}"`,
        userId: req.session.userId || 1, // Use demo user if not logged in
        projectId: updatedWorkflow.projectId,
        relatedEntityId: updatedWorkflow.id
      });

      return res.json(updatedWorkflow);
    } catch (error) {
      logger.error("Error updating workflow:", error);
      return res.status(400).json({ message: "Invalid workflow data", error });
    }
  }

  /**
   * Delete a workflow
   * @param req Express request object
   * @param res Express response object
   */
  async deleteWorkflow(req: Request, res: Response): Promise<Response> {
    try {
      const workflowId = parseInt(req.params.id);
      if (isNaN(workflowId)) {
        return res.status(400).json({ message: "Invalid workflow ID" });
      }

      // Check if workflow exists
      const existingWorkflow = await storage.getWorkflow(workflowId);
      if (!existingWorkflow) {
        return res.status(404).json({ message: "Workflow not found" });
      }

      // Delete the workflow
      const success = await storage.deleteWorkflow(workflowId);
      if (!success) {
        return res.status(500).json({ message: "Failed to delete workflow" });
      }

      // Log the deletion as an activity
      await storage.createActivity({
        type: "deleted_workflow",
        description: `Deleted workflow "${existingWorkflow.name}"`,
        userId: req.session.userId || 1, // Use demo user if not logged in
        projectId: existingWorkflow.projectId,
        relatedEntityId: undefined
      });

      return res.json({ message: "Workflow deleted successfully" });
    } catch (error) {
      logger.error("Error deleting workflow:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Generate a workflow from requirements
   * @param req Express request object
   * @param res Express response object
   */
  async generateWorkflow(req: Request, res: Response): Promise<Response> {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      // Check if project exists
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, projectId)
      });
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Get specific requirements if IDs were provided, otherwise get all workflow category requirements
      let workflowRequirements;
      
      if (req.body.requirementIds && Array.isArray(req.body.requirementIds) && req.body.requirementIds.length > 0) {
        // Get the specified requirements with their acceptance criteria
        workflowRequirements = await db.query.requirements.findMany({
          where: and(
            eq(requirements.projectId, projectId),
            inArray(requirements.id, req.body.requirementIds)
          )
        });
      } else {
        // Get all requirements with the "workflow" category and their acceptance criteria
        workflowRequirements = await db.query.requirements.findMany({
          where: and(
            eq(requirements.projectId, projectId),
            eq(requirements.category, "workflow")
          )
        });
      }

      if (workflowRequirements.length === 0) {
        return res.status(404).json({ 
          message: "No workflow requirements found",
          detail: "Add requirements with the 'Workflow' category to generate a workflow"
        });
      }

      // Create a new workflow with default structure
      const workflowName = req.body.name || `${project.name} Workflow`;
      
      // For Claude-based workflow generation, we'll use a single requirement with its acceptance criteria
      // If multiple requirements are selected, we'll use the first one for simplicity
      const primaryRequirement = workflowRequirements[0];
      
      // Check for Anthropic API key
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        logger.error('Missing ANTHROPIC_API_KEY environment variable');
        return res.status(500).json({ 
          message: "Missing API key",
          detail: "Claude API key is not configured. Please set the ANTHROPIC_API_KEY environment variable."
        });
      }
      
      // Try to generate workflow using the workflow service
      try {
        // Import the workflow service
        const { generateWorkflowDiagram } = await import('../services/workflow-service');
        
        // Call the service to generate the workflow
        logger.info(`Generating workflow diagram with Claude for ${primaryRequirement.title}...`);
        const workflowJson = await generateWorkflowDiagram(primaryRequirement);
        
        // Transform Claude's output to our WorkflowNode and WorkflowEdge format
        if (workflowJson && workflowJson.nodes && workflowJson.edges) {
          // Process the generated workflow
          const processedWorkflow = await this.processGeneratedWorkflow(workflowJson, primaryRequirement, project, workflowName, req);
          return res.json(processedWorkflow);
        } else {
          // Fallback if Claude doesn't return proper structure
          logger.error('Invalid workflow structure in Claude response');
          return res.status(500).json({ 
            message: "Failed to generate workflow",
            detail: "The AI model returned an invalid workflow structure"
          });
        }
      } catch (error) {
        logger.error("Error generating workflow with Claude:", error);
        return res.status(500).json({ 
          message: "Failed to generate workflow",
          detail: error instanceof Error ? error.message : String(error)
        });
      }
    } catch (error) {
      logger.error("Error in generate workflow endpoint:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Process a generated workflow from Claude
   * This is a helper method to keep the generateWorkflow method cleaner
   */
  private async processGeneratedWorkflow(
    workflowJson: any, 
    primaryRequirement: any, 
    project: any, 
    workflowName: string, 
    req: Request
  ) {
    // Map Claude's nodes to our format
    const mappedNodes = workflowJson.nodes.map((node: any) => {
      // Map Claude's nodeType to our node type format
      let nodeType = 'task'; // Default to task
      switch (node.data.nodeType) {
        case 'Start Event': nodeType = 'start'; break;
        case 'End Event': nodeType = 'end'; break;
        case 'Task': nodeType = 'task'; break;
        case 'Subprocess': nodeType = 'subprocess'; break;
        case 'Decision': nodeType = 'decision'; break;
        case 'Parallel GW': nodeType = 'parallel'; break;
        case 'User Task': nodeType = 'userTask'; break;
        case 'Wait / Delay': nodeType = 'wait'; break;
        case 'Message Event': nodeType = 'message'; break;
        case 'Error Event': nodeType = 'error'; break;
        case 'Annotation': nodeType = 'annotation'; break;
      }
      
      return {
        id: node.id,
        type: nodeType,
        // Initially set position to origin, will be arranged by layout algorithm
        position: { x: 0, y: 0 },
        data: {
          label: node.data.label,
          description: node.data.justification,
          requirementId: primaryRequirement.id,
          properties: {
            justification: node.data.justification
          }
        }
      };
    });
    
    // Map Claude's edges to our format
    const mappedEdges = workflowJson.edges.map((edge: any) => {
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label || '',
        type: edge.type === 'smoothstep' ? 'default' : edge.type || 'default',
        animated: false
      };
    });
    
    // Apply layout algorithm to the nodes
    const { nodes: layoutedNodes, edges: layoutedEdges } = await this.applyLayoutToWorkflow(mappedNodes, mappedEdges);
    
    // Create a new workflow in the database
    const workflowData = {
      name: workflowName,
      description: `Auto-generated workflow for requirement: ${primaryRequirement.title}`,
      projectId: project.id,
      content: {
        nodes: layoutedNodes,
        edges: layoutedEdges
      }
    };
    
    const newWorkflow = await storage.createWorkflow(workflowData);
    
    // Log activity
    await storage.createActivity({
      type: "generated_workflow",
      description: `Generated workflow "${workflowName}" from requirement "${primaryRequirement.title}"`,
      userId: req.session.userId || 1, // Use demo user if not logged in
      projectId: project.id,
      relatedEntityId: newWorkflow.id
    });
    
    return {
      ...newWorkflow,
      generatedFrom: {
        requirementId: primaryRequirement.id,
        requirementTitle: primaryRequirement.title
      }
    };
  }

  /**
   * Apply layout algorithm to workflow nodes and edges
   * This is a helper method to arrange nodes in a visual layout
   */
  private async applyLayoutToWorkflow(nodes: WorkflowNode[], edges: WorkflowEdge[]) {
    // Step 1: Build a graph structure from nodes and edges
    type GraphNode = {
      id: string;
      nodeData: any;
      outgoingEdges: string[]; // target node IDs
      incomingEdges: string[]; // source node IDs
      level?: number; // Level in the hierarchy (distance from start)
      column?: number; // Column in the layout
    };
    
    const graph: Record<string, GraphNode> = {};
    
    // Initialize graph with nodes
    nodes.forEach(node => {
      graph[node.id] = {
        id: node.id,
        nodeData: node,
        outgoingEdges: [],
        incomingEdges: [],
      };
    });
    
    // Add edge information to the graph
    edges.forEach(edge => {
      if (graph[edge.source]) {
        graph[edge.source].outgoingEdges.push(edge.target);
      }
      if (graph[edge.target]) {
        graph[edge.target].incomingEdges.push(edge.source);
      }
    });
    
    // Find start nodes (no incoming edges)
    const startNodes = Object.values(graph).filter(node => node.incomingEdges.length === 0);
    
    // Assign levels to nodes using BFS
    const queue = startNodes.map(node => {
      node.level = 0;
      return node;
    });
    
    // Process queue
    while (queue.length > 0) {
      const currentNode = queue.shift()!;
      
      // Process outgoing edges
      for (const targetId of currentNode.outgoingEdges) {
        const targetNode = graph[targetId];
        if (targetNode) {
          // Assign level as current level + 1 if not already assigned or if new level is higher
          if (targetNode.level === undefined || targetNode.level < (currentNode.level! + 1)) {
            targetNode.level = currentNode.level! + 1;
            queue.push(targetNode);
          }
        }
      }
    }
    
    // Group nodes by level
    const levelGroups: Record<number, GraphNode[]> = {};
    Object.values(graph).forEach(node => {
      if (node.level !== undefined) {
        if (!levelGroups[node.level]) {
          levelGroups[node.level] = [];
        }
        levelGroups[node.level].push(node);
      }
    });
    
    // Assign column within each level
    Object.values(levelGroups).forEach(nodesAtLevel => {
      nodesAtLevel.forEach((node, index) => {
        node.column = index;
      });
    });
    
    // Calculate node positions
    const LEVEL_HEIGHT = 150; // Vertical spacing between levels
    const NODE_WIDTH = 200;   // Horizontal spacing between nodes in the same level
    
    // Update positions in the original nodes
    const positionedNodes = nodes.map(node => {
      const graphNode = graph[node.id];
      if (graphNode && graphNode.level !== undefined && graphNode.column !== undefined) {
        return {
          ...node,
          position: {
            x: graphNode.column * NODE_WIDTH,
            y: graphNode.level * LEVEL_HEIGHT
          }
        };
      }
      return node;
    });
    
    return { nodes: positionedNodes, edges };
  }
}

// Create and export the controller instance
export const workflowController = new WorkflowController();