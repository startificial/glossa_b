import { Request, Response } from 'express';
import { storage } from '../storage';
import { logger } from '../utils/logger';
import crypto from 'crypto';

/**
 * Controller for invite-related operations
 */
export class InviteController {
  /**
   * Generate a secure token for invites
   * @param length Length of the token to generate
   * @returns A hex string token
   */
  private generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
  
  /**
   * Create a new invitation
   * @param req Express request object
   * @param res Express response object
   */
  async createInvite(req: Request, res: Response): Promise<void> {
    try {
      if (!req.session.userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }
      
      // Generate invite token
      const token = this.generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry
      
      const invite = await storage.createInvite({
        token,
        email: req.body.email || null,
        createdById: user.id,
        expiresAt
      });
      
      res.status(201).json(invite);
    } catch (error) {
      logger.error("Error creating invite:", error);
      res.status(400).json({ message: "Invalid invite data", error });
    }
  }

  /**
   * Get all invites for the current user
   * @param req Express request object
   * @param res Express response object
   */
  async getInvites(req: Request, res: Response): Promise<void> {
    try {
      if (!req.session.userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      
      const invites = await storage.getInvitesByCreator(req.session.userId);
      res.json(invites);
    } catch (error) {
      logger.error("Error fetching invites:", error);
      res.status(500).json({ message: "Failed to fetch invites", error });
    }
  }
}

// Create and export the controller instance
export const inviteController = new InviteController();