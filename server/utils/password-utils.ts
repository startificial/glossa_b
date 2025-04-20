/**
 * Password Utilities
 * 
 * This module provides standardized password hashing and verification
 * functions to ensure consistent password handling across the application.
 */
import { logger } from './logger';

/**
 * Hash a password using bcrypt
 * @param password The plain text password to hash
 * @returns The hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    // Import and use bcrypt directly
    const bcrypt = await import('bcrypt');
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
  } catch (error) {
    logger.error('Error in hashPassword:', error);
    throw new Error('Failed to hash password');
  }
}

/**
 * Compare a supplied password with a stored hashed password
 * @param supplied The plain text password to check
 * @param stored The stored hashed password
 * @returns True if the passwords match, false otherwise
 */
export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  try {
    // Check if the stored password is in bcrypt format (starts with $2a$, $2b$, or $2y$)
    if (stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$')) {
      // Use bcrypt for comparison
      const bcrypt = await import('bcrypt');
      return await bcrypt.compare(supplied, stored);
    } else if (stored.includes('.')) {
      // Legacy format with salt (likely scrypt)
      // This is a fallback for any old passwords still in the system
      const crypto = await import('crypto');
      const { timingSafeEqual } = crypto;
      const scryptAsync = crypto.scrypt;
      
      const promisifyScrypt = async (password: string, salt: string, keylen: number) => {
        return new Promise<Buffer>((resolve, reject) => {
          scryptAsync(password, salt, keylen, (err, derivedKey) => {
            if (err) reject(err);
            else resolve(derivedKey);
          });
        });
      };
      
      const [hashed, salt] = stored.split('.');
      if (!salt) {
        logger.error('Invalid password format in database (no salt found)');
        return false;
      }
      
      const hashedBuf = Buffer.from(hashed, 'hex');
      const suppliedBuf = await promisifyScrypt(supplied, salt, 64);
      return timingSafeEqual(hashedBuf, suppliedBuf);
    } else {
      logger.error('Unrecognized password format');
      return false;
    }
  } catch (error) {
    logger.error('Error in comparePasswords:', error);
    return false;
  }
}