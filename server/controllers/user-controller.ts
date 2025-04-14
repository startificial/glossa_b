/**
 * User Controller
 * 
 * Handles HTTP requests related to user management.
 * Processes request input, calls appropriate services, and formats responses.
 */
import { Request, Response } from 'express';
import { userService } from '../services';
import { asyncHandler } from '../middleware/error-handler';
import { insertUserSchema } from '@shared/schema';
import { z } from 'zod';
import { UnauthorizedError } from '../error/api-error';

/**
 * Controller for user-related endpoints
 */
export class UserController {
  /**
   * Get the current authenticated user
   */
  getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.getCurrentUser(req.session.userId);
    
    // Sanitize user data (remove password)
    const safeUser = userService.sanitizeUser(user);
    
    // If we're using auto-login, store user ID in session
    if (!req.session.userId) {
      req.session.userId = user.id;
    }
    
    res.json(safeUser);
  });
  
  /**
   * Register a new user
   */
  registerUser = asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const validatedData = insertUserSchema.parse(req.body);
    
    // Create user
    const user = await userService.createUser(validatedData);
    
    // Set user in session
    req.session.userId = user.id;
    
    // Return sanitized user data
    const safeUser = userService.sanitizeUser(user);
    res.status(201).json(safeUser);
  });
  
  /**
   * Login a user
   */
  loginUser = asyncHandler(async (req: Request, res: Response) => {
    // Define login schema
    const loginSchema = z.object({
      username: z.string(),
      password: z.string()
    });
    
    // Validate request body
    const { username, password } = loginSchema.parse(req.body);
    
    // Authenticate user
    const user = await userService.authenticateUser(username, password);
    
    // Set user in session
    req.session.userId = user.id;
    
    // Return sanitized user data
    const safeUser = userService.sanitizeUser(user);
    res.json(safeUser);
  });
  
  /**
   * Logout the current user
   */
  logoutUser = asyncHandler(async (req: Request, res: Response) => {
    // Destroy the session
    req.session.destroy((err) => {
      if (err) {
        throw err;
      }
      res.status(200).json({ message: "Logged out successfully" });
    });
  });
  
  /**
   * Update the current user's profile
   */
  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    // Ensure user is authenticated
    if (!req.session.userId) {
      throw new UnauthorizedError();
    }
    
    // Create a subset of the insertUserSchema for profile updates
    const updateProfileSchema = insertUserSchema.pick({
      firstName: true,
      lastName: true,
      email: true,
      company: true,
      avatarUrl: true
    });
    
    // Validate the request body
    const validatedData = updateProfileSchema.parse(req.body);
    
    // Update the user
    const user = await userService.updateUser(req.session.userId, validatedData);
    
    // Return sanitized user data
    const safeUser = userService.sanitizeUser(user);
    res.json(safeUser);
  });
}