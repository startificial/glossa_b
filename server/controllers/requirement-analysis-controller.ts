/**
 * Requirement Analysis Controller
 * 
 * Handles operations related to requirement analysis, contradictions, 
 * and quality checks.
 */
import { Request, Response } from 'express';
import { storage } from '../storage';
import { logger } from '../utils/logger';
import { generateAcceptanceCriteria } from '../claude';

/**
 * Controller for requirement analysis operations
 */
export class RequirementAnalysisController {
  /**
   * Analyze contradictions between requirements
   * @param req Express request object
   * @param res Express response object
   */
  async analyzeContradictions(req: Request, res: Response): Promise<Response> {
    try {
      const { requirementIds } = req.body;
      
      if (!requirementIds || !Array.isArray(requirementIds) || requirementIds.length < 2) {
        return res.status(400).json({ message: "Please provide at least two requirement IDs to analyze" });
      }
      
      // Gather the requirements
      const requirementsPromises = requirementIds.map(id => storage.getRequirement(id));
      const requirements = await Promise.all(requirementsPromises);
      
      // Filter out any null values from requirements that weren't found
      const validRequirements = requirements.filter(r => r !== null);
      
      if (validRequirements.length < 2) {
        return res.status(400).json({ message: "At least two valid requirements must be provided" });
      }
      
      // Prepare the requirements for contradiction analysis
      const requirementTexts = validRequirements.map(r => ({
        id: r.id,
        title: r.title,
        description: r.description,
        acceptance_criteria: r.acceptanceCriteria || []
      }));
      
      const prompt = `
        You are an expert software requirements analyst. Please analyze the following software requirements for contradictions,
        ambiguities, and potential integration issues:
        
        ${JSON.stringify(requirementTexts, null, 2)}
        
        Identify any of the following:
        1. Direct contradictions between requirements
        2. Subtle incompatibilities that might cause issues
        3. Ambiguities that could lead to different interpretations
        4. Dependencies or integration issues
        
        For each issue found, please explain:
        - Which requirements are involved (by ID)
        - The nature of the contradiction or issue
        - Potential resolution options
        - Severity (High, Medium, Low)
        
        Format your response as a JSON array of objects with the following structure:
        [
          {
            "type": "contradiction" | "ambiguity" | "integration_issue",
            "requirements": [requirement IDs involved],
            "description": "Detailed description of the issue",
            "resolution_options": ["Option 1", "Option 2", ...],
            "severity": "High" | "Medium" | "Low"
          },
          ...
        ]
        
        If no issues are found, return an empty array.
      `;
      
      // In a real implementation, this would call an AI service
      // For now, return a simple mock response
      const mockAnalysis = [
        {
          type: "contradiction",
          requirements: requirementIds.slice(0, 2),
          description: "The requirements specify different authentication mechanisms that conflict with each other.",
          resolution_options: [
            "Standardize on a single authentication mechanism",
            "Implement both mechanisms but make one the default"
          ],
          severity: "High"
        }
      ];
      
      // Also save this contradiction analysis as a task
      const task = await storage.createImplementationTask({
        requirementId: requirementIds[0],
        title: "Resolve requirement contradictions",
        description: "Address contradictions identified between requirements: " + requirementIds.join(", "),
        status: "open",
        priority: "high",
        assigneeId: req.session.userId || 1,
        complexity: "medium",
        estimatedHours: 4,
        dependencyIds: []
      });
      
      return res.json({
        analysis: mockAnalysis,
        task_id: task.id
      });
    } catch (error) {
      logger.error("Error analyzing requirement contradictions:", error);
      return res.status(500).json({ message: "Error analyzing requirement contradictions" });
    }
  }

  /**
   * Get details of a contradiction task
   * @param req Express request object
   * @param res Express response object
   */
  async getContradictionTask(req: Request, res: Response): Promise<Response> {
    try {
      const taskId = parseInt(req.params.taskId);
      
      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }
      
      const task = await storage.getImplementationTask(taskId);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // In a real implementation, this would retrieve the stored analysis
      const mockAnalysis = [
        {
          type: "contradiction",
          requirements: [1, 2],
          description: "The requirements specify different authentication mechanisms that conflict with each other.",
          resolution_options: [
            "Standardize on a single authentication mechanism",
            "Implement both mechanisms but make one the default"
          ],
          severity: "High"
        }
      ];
      
      return res.json({
        task,
        analysis: mockAnalysis
      });
    } catch (error) {
      logger.error("Error retrieving contradiction task:", error);
      return res.status(500).json({ message: "Error retrieving contradiction task" });
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
      
      // In a real implementation, this would retrieve stored contradictions
      // For now, return mock data
      const mockContradictions = [
        {
          id: 1,
          requirements: [1, 3],
          description: "Requirement #1 and #3 have conflicting data retention policies",
          severity: "Medium"
        },
        {
          id: 2,
          requirements: [2, 5],
          description: "Authentication methods specified in requirement #2 and #5 are incompatible",
          severity: "High"
        }
      ];
      
      return res.json(mockContradictions);
    } catch (error) {
      logger.error("Error retrieving project contradictions:", error);
      return res.status(500).json({ message: "Error retrieving project contradictions" });
    }
  }

  /**
   * Perform quality check on project requirements
   * @param req Express request object
   * @param res Express response object
   */
  async checkRequirementQuality(req: Request, res: Response): Promise<Response> {
    try {
      const projectId = parseInt(req.params.projectId);
      
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      
      // Get project requirements
      let userId = req.session.userId;
      let user = null;
      
      if (userId) {
        user = await storage.getUser(userId);
      } else {
        // If no user in session, use demo user
        user = await storage.getUserByUsername("demo");
        if (!user) {
          user = await storage.getUserByUsername("glossa_admin");
        }
      }
      
      if (!user) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const projectRequirements = await storage.getRequirementsByProject(projectId);
      
      if (projectRequirements.length === 0) {
        return res.status(404).json({ message: "No requirements found for this project" });
      }
      
      // Mock quality check results
      const qualityCheckResults = projectRequirements.map(req => {
        const hasAcceptanceCriteria = !!(req.acceptanceCriteria && 
                                       Array.isArray(req.acceptanceCriteria) && 
                                       req.acceptanceCriteria.length > 0);
        
        const descriptionWordCount = req.description.split(' ').length;
        const descriptionQuality = descriptionWordCount < 20 ? "poor" : 
                                  descriptionWordCount < 50 ? "fair" : "good";
        
        return {
          id: req.id,
          title: req.title,
          quality_metrics: {
            has_acceptance_criteria: hasAcceptanceCriteria,
            acceptance_criteria_count: hasAcceptanceCriteria ? req.acceptanceCriteria.length : 0,
            description_word_count: descriptionWordCount,
            description_quality: descriptionQuality,
            overall_quality: hasAcceptanceCriteria && descriptionQuality !== "poor" ? "good" : "needs_improvement"
          },
          improvement_suggestions: hasAcceptanceCriteria ? [] : [
            "Add acceptance criteria to clarify when this requirement is considered fulfilled"
          ]
        };
      });
      
      // Create an activity log for this quality check
      await storage.createActivity({
        type: "requirement_quality_check",
        description: `Performed quality check on ${projectRequirements.length} requirements`,
        userId: user.id,
        projectId: projectId,
        relatedEntityId: null
      });
      
      return res.json({
        total_requirements: projectRequirements.length,
        quality_summary: {
          good: qualityCheckResults.filter(r => r.quality_metrics.overall_quality === "good").length,
          needs_improvement: qualityCheckResults.filter(r => r.quality_metrics.overall_quality === "needs_improvement").length
        },
        requirements: qualityCheckResults
      });
    } catch (error) {
      logger.error("Error checking requirement quality:", error);
      return res.status(500).json({ message: "Error checking requirement quality" });
    }
  }
}

export const requirementAnalysisController = new RequirementAnalysisController();