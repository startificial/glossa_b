import { Request, Response, NextFunction, Express } from 'express';
import { storage } from '../storage';
import { z } from 'zod';
import { insertUserSchema } from '@shared/schema';
import { hashPassword } from '../utils/password-utils';

/**
 * Check if a user is an admin
 */
export const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const user = await storage.getUser(req.session.userId);
  if (!user) {
    return res.status(401).json({ message: 'User not found' });
  }

  if (user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Admin access required' });
  }

  next();
};

/**
 * Register admin routes with the Express application
 * @param app Express application instance
 */
export function registerAdminRoutes(app: Express): void {
  /**
   * @route GET /api/admin/users
   * @desc Get all users (admin only)
   * @access Private (admin)
   */
  app.get('/api/admin/users', isAdmin, async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      
      // Don't return passwords in the response
      const usersWithoutPasswords = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      res.json(usersWithoutPasswords);
    } catch (error) {
      console.error('Error fetching all users:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  /**
   * @route POST /api/admin/users
   * @desc Create a new user (admin only)
   * @access Private (admin)
   */
  app.post('/api/admin/users', isAdmin, async (req: Request, res: Response) => {
    try {
      // Validate input data
      const validatedData = insertUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }
      
      // Check if email already exists
      if (validatedData.email) {
        const existingEmail = await storage.getUserByEmail(validatedData.email);
        if (existingEmail) {
          return res.status(400).json({ message: 'Email already exists' });
        }
      }

      // Set the invitedBy field to the current admin user's ID
      validatedData.invitedBy = req.session.userId;
      
      // Create the user
      const user = await storage.createUser(validatedData);
      
      // Don't return the password in the response
      const { password, ...userWithoutPassword } = user;
      
      // Return success response
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error('Error creating user:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Invalid user data', 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: 'Failed to create user' });
    }
  });
}