/**
 * Requirement Role Effort Controller
 * 
 * Handles operations related to role efforts for requirements.
 */
import { Request, Response } from 'express';
import { db } from '../db';
import { requirements, requirementRoleEfforts } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { storage } from '../storage';
import { logger } from '../utils/logger';
import { z } from 'zod';

// Role effort validation schema
const roleEffortSchema = z.object({
  roleId: z.number().int().positive(),
  hourlyRate: z.number().positive().optional(),
  hours: z.number().positive(),
  notes: z.string().optional()
});

/**
 * Controller for requirement role effort related operations
 */
export class RequirementRoleEffortController {
  /**
   * Get role efforts for a requirement
   * @param req Express request object
   * @param res Express response object
   */
  async getRoleEffortsForRequirement(req: Request, res: Response): Promise<Response> {
    try {
      const requirementId = parseInt(req.params.requirementId);
      if (isNaN(requirementId)) {
        return res.status(400).json({ message: "Invalid requirement ID" });
      }

      // Check if requirement exists
      const requirement = await db.query.requirements.findFirst({
        where: eq(requirements.id, requirementId)
      });
      
      if (!requirement) {
        return res.status(404).json({ message: "Requirement not found" });
      }

      // Get role efforts for the requirement
      const roleEfforts = await db.query.requirementRoleEfforts.findMany({
        where: eq(requirementRoleEfforts.requirementId, requirementId)
      });
      
      // Get roles information to include in response
      const roleIds = new Set(roleEfforts.map(effort => effort.roleId));
      const rolesPromises = Array.from(roleIds).map(roleId => storage.getProjectRole(roleId));
      const roles = await Promise.all(rolesPromises);
      
      // Create a map for quick lookup
      const roleMap = new Map();
      roles.forEach(role => {
        if (role) {
          roleMap.set(role.id, role);
        }
      });
      
      // Add role details to efforts
      const effortsWithRoleDetails = roleEfforts.map(effort => {
        const role = roleMap.get(effort.roleId);
        return {
          ...effort,
          role: role ? {
            id: role.id,
            name: role.name,
            description: role.description,
            projectId: role.projectId
          } : null
        };
      });
      
      return res.json(effortsWithRoleDetails);
    } catch (error) {
      logger.error("Error fetching role efforts for requirement:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Create a role effort for a requirement
   * @param req Express request object
   * @param res Express response object
   */
  async createRoleEffortForRequirement(req: Request, res: Response): Promise<Response> {
    try {
      const requirementId = parseInt(req.params.requirementId);
      if (isNaN(requirementId)) {
        return res.status(400).json({ message: "Invalid requirement ID" });
      }

      // Check if requirement exists
      const requirement = await db.query.requirements.findFirst({
        where: eq(requirements.id, requirementId)
      });
      
      if (!requirement) {
        return res.status(404).json({ message: "Requirement not found" });
      }

      // Validate role effort data
      const validationResult = roleEffortSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid role effort data", 
          errors: validationResult.error.errors 
        });
      }
      
      // Get role to verify it exists
      const role = await storage.getProjectRole(validationResult.data.roleId);
      if (!role) {
        return res.status(404).json({ message: "Role not found" });
      }
      
      // Create role effort
      const roleEffort = await storage.createRequirementRoleEffort({
        requirementId,
        roleId: validationResult.data.roleId,
        hourlyRate: validationResult.data.hourlyRate,
        hours: validationResult.data.hours,
        notes: validationResult.data.notes
      });
      
      // Add activity for role effort creation
      await storage.createActivity({
        type: "created_role_effort",
        description: `Added effort estimate for role "${role.name}" to requirement "${requirement.title}"`,
        userId: req.session.userId || 1, // Use demo user if not logged in
        projectId: requirement.projectId,
        relatedEntityId: roleEffort.id
      });
      
      // Get the role details to include in response
      const roleEffortWithRoleDetails = {
        ...roleEffort,
        role: {
          id: role.id,
          name: role.name,
          description: role.description,
          projectId: role.projectId
        }
      };
      
      return res.status(201).json(roleEffortWithRoleDetails);
    } catch (error) {
      logger.error("Error creating role effort for requirement:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Delete a role effort for a requirement
   * @param req Express request object
   * @param res Express response object
   */
  async deleteRoleEffortForRequirement(req: Request, res: Response): Promise<Response> {
    try {
      const requirementId = parseInt(req.params.requirementId);
      const effortId = parseInt(req.params.effortId);
      
      if (isNaN(requirementId) || isNaN(effortId)) {
        return res.status(400).json({ message: "Invalid requirement ID or effort ID" });
      }

      // Check if requirement exists
      const requirement = await db.query.requirements.findFirst({
        where: eq(requirements.id, requirementId)
      });
      
      if (!requirement) {
        return res.status(404).json({ message: "Requirement not found" });
      }

      // Get the effort to check if it exists and to get role info for the activity
      const effort = await db.query.requirementRoleEfforts.findFirst({
        where: eq(requirementRoleEfforts.id, effortId)
      });
      
      if (!effort) {
        return res.status(404).json({ message: "Role effort not found" });
      }
      
      // Get role for activity context
      const role = await storage.getProjectRole(effort.roleId);
      
      // Delete the role effort
      await storage.deleteRequirementRoleEffort(effortId);
      
      // Add activity for role effort deletion
      await storage.createActivity({
        type: "deleted_role_effort",
        description: `Removed effort estimate for role "${role ? role.name : 'Unknown'}" from requirement "${requirement.title}"`,
        userId: req.session.userId || 1, // Use demo user if not logged in
        projectId: requirement.projectId,
        relatedEntityId: null
      });
      
      return res.status(200).json({ 
        message: "Role effort deleted successfully", 
        effortId 
      });
    } catch (error) {
      logger.error("Error deleting role effort for requirement:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
}

export const requirementRoleEffortController = new RequirementRoleEffortController();