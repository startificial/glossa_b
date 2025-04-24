/**
 * Route Handler Example Using Repository Pattern
 * 
 * This file demonstrates how to use the repository pattern in Express route handlers.
 * It shows the refactored approach for data access compared to the current implementation.
 */
import { Request, Response } from 'express';
import { repositoryFactory } from '../repositories/repository-factory';
import { z } from 'zod';
import { insertUserSchema } from '@shared/schema';

/**
 * Example of a route handler using the repository pattern directly
 * 
 * This demonstrates the recommended approach after full migration to repositories.
 */
export async function getUserProfileHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      res.status(400).json({ message: "Invalid user ID" });
      return;
    }
    
    // Get the user repository through the factory
    const userRepository = repositoryFactory.getUserRepository();
    
    // Use the repository to fetch the user
    const user = await userRepository.findById(userId);
    
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    
    // Don't return the password in the response
    const { password, ...userProfile } = user;
    
    res.json(userProfile);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Example of a route handler creating a user with the repository pattern
 * 
 * This demonstrates input validation, error handling, and use of repositories.
 */
export async function createUserHandler(req: Request, res: Response): Promise<void> {
  try {
    // Create a validation schema that extends the base schema
    const createUserSchema = insertUserSchema.extend({
      // Add more validation rules as needed
      username: z.string().min(3).max(50),
      email: z.string().email().optional(),
      password: z.string().min(8),
    });
    
    // Validate the request body
    const validationResult = createUserSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      res.status(400).json({ 
        message: "Invalid user data", 
        errors: validationResult.error.format() 
      });
      return;
    }
    
    const userData = validationResult.data;
    
    // Check if the username is already taken
    const userRepository = repositoryFactory.getUserRepository();
    const existingUser = await userRepository.findByUsername(userData.username);
    
    if (existingUser) {
      res.status(409).json({ message: "Username already taken" });
      return;
    }
    
    // If email is provided, check if it's already in use
    if (userData.email) {
      const userWithEmail = await userRepository.findByEmail(userData.email);
      
      if (userWithEmail) {
        res.status(409).json({ message: "Email already in use" });
        return;
      }
    }
    
    // Create the user
    const newUser = await userRepository.create(userData);
    
    // Don't return the password in the response
    const { password, ...userResponse } = newUser;
    
    res.status(201).json(userResponse);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Example of a route handler using multiple repositories
 * 
 * This demonstrates how to use multiple repositories in a single route handler.
 */
export async function getUserWithProjectsHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      res.status(400).json({ message: "Invalid user ID" });
      return;
    }
    
    // Get repositories
    const userRepository = repositoryFactory.getUserRepository();
    const projectRepository = repositoryFactory.getProjectRepository();
    
    // Fetch user and projects in parallel
    const [user, projects] = await Promise.all([
      userRepository.findById(userId),
      projectRepository.findByUserId(userId)
    ]);
    
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    
    // Don't return the password in the response
    const { password, ...userProfile } = user;
    
    // Return user with their projects
    res.json({
      ...userProfile,
      projects
    });
  } catch (error) {
    console.error("Error fetching user with projects:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}