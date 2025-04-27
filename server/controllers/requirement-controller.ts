/**
 * Requirement Controller
 * 
 * Handles all operations related to requirements management including CRUD operations,
 * generating acceptance criteria, and other requirement-specific operations.
 */
import { Request, Response } from 'express';
import { db } from '../db';
import { projects, requirements } from '@shared/schema';
import { eq, asc, and, inArray } from 'drizzle-orm';
import { insertRequirementSchema } from '@shared/schema';
import { storage } from '../storage';
import { generateAcceptanceCriteria, generateImplementationTasks } from '../claude';
import { generateExpertReview } from '../gemini';
import { logger } from '../utils/logger';
import { z } from 'zod';

/**
 * Controller for requirement related operations
 */
export class RequirementController {
  /**
   * Get high priority requirements for a project
   * @param req Express request object
   * @param res Express response object
   */
  async getHighPriorityRequirements(req: Request, res: Response): Promise<Response> {
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
      
      // Query requirements with high priority
      const requirementsList = await db.query.requirements.findMany({
        where: and(
          eq(requirements.projectId, projectId),
          eq(requirements.priority, 'high')
        ),
        orderBy: [asc(requirements.id)]
      });
      
      return res.json(requirementsList);
    } catch (error) {
      logger.error("Error fetching high priority requirements:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Get a specific requirement by ID
   * @param req Express request object
   * @param res Express response object
   */
  async getRequirementById(req: Request, res: Response): Promise<Response> {
    try {
      const projectId = parseInt(req.params.projectId);
      const requirementId = parseInt(req.params.id);
      
      if (isNaN(projectId) || isNaN(requirementId)) {
        return res.status(400).json({ message: "Invalid project or requirement ID" });
      }

      // Check if project exists
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, projectId)
      });
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Get the requirement
      const requirement = await db.query.requirements.findFirst({
        where: and(
          eq(requirements.id, requirementId),
          eq(requirements.projectId, projectId)
        )
      });
      
      if (!requirement) {
        return res.status(404).json({ message: "Requirement not found" });
      }
      
      return res.json(requirement);
    } catch (error) {
      logger.error("Error fetching requirement:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Get all requirements for a project
   * @param req Express request object
   * @param res Express response object
   */
  async getRequirementsByProject(req: Request, res: Response): Promise<Response> {
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

      // Get all requirements for the project
      const requirementsList = await db.query.requirements.findMany({
        where: eq(requirements.projectId, projectId),
        orderBy: [asc(requirements.id)]
      });
      
      return res.json(requirementsList);
    } catch (error) {
      logger.error("Error fetching requirements:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Create a new requirement
   * @param req Express request object
   * @param res Express response object
   */
  async createRequirement(req: Request, res: Response): Promise<Response> {
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

      // Validate the requirement data
      const requirementData = insertRequirementSchema.parse({
        ...req.body,
        projectId: projectId // Override with the path parameter
      });

      // Create the requirement
      const requirement = await storage.createRequirement(requirementData);
      
      // Add activity for requirement creation
      await storage.createActivity({
        type: "created_requirement",
        description: `Created requirement "${requirement.title}"`,
        userId: req.session.userId || 1, // Use demo user if not logged in
        projectId: projectId,
        relatedEntityId: requirement.id
      });

      return res.status(201).json(requirement);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid requirement data", 
          errors: error.errors 
        });
      }
      
      logger.error("Error creating requirement:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Update a requirement
   * @param req Express request object
   * @param res Express response object
   */
  async updateRequirement(req: Request, res: Response): Promise<Response> {
    try {
      const projectId = parseInt(req.params.projectId);
      const requirementId = parseInt(req.params.id);
      
      if (isNaN(projectId) || isNaN(requirementId)) {
        return res.status(400).json({ message: "Invalid project or requirement ID" });
      }

      // Check if project exists
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, projectId)
      });
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check if requirement exists
      const existingRequirement = await db.query.requirements.findFirst({
        where: and(
          eq(requirements.id, requirementId),
          eq(requirements.projectId, projectId)
        )
      });
      
      if (!existingRequirement) {
        return res.status(404).json({ message: "Requirement not found" });
      }

      // Validate the update data (partial validation)
      const updateData = insertRequirementSchema.partial().parse({
        ...req.body,
        projectId: projectId // Override with the path parameter
      });

      // Update the requirement
      const updatedRequirement = await storage.updateRequirement(requirementId, updateData);
      
      // Add activity for requirement update
      await storage.createActivity({
        type: "updated_requirement",
        description: `Updated requirement "${updatedRequirement.title}"`,
        userId: req.session.userId || 1, // Use demo user if not logged in
        projectId: projectId,
        relatedEntityId: requirementId
      });

      return res.json(updatedRequirement);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid requirement data", 
          errors: error.errors 
        });
      }
      
      logger.error("Error updating requirement:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Delete a requirement
   * @param req Express request object
   * @param res Express response object
   */
  async deleteRequirement(req: Request, res: Response): Promise<Response> {
    try {
      const projectId = parseInt(req.params.projectId);
      const requirementId = parseInt(req.params.id);
      
      if (isNaN(projectId) || isNaN(requirementId)) {
        return res.status(400).json({ message: "Invalid project or requirement ID" });
      }

      // Check if project exists
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, projectId)
      });
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check if requirement exists
      const existingRequirement = await db.query.requirements.findFirst({
        where: and(
          eq(requirements.id, requirementId),
          eq(requirements.projectId, projectId)
        )
      });
      
      if (!existingRequirement) {
        return res.status(404).json({ message: "Requirement not found" });
      }

      // Delete the requirement
      await storage.deleteRequirement(requirementId);
      
      // Add activity for requirement deletion
      await storage.createActivity({
        type: "deleted_requirement",
        description: `Deleted requirement "${existingRequirement.title}"`,
        userId: req.session.userId || 1, // Use demo user if not logged in
        projectId: projectId,
        relatedEntityId: null
      });

      return res.status(200).json({ 
        message: "Requirement deleted successfully",
        requirementId 
      });
    } catch (error) {
      logger.error("Error deleting requirement:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Generate acceptance criteria for a requirement
   * @param req Express request object
   * @param res Express response object
   */
  async generateAcceptanceCriteria(req: Request, res: Response): Promise<Response> {
    try {
      const requirementId = parseInt(req.params.requirementId);
      if (isNaN(requirementId)) {
        return res.status(400).json({ message: "Invalid requirement ID" });
      }

      // Get the requirement
      const requirement = await storage.getRequirement(requirementId);
      if (!requirement) {
        return res.status(404).json({ message: "Requirement not found" });
      }

      // Generate acceptance criteria using Claude
      logger.info(`Generating acceptance criteria for requirement #${requirementId}: ${requirement.title}`);
      
      // Get the project to extract project name and description
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, requirement.projectId)
      });
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const criteria = await generateAcceptanceCriteria(
        project.name,
        project.description || "No project description available",
        requirement.description
      );

      // Update the requirement with the new acceptance criteria
      await storage.updateRequirement(requirementId, {
        acceptanceCriteria: criteria
      });

      // Add activity for acceptance criteria generation
      await storage.createActivity({
        type: "generated_acceptance_criteria",
        description: `Generated acceptance criteria for requirement "${requirement.title}"`,
        userId: req.session.userId || 1, // Use demo user if not logged in
        projectId: requirement.projectId,
        relatedEntityId: requirementId
      });

      return res.json({
        message: "Acceptance criteria generated successfully",
        acceptanceCriteria: criteria
      });
    } catch (error) {
      logger.error("Error generating acceptance criteria:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Generate tasks for a requirement
   * @param req Express request object
   * @param res Express response object
   */
  async generateTasks(req: Request, res: Response): Promise<Response> {
    try {
      const requirementId = parseInt(req.params.requirementId);
      if (isNaN(requirementId)) {
        return res.status(400).json({ message: "Invalid requirement ID" });
      }

      // Get the requirement
      const requirement = await storage.getRequirement(requirementId);
      if (!requirement) {
        return res.status(404).json({ message: "Requirement not found" });
      }

      // Generate tasks using Claude
      logger.info(`Generating tasks for requirement #${requirementId}: ${requirement.title}`);
      
      // Get the project to extract necessary information
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, requirement.projectId)
      });
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const tasks = await generateImplementationTasks(
        project.name,
        project.sourceSystem || "Unknown",
        project.targetSystem || "Salesforce",
        project.description || "No project description available",
        requirement.description,
        requirement.acceptanceCriteria || [],
        requirementId
      );

      // Create the tasks in the database
      const createdTasks = [];
      for (const task of tasks) {
        const newTask = await storage.createImplementationTask({
          requirementId,
          title: task.title,
          description: task.description,
          status: 'todo',
          priority: task.priority || 'medium',
          estimate: task.estimate || null
        });
        createdTasks.push(newTask);
      }

      // Add activity for task generation
      await storage.createActivity({
        type: "generated_tasks",
        description: `Generated ${tasks.length} tasks for requirement "${requirement.title}"`,
        userId: req.session.userId || 1, // Use demo user if not logged in
        projectId: requirement.projectId,
        relatedEntityId: requirementId
      });

      return res.json({
        message: `Generated ${tasks.length} tasks successfully`,
        tasks: createdTasks
      });
    } catch (error) {
      logger.error("Error generating tasks:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Generate expert review for a requirement
   * @param req Express request object
   * @param res Express response object
   */
  async generateExpertReview(req: Request, res: Response): Promise<Response> {
    try {
      const requirementId = parseInt(req.params.requirementId);
      if (isNaN(requirementId)) {
        return res.status(400).json({ message: "Invalid requirement ID" });
      }

      // Get the requirement
      const requirement = await storage.getRequirement(requirementId);
      if (!requirement) {
        return res.status(404).json({ message: "Requirement not found" });
      }

      // Generate expert review using Gemini
      logger.info(`Generating expert review for requirement #${requirementId}: ${requirement.title}`);
      const review = await generateExpertReview(requirement);

      // Update the requirement with the expert review
      await storage.updateRequirement(requirementId, {
        expertReview: review
      });

      // Add activity for expert review generation
      await storage.createActivity({
        type: "generated_expert_review",
        description: `Generated expert review for requirement "${requirement.title}"`,
        userId: req.session.userId || 1, // Use demo user if not logged in
        projectId: requirement.projectId,
        relatedEntityId: requirementId
      });

      return res.json({
        message: "Expert review generated successfully",
        expertReview: review
      });
    } catch (error) {
      logger.error("Error generating expert review:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Get references for a requirement
   * @param req Express request object
   * @param res Express response object
   */
  async getRequirementReferences(req: Request, res: Response): Promise<Response> {
    try {
      const requirementId = parseInt(req.params.requirementId);
      if (isNaN(requirementId)) {
        return res.status(400).json({ message: "Invalid requirement ID" });
      }

      // Get the requirement
      const requirement = await storage.getRequirement(requirementId);
      if (!requirement) {
        return res.status(404).json({ message: "Requirement not found" });
      }

      // Get references (related input data, tasks, etc.)
      const references = {
        inputData: null,
        tasks: [],
        relatedRequirements: []
      };

      // Get input data if available
      if (requirement.inputDataId) {
        const inputData = await storage.getInputData(requirement.inputDataId);
        if (inputData) {
          references.inputData = {
            id: inputData.id,
            name: inputData.name,
            type: inputData.type,
            format: inputData.format,
            summary: inputData.summary
          };
        }
      }

      // Get tasks for this requirement
      const tasks = await storage.getTasksForRequirement(requirementId);
      references.tasks = tasks;

      // Get related requirements (for now, just other requirements in the same project)
      const otherRequirements = await db.query.requirements.findMany({
        where: and(
          eq(requirements.projectId, requirement.projectId),
          inArray(requirements.id, [requirementId]) // Exclude current requirement
        ),
        orderBy: [asc(requirements.id)]
      });
      
      references.relatedRequirements = otherRequirements.map(req => ({
        id: req.id,
        title: req.title,
        category: req.category,
        priority: req.priority
      }));

      return res.json(references);
    } catch (error) {
      logger.error("Error fetching requirement references:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Analyze contradictions between requirements
   * @param req Express request object
   * @param res Express response object
   */
  async analyzeContradictions(req: Request, res: Response): Promise<Response> {
    try {
      // Validate request body
      const requirementIds = req.body.requirementIds;
      if (!Array.isArray(requirementIds) || requirementIds.length < 2) {
        return res.status(400).json({ 
          message: "Invalid request", 
          detail: "At least two requirement IDs must be provided"
        });
      }

      // Get the requirements
      const requirementList = [];
      let projectId = null;
      
      for (const id of requirementIds) {
        const reqId = parseInt(String(id));
        if (isNaN(reqId)) {
          return res.status(400).json({ message: "Invalid requirement ID in list" });
        }
        
        const requirement = await storage.getRequirement(reqId);
        if (!requirement) {
          return res.status(404).json({ 
            message: "Requirement not found", 
            detail: `Requirement with ID ${reqId} does not exist`
          });
        }
        
        requirementList.push(requirement);
        
        // Set project ID from first requirement and verify all other requirements are from same project
        if (projectId === null) {
          projectId = requirement.projectId;
        } else if (projectId !== requirement.projectId) {
          return res.status(400).json({ 
            message: "Mixed projects", 
            detail: "All requirements must belong to the same project"
          });
        }
      }

      // For now, return a placeholder response
      // In a real implementation, this would call an AI service to perform contradiction analysis
      return res.json({
        message: "Contradiction analysis initiated",
        requirementsAnalyzed: requirementList.length,
        projectId,
        status: "pending",
        taskId: "contradiction-analysis-" + Date.now(),
        estimatedCompletionTime: new Date(Date.now() + 60000) // 1 minute from now
      });
    } catch (error) {
      logger.error("Error analyzing contradictions:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Get contradiction analysis task status
   * @param req Express request object
   * @param res Express response object
   */
  async getContradictionTaskStatus(req: Request, res: Response): Promise<Response> {
    try {
      const taskId = req.params.taskId;
      if (!taskId) {
        return res.status(400).json({ message: "Invalid task ID" });
      }

      // For now, return a placeholder response
      // In a real implementation, this would check the status of the contradiction analysis task
      return res.json({
        taskId,
        status: "completed",
        results: {
          contradictions: [],
          recommendations: []
        }
      });
    } catch (error) {
      logger.error("Error getting contradiction task status:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Get contradictions for a project
   * @param req Express request object
   * @param res Express response object
   */
  async getProjectContradictions(req: Request, res: Response): Promise<Response> {
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

      // For now, return a placeholder response
      // In a real implementation, this would retrieve any previously identified contradictions
      return res.json({
        projectId,
        contradictions: []
      });
    } catch (error) {
      logger.error("Error getting project contradictions:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Run quality check on requirements
   * @param req Express request object
   * @param res Express response object
   */
  async qualityCheckRequirements(req: Request, res: Response): Promise<Response> {
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

      // Get all requirements for the project
      const requirementsList = await db.query.requirements.findMany({
        where: eq(requirements.projectId, projectId),
        orderBy: [asc(requirements.id)]
      });

      // For now, return a placeholder response
      // In a real implementation, this would analyze requirements for quality issues
      const qualityIssues = [];
      const requirementsWithIssues = new Set<number>();

      // Simulate some quality checks
      for (const req of requirementsList) {
        // Check for empty description
        if (!req.description || req.description.trim() === '') {
          qualityIssues.push({
            requirementId: req.id,
            title: req.title,
            issueType: 'missing-description',
            severity: 'high',
            recommendation: 'Add a detailed description for this requirement'
          });
          requirementsWithIssues.add(req.id);
        }
        
        // Check for vague language
        const vagueTerms = ['etc', 'and so on', 'and more', 'as appropriate', 'as required'];
        for (const term of vagueTerms) {
          if (req.description && req.description.toLowerCase().includes(term)) {
            qualityIssues.push({
              requirementId: req.id,
              title: req.title,
              issueType: 'vague-language',
              severity: 'medium',
              recommendation: `Replace vague term "${term}" with specific details`
            });
            requirementsWithIssues.add(req.id);
            break; // Only report one vague term per requirement
          }
        }
        
        // Check if acceptance criteria are missing
        if (!req.acceptanceCriteria || !Array.isArray(req.acceptanceCriteria) || req.acceptanceCriteria.length === 0) {
          qualityIssues.push({
            requirementId: req.id,
            title: req.title,
            issueType: 'missing-acceptance-criteria',
            severity: 'medium',
            recommendation: 'Add acceptance criteria to clarify when this requirement is satisfied'
          });
          requirementsWithIssues.add(req.id);
        }
      }

      return res.json({
        projectId,
        totalRequirements: requirementsList.length,
        requirementsWithIssues: requirementsWithIssues.size,
        qualityScore: requirementsList.length > 0 
          ? Math.round(100 * (1 - requirementsWithIssues.size / requirementsList.length)) 
          : 100,
        issues: qualityIssues
      });
    } catch (error) {
      logger.error("Error running quality check:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
}

export const requirementController = new RequirementController();