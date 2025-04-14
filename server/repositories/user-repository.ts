/**
 * User Repository Interface
 * 
 * Defines the operations specific to user management beyond the base repository.
 */
import { User, InsertUser } from '@shared/schema';
import { IBaseRepository } from './base-repository';

export interface IUserRepository extends IBaseRepository<User, InsertUser, Partial<InsertUser>> {
  /**
   * Find a user by username
   */
  findByUsername(username: string): Promise<User | undefined>;
  
  /**
   * Find a user by email
   */
  findByEmail(email: string): Promise<User | undefined>;
  
  /**
   * Authenticate a user with username/email and password
   */
  authenticate(usernameOrEmail: string, password: string): Promise<User | undefined>;
  
  /**
   * Find users who were invited by a specific user
   */
  findByInviter(inviterId: number): Promise<User[]>;
}