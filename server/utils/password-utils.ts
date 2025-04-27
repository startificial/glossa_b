/**
 * Password Utilities
 * 
 * This file contains utility functions for password hashing and verification.
 */
import bcrypt from 'bcrypt';

// Number of salt rounds for bcrypt
const SALT_ROUNDS = 10;

/**
 * Hash a password using bcrypt
 * 
 * @param password - The plain text password to hash
 * @returns The hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a plain text password with a hash
 * 
 * @param password - The plain text password to check
 * @param hash - The hash to compare against
 * @returns True if the password matches the hash, false otherwise
 */
export async function comparePasswords(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a random token for password reset
 * 
 * @returns A random token string
 */
export function generateResetToken(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * Calculate token expiration date
 * 
 * @param hours - Number of hours before token expiration
 * @returns Date object set to the expiration time
 */
export function calculateTokenExpiration(hours: number = 24): Date {
  const expirationDate = new Date();
  expirationDate.setHours(expirationDate.getHours() + hours);
  return expirationDate;
}