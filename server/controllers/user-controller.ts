import { Request, Response } from 'express';
import { storage } from '../storage';
import { logger } from '../utils/logger';
import { insertUserSchema } from '@shared/schema';

/**
 * Controller for user-related operations
 */
export class UserController {
  /**
   * Get the current authenticated user
   * @param req Express request object
   * @param res Express response object
   */
  async getCurrentUser(req: Request, res: Response): Promise<Response> {
    try {
      // Check if user is authenticated
      if (req.session && req.session.userId) {
        const user = await storage.getUser(req.session.userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        
        // Don't return the password
        const { password, ...userWithoutPassword } = user;
        return res.json(userWithoutPassword);
      }
      
      // Return 401 if not authenticated
      return res.status(401).json({ message: "Unauthorized" });
    } catch (error) {
      logger.error("Error getting current user:", error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  /**
   * Get the current authenticated user with fallback to demo user
   * @param req Express request object
   * @param res Express response object
   */
  async getCurrentUserWithFallback(req: Request, res: Response): Promise<Response> {
    try {
      // Check if user is authenticated
      if (req.session && req.session.userId) {
        const user = await storage.getUser(req.session.userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        
        // Don't return the password
        const { password, ...userWithoutPassword } = user;
        return res.json(userWithoutPassword);
      }
      
      // Import DEMO_USER_CONFIG for centralized configuration
      const { DEMO_USER_CONFIG, ENV_CONFIG } = await import('@shared/config');
      
      // Only auto-login as demo user if enabled in config
      if (DEMO_USER_CONFIG.ENABLED && DEMO_USER_CONFIG.AUTO_LOGIN) {
        // Find demo user by configured username
        const demoUser = await storage.getUserByUsername(DEMO_USER_CONFIG.USERNAME);
        if (!demoUser) {
          return res.status(404).json({ message: "Demo user not found" });
        }
        
        // Check if this is actually a demo user
        if (!demoUser.isDemo) {
          logger.warn(`User with username ${DEMO_USER_CONFIG.USERNAME} exists but is not marked as a demo user`);
        }

        // Set user in session
        req.session.userId = demoUser.id;
        
        // Don't return the password
        const { password, ...userWithoutPassword } = demoUser;
        return res.json(userWithoutPassword);
      }
      
      // No auto-login if feature is disabled
      return res.status(401).json({ message: "Not authenticated" });
    } catch (error) {
      logger.error("Error getting current user with fallback:", error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  /**
   * Update the current user's profile
   * @param req Express request object
   * @param res Express response object
   */
  async updateProfile(req: Request, res: Response): Promise<Response> {
    try {
      // Get user from session
      if (!req.session.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Create a subset of the updateUserSchema
      const updateProfileSchema = insertUserSchema.pick({
        firstName: true,
        lastName: true,
        email: true,
        company: true,
        avatarUrl: true
      });
      
      // Validate the incoming data
      const validatedData = updateProfileSchema.parse(req.body);
      
      // Update the user
      const updatedUser = await storage.updateUser(user.id, validatedData);
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update user" });
      }
      
      // Don't return the password
      const { password, ...userWithoutPassword } = updatedUser;
      return res.json(userWithoutPassword);
    } catch (error) {
      logger.error("Error updating user profile:", error);
      return res.status(400).json({ message: "Invalid profile data", error });
    }
  }
}

// Create and export the controller instance
export const userController = new UserController();