/**
 * PostgreSQL User Repository Implementation
 * 
 * Implements the user repository interface using PostgreSQL and Drizzle ORM.
 */
import { IUserRepository } from '../user-repository';
import { User, InsertUser, users } from '@shared/schema';
import { db } from '../../db';
import { and, desc, eq, or } from 'drizzle-orm';

export class PostgresUserRepository implements IUserRepository {
  /**
   * Find a user by their ID
   */
  async findById(id: number): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      return undefined;
    }
  }
  
  /**
   * Find all users
   */
  async findAll(limit?: number): Promise<User[]> {
    try {
      let query = db.select().from(users).orderBy(desc(users.createdAt));
      
      if (limit) {
        query = query.limit(limit);
      }
      
      return await query;
    } catch (error) {
      console.error('Error fetching all users:', error);
      return [];
    }
  }
  
  /**
   * Create a new user
   */
  async create(data: InsertUser): Promise<User> {
    try {
      const result = await db.insert(users).values(data).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error(`Failed to create user: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Update an existing user
   */
  async update(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    try {
      const result = await db.update(users)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error('Error updating user:', error);
      return undefined;
    }
  }
  
  /**
   * Delete a user by ID
   */
  async delete(id: number): Promise<boolean> {
    try {
      const result = await db.delete(users).where(eq(users.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }
  
  /**
   * Find a user by username
   */
  async findByUsername(username: string): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error fetching user by username:', error);
      return undefined;
    }
  }
  
  /**
   * Find a user by email
   */
  async findByEmail(email: string): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error fetching user by email:', error);
      return undefined;
    }
  }
  
  /**
   * Authenticate a user with username/email and password
   */
  async authenticate(usernameOrEmail: string, password: string): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(
        and(
          or(
            eq(users.username, usernameOrEmail),
            eq(users.email, usernameOrEmail)
          ),
          eq(users.password, password) // In a real app, this would involve hashing
        )
      ).limit(1);
      
      return result[0];
    } catch (error) {
      console.error('Error authenticating user:', error);
      return undefined;
    }
  }
  
  /**
   * Find users who were invited by a specific user
   */
  async findByInviter(inviterId: number): Promise<User[]> {
    try {
      return await db.select().from(users).where(eq(users.invitedBy, inviterId));
    } catch (error) {
      console.error('Error fetching users by inviter:', error);
      return [];
    }
  }
}