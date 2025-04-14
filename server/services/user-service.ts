/**
 * User Service
 * 
 * Handles business logic related to user management.
 */
import { UserRepository } from '../repositories/base-repository';
import { User, InsertUser } from '@shared/schema';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../error/api-error';
import bcrypt from 'bcrypt';

/**
 * Service for managing users
 */
export class UserService {
  private userRepository: UserRepository;
  
  /**
   * Create a UserService instance
   * @param userRepository Repository for user data access
   */
  constructor(userRepository: UserRepository) {
    this.userRepository = userRepository;
  }
  
  /**
   * Sanitize a user object by removing sensitive fields
   * @param user User object to sanitize
   * @returns User without password
   */
  sanitizeUser(user: User): Omit<User, 'password'> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...safeUser } = user;
    return safeUser;
  }
  
  /**
   * Create a new user
   * @param userData User data to create
   * @returns Created user
   */
  async createUser(userData: InsertUser): Promise<User> {
    // Check if username already exists
    const existingUser = await this.userRepository.findByUsername(userData.username);
    if (existingUser) {
      throw new BadRequestError('Username already exists');
    }
    
    // Hash password before storing
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    // Create user with hashed password
    const user = await this.userRepository.create({
      ...userData,
      password: hashedPassword
    });
    
    return user;
  }
  
  /**
   * Authenticate a user
   * @param username Username to authenticate
   * @param password Password to verify
   * @returns Authenticated user
   */
  async authenticateUser(username: string, password: string): Promise<User> {
    // Find user by username
    const user = await this.userRepository.findByUsername(username);
    if (!user) {
      throw new UnauthorizedError('Invalid username or password');
    }
    
    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid username or password');
    }
    
    return user;
  }
  
  /**
   * Get the current user (used for /api/me endpoint)
   * If no userId is provided, return the demo user
   * @param userId ID of the current user
   * @returns Current user
   */
  async getCurrentUser(userId?: number): Promise<User> {
    if (userId) {
      // Get user by ID
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }
      return user;
    } else {
      // Return demo user (ID = 1)
      const demoUser = await this.userRepository.findById(1);
      if (!demoUser) {
        throw new NotFoundError('Demo user not found');
      }
      return demoUser;
    }
  }
  
  /**
   * Update a user
   * @param userId ID of the user to update
   * @param userData User data to update
   * @returns Updated user
   */
  async updateUser(userId: number, userData: Partial<User>): Promise<User> {
    // Get existing user
    const existingUser = await this.userRepository.findById(userId);
    if (!existingUser) {
      throw new NotFoundError('User not found');
    }
    
    // Don't allow changing password through this method
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...updateData } = userData;
    
    // Update user
    const updatedUser = await this.userRepository.update(userId, updateData);
    
    return updatedUser;
  }
}