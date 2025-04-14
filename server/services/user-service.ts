/**
 * User Service
 * 
 * Handles business logic related to user management.
 * Acts as intermediary between controllers and repositories.
 */
import { User, InsertUser } from '@shared/schema';
import { repositoryFactory } from '../repositories/repository-factory';
import { 
  BadRequestError, 
  NotFoundError, 
  ConflictError 
} from '../error/api-error';

/**
 * User Service provides business logic for user-related operations
 */
export class UserService {
  private userRepository = repositoryFactory.getUserRepository();
  
  /**
   * Get a user by ID
   * @param id User ID
   * @throws NotFoundError if user does not exist
   */
  async getUserById(id: number): Promise<User> {
    const user = await this.userRepository.findById(id);
    
    if (!user) {
      throw new NotFoundError(`User with ID ${id} not found`);
    }
    
    return user;
  }
  
  /**
   * Get a user by username without throwing if not found
   * @param username Username to look up
   */
  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.userRepository.findByUsername(username);
  }
  
  /**
   * Get a user by email without throwing if not found
   * @param email Email to look up
   */
  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.userRepository.findByEmail(email);
  }
  
  /**
   * Authenticate a user with username/email and password
   * @param usernameOrEmail Username or email
   * @param password Password
   * @throws UnauthorizedError if credentials are invalid
   */
  async authenticateUser(usernameOrEmail: string, password: string): Promise<User> {
    const user = await this.userRepository.authenticate(usernameOrEmail, password);
    
    if (!user) {
      throw new BadRequestError('Invalid username/email or password');
    }
    
    return user;
  }
  
  /**
   * Create a new user
   * @param userData User data to create
   * @throws ConflictError if username or email already exists
   */
  async createUser(userData: InsertUser): Promise<User> {
    // Check if username already exists
    const existingUsername = await this.userRepository.findByUsername(userData.username);
    if (existingUsername) {
      throw new ConflictError('Username already exists');
    }
    
    // Check if email already exists (if provided)
    if (userData.email) {
      const existingEmail = await this.userRepository.findByEmail(userData.email);
      if (existingEmail) {
        throw new ConflictError('Email already exists');
      }
    }
    
    // Create the user
    return this.userRepository.create(userData);
  }
  
  /**
   * Update a user
   * @param id User ID
   * @param userData Data to update
   * @throws NotFoundError if user does not exist
   */
  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User> {
    // Check if user exists
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new NotFoundError(`User with ID ${id} not found`);
    }
    
    // If email is being changed, check for conflicts
    if (userData.email && userData.email !== existingUser.email) {
      const existingEmail = await this.userRepository.findByEmail(userData.email);
      if (existingEmail) {
        throw new ConflictError('Email already exists');
      }
    }
    
    // Update the user
    const updatedUser = await this.userRepository.update(id, userData);
    
    // This should never happen if we checked existence above
    if (!updatedUser) {
      throw new NotFoundError(`User with ID ${id} not found during update`);
    }
    
    return updatedUser;
  }
  
  /**
   * Get users who were invited by a specific user
   * @param inviterId ID of the user who invited others
   */
  async getUsersByInviter(inviterId: number): Promise<User[]> {
    return this.userRepository.findByInviter(inviterId);
  }
  
  /**
   * Get user for the current session (with auto-login for demo)
   * @param sessionUserId User ID from session
   */
  async getCurrentUser(sessionUserId?: number): Promise<User> {
    // If session has a user ID, return that user
    if (sessionUserId) {
      try {
        return await this.getUserById(sessionUserId);
      } catch (error) {
        // If user not found, fall back to demo user
        console.warn('Session user not found, falling back to demo user');
      }
    }
    
    // Auto-login as demo user (for demo purposes only)
    const demoUser = await this.getUserByUsername('demo');
    if (!demoUser) {
      throw new NotFoundError('Demo user not found');
    }
    
    return demoUser;
  }
  
  /**
   * Remove sensitive information from user object
   * @param user User object
   */
  sanitizeUser(user: User): Omit<User, 'password'> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...sanitizedUser } = user;
    return sanitizedUser;
  }
}