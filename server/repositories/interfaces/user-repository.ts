/**
 * User Repository Interface
 * 
 * This file defines the user repository interface that extends the base repository
 * with user-specific operations.
 */
import { IBaseRepository } from './base-repository';
import { User, InsertUser } from '@shared/schema';

/**
 * User Repository Interface
 * 
 * Defines operations specific to user entities, extending the base repository
 * with methods for authentication, profile management, and user lookup.
 */
export interface IUserRepository extends IBaseRepository<User, number, InsertUser> {
  /**
   * Find a user by username
   * 
   * @param username - The username to search for
   * @returns The user if found, null otherwise
   */
  findByUsername(username: string): Promise<User | null>;

  /**
   * Find a user by email address
   * 
   * @param email - The email address to search for
   * @returns The user if found, null otherwise
   */
  findByEmail(email: string): Promise<User | null>;
  
  /**
   * Authenticate a user with username/email and password
   * 
   * @param usernameOrEmail - The username or email to authenticate
   * @param password - The plaintext password to verify
   * @returns The authenticated user if successful, null otherwise
   */
  authenticate(usernameOrEmail: string, password: string): Promise<User | null>;
  
  /**
   * Find a user by password reset token
   * 
   * @param token - The reset token to search for
   * @returns The user if found, null otherwise
   */
  findByResetToken(token: string): Promise<User | null>;
  
  /**
   * Save a password reset token for a user
   * 
   * @param userId - The ID of the user
   * @param token - The reset token to save
   * @param expiresAt - The expiration date for the token
   * @returns True if successful, false otherwise
   */
  saveResetToken(userId: number, token: string, expiresAt: Date): Promise<boolean>;
  
  /**
   * Update a user's password and clear the reset token
   * 
   * @param userId - The ID of the user
   * @param newPassword - The new password (already hashed)
   * @returns True if successful, false otherwise
   */
  updatePasswordAndClearToken(userId: number, newPassword: string): Promise<boolean>;
}