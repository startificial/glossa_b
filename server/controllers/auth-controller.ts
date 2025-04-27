import { Request, Response } from 'express';
import { storage } from '../storage';
import { z } from 'zod';
import { insertUserSchema } from '@shared/schema';
import { logger } from '../utils/logger';

/**
 * Controller for authentication-related operations
 */
export class AuthController {
  /**
   * Register a new user
   * @param req Express request object
   * @param res Express response object
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      // Check if username or email already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        res.status(400).json({ message: "Username already exists" });
        return;
      }
      
      if (validatedData.email) {
        const existingEmail = await storage.getUserByEmail(validatedData.email);
        if (existingEmail) {
          res.status(400).json({ message: "Email already exists" });
          return;
        }
      }
      
      // Check if invite is valid if token is provided
      if (req.body.inviteToken) {
        const invite = await storage.getInvite(req.body.inviteToken);
        if (!invite) {
          res.status(400).json({ message: "Invalid invite token" });
          return;
        }
        
        if (invite.used) {
          res.status(400).json({ message: "Invite token has already been used" });
          return;
        }
        
        if (invite.expiresAt < new Date()) {
          res.status(400).json({ message: "Invite token has expired" });
          return;
        }
        
        // Update invite as used
        await storage.markInviteAsUsed(req.body.inviteToken);
        
        // Set invitedBy if the invite has a creator
        if (invite.createdById) {
          validatedData.invitedBy = invite.createdById;
        }
      }
      
      // Create the user
      const user = await storage.createUser(validatedData);
      
      // Set user in session
      req.session.userId = user.id;
      
      // Don't return the password
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      logger.error("Error registering user:", error);
      res.status(400).json({ message: "Invalid user data", error });
    }
  }

  /**
   * Log in a user
   * @param req Express request object
   * @param res Express response object
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const loginSchema = z.object({
        username: z.string(),
        password: z.string()
      });
      
      const { username, password } = loginSchema.parse(req.body);
      
      // Authenticate user
      const user = await storage.authenticateUser(username, password);
      if (!user) {
        res.status(401).json({ message: "Invalid username or password" });
        return;
      }
      
      // Set user in session
      req.session.userId = user.id;
      
      // Don't return the password
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      logger.error("Error logging in:", error);
      res.status(400).json({ message: "Invalid login data", error });
    }
  }

  /**
   * Log out a user
   * @param req Express request object
   * @param res Express response object
   */
  async logout(req: Request, res: Response): Promise<void> {
    req.session.destroy((err) => {
      if (err) {
        res.status(500).json({ message: "Failed to logout" });
        return;
      }
      res.status(200).json({ message: "Logged out successfully" });
    });
  }
}

// Create and export the controller instance
export const authController = new AuthController();