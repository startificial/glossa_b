/**
 * PostgreSQL User Repository Implementation
 * 
 * This file contains the PostgreSQL implementation of the IUserRepository interface.
 * It extends the base PostgreSQL repository and adds user-specific functionality.
 */
import { eq, or } from 'drizzle-orm';
import { type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { users, type User, type InsertUser } from '@shared/schema';
import { IUserRepository } from '../interfaces/user-repository';
import { BasePostgresRepository } from './base-postgres-repository';
import { comparePasswords, hashPassword } from '../../utils/password-utils';

/**
 * PostgreSQL implementation of IUserRepository
 * 
 * Extends the base PostgreSQL repository and implements user-specific methods.
 */
export class PostgresUserRepository 
  extends BasePostgresRepository<User, number, InsertUser>
  implements IUserRepository {
  
  /**
   * Creates a new PostgresUserRepository
   * 
   * @param db - The Drizzle database instance
   */
  constructor(db: PostgresJsDatabase<any>) {
    super(db, users, users.id, 'User');
  }

  /**
   * Find a user by username
   * 
   * @param username - The username to search for
   * @returns The user if found, null otherwise
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
   * Find a user by email address
   * 
   * @param email - The email address to search for
   * @returns The user if found, null otherwise
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
   * Authenticate a user with username/email and password
   * 
   * @param usernameOrEmail - The username or email to authenticate
   * @param password - The plaintext password to verify
   * @returns The authenticated user if successful, null otherwise
   */
  async authenticate(usernameOrEmail: string, password: string): Promise<User | null> {
    try {
      // Look up the user by username or email
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
   * Find a user by password reset token
   * 
   * @param token - The reset token to search for
   * @returns The user if found, null otherwise
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
   * Update a user's password and clear the reset token
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
   * Override create method to handle password hashing
   * 
   * @param userData - The user data to insert
   * @returns The created user
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
   * Override update method to handle password hashing
   * 
   * @param id - The ID of the user to update
   * @param userData - The user data to update
   * @returns The updated user if found, null otherwise
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
}