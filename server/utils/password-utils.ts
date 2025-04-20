/**
 * Password Utilities
 * 
 * This module provides functions for hashing and comparing passwords
 * using bcrypt for secure password storage and verification.
 */
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/**
 * Hash a password with bcrypt
 * @param password The plain text password to hash
 * @returns A promise that resolves to the hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a plain text password with a hashed password
 * @param plainPassword The plain text password to check
 * @param hashedPassword The hashed password to compare against
 * @returns A promise that resolves to true if the passwords match, false otherwise
 */
export async function comparePasswords(plainPassword: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}