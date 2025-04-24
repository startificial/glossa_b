/**
 * PostgreSQL User Repository Implementation
 * 
 * This file contains the PostgreSQL implementation of the IUserRepository interface.
 * It provides type-safe data access logic for user-related operations.
 */
import { eq, or, and } from 'drizzle-orm';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import { users, type User, type InsertUser } from '@shared/schema';
import type { IUserRepository } from '../user-repository';
import { comparePasswords, hashPassword } from '../../utils/password-utils';

/**
 * PostgreSQL implementation of IUserRepository
 * 
 * This class provides PostgreSQL-specific data access methods for user entities.
 * It encapsulates all SQL construction and database interactions behind
 * a clean, domain-specific interface.
 */
export class PostgresUserRepository implements IUserRepository {
  /**
   * Creates a new instance of PostgresUserRepository
   * 
   * @param db - The Drizzle database instance for PostgreSQL
   */
  constructor(private readonly db: PgDatabase) {}

  /**
   * Find a user by their ID
   * 
   * @param id - The user ID to look up
   * @returns The user object if found, or null if not found
   */
  async findById(id: number): Promise<User | null> {
    try {
      const result = await this.db.select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      
      return result[0] || null;
    } catch (error) {
      this.handleError('findById', error);
      return null;
    }
  }

  /**
   * Find all users in the system
   * 
   * @param limit - Optional limit on the number of users to return
   * @returns Array of user objects
   */
  async findAll(limit?: number): Promise<User[]> {
    try {
      const query = this.db.select()
        .from(users)
        .orderBy(users.username);
      
      if (limit) {
        query.limit(limit);
      }
      
      return await query;
    } catch (error) {
      this.handleError('findAll', error);
      return [];
    }
  }

  /**
   * Find a user by their username
   * 
   * @param username - The username to look up
   * @returns The user object if found, or null if not found
   */
  async findByUsername(username: string): Promise<User | null> {
    try {
      const result = await this.db.select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);
      
      return result[0] || null;
    } catch (error) {
      this.handleError('findByUsername', error);
      return null;
    }
  }

  /**
   * Find a user by their email address
   * 
   * @param email - The email address to look up
   * @returns The user object if found, or null if not found
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      const result = await this.db.select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      
      return result[0] || null;
    } catch (error) {
      this.handleError('findByEmail', error);
      return null;
    }
  }

  /**
   * Find a user by their password reset token
   * 
   * @param token - The reset token to search for
   * @returns The user object if found, or null if not found
   */
  async findByResetToken(token: string): Promise<User | null> {
    try {
      const result = await this.db.select()
        .from(users)
        .where(eq(users.resetPasswordToken, token))
        .limit(1);
      
      return result[0] || null;
    } catch (error) {
      this.handleError('findByResetToken', error);
      return null;
    }
  }

  /**
   * Create a new user
   * 
   * @param userData - The user data to insert
   * @returns The created user object
   * @throws Error if the user creation fails
   */
  async create(userData: InsertUser): Promise<User> {
    try {
      // Hash the password before storing
      const hashedPassword = await hashPassword(userData.password);
      
      // Create the user with the hashed password
      const [newUser] = await this.db.insert(users)
        .values({
          ...userData,
          password: hashedPassword
        })
        .returning();
      
      return newUser;
    } catch (error) {
      this.handleError('create', error);
      throw new Error('Failed to create user');
    }
  }

  /**
   * Update an existing user
   * 
   * @param id - The ID of the user to update
   * @param userData - The user data to update
   * @returns The updated user object, or null if not found
   */
  async update(id: number, userData: Partial<InsertUser>): Promise<User | null> {
    try {
      let dataToUpdate = { ...userData, updatedAt: new Date() };
      
      // If password is being updated, hash it
      if (userData.password) {
        const hashedPassword = await hashPassword(userData.password);
        dataToUpdate = { ...dataToUpdate, password: hashedPassword };
      }
      
      const [updatedUser] = await this.db.update(users)
        .set(dataToUpdate)
        .where(eq(users.id, id))
        .returning();
      
      return updatedUser || null;
    } catch (error) {
      this.handleError('update', error);
      return null;
    }
  }

  /**
   * Delete a user
   * 
   * @param id - The ID of the user to delete
   * @returns True if successful, false otherwise
   */
  async delete(id: number): Promise<boolean> {
    try {
      const result = await this.db.delete(users)
        .where(eq(users.id, id))
        .returning({ id: users.id });
      
      return result.length > 0;
    } catch (error) {
      this.handleError('delete', error);
      return false;
    }
  }

  /**
   * Authenticate a user by username/email and password
   * 
   * @param usernameOrEmail - The username or email to authenticate
   * @param password - The password to verify
   * @returns The authenticated user object if successful, or null if authentication fails
   */
  async authenticate(usernameOrEmail: string, password: string): Promise<User | null> {
    try {
      // First, look up the user by username or email
      const result = await this.db.select()
        .from(users)
        .where(
          or(
            eq(users.username, usernameOrEmail),
            eq(users.email, usernameOrEmail)
          )
        )
        .limit(1);
      
      const user = result[0];
      
      // If no user is found, return null
      if (!user) {
        return null;
      }
      
      // Verify the password
      const passwordMatches = await comparePasswords(password, user.password);
      
      // If password doesn't match, return null
      if (!passwordMatches) {
        return null;
      }
      
      // Password matches, return the user
      return user;
    } catch (error) {
      this.handleError('authenticate', error);
      return null;
    }
  }

  /**
   * Save a password reset token for a user
   * 
   * @param userId - The ID of the user
   * @param token - The reset token to save
   * @param expiresAt - The expiration date for the token
   * @returns True if successful, false otherwise
   */
  async saveResetToken(userId: number, token: string, expiresAt: Date): Promise<boolean> {
    try {
      await this.db.update(users)
        .set({ 
          resetPasswordToken: token,
          resetPasswordExpires: expiresAt,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
      
      return true;
    } catch (error) {
      this.handleError('saveResetToken', error);
      return false;
    }
  }

  /**
   * Update a user's password and clear their reset token
   * 
   * @param userId - The ID of the user
   * @param newPassword - The new password (already hashed)
   * @returns True if successful, false otherwise
   */
  async updatePasswordAndClearToken(userId: number, newPassword: string): Promise<boolean> {
    try {
      const [result] = await this.db.update(users)
        .set({
          password: newPassword,
          resetPasswordToken: null,
          resetPasswordExpires: null,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning({ id: users.id });
      
      return !!result;
    } catch (error) {
      this.handleError('updatePasswordAndClearToken', error);
      return false;
    }
  }

  /**
   * Handle database errors consistently
   * 
   * @param operation - The name of the operation that failed
   * @param error - The error that occurred
   */
  private handleError(operation: string, error: unknown): void {
    // Log the error with context about which operation failed
    console.error(`UserRepository.${operation} error:`, error);
    
    // In a production system, you might want to:
    // 1. Log to a proper logging service
    // 2. Capture detailed diagnostics
    // 3. Categorize errors (e.g., db connection vs. constraint violation)
    // 4. Alert on critical failures
  }
}