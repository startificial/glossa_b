/**
 * Password Utility Functions
 * 
 * Provides functions for hashing and comparing passwords using bcrypt.
 */
import bcrypt from 'bcrypt';
import { logger } from '../logger';

/**
 * Hash a password using bcrypt
 * @param password The plain text password to hash
 * @returns The bcrypt hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  try {
    return await bcrypt.hash(password, saltRounds);
  } catch (error) {
    logger.error('Error hashing password:', error);
    throw new Error('Failed to hash password');
  }
}

/**
 * Compare a supplied password with a stored hashed password
 * @param supplied The plain text password to check
 * @param stored The stored bcrypt hashed password
 * @returns True if the passwords match, false otherwise
 */
export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  try {
    return await bcrypt.compare(supplied, stored);
  } catch (error) {
    logger.error('Error comparing passwords:', error);
    return false;
  }
}