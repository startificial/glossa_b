import { randomBytes } from 'crypto';
import { logger } from './logger';

/**
 * Utility class for generating and validating secure tokens
 * Used for password reset tokens, email verification, etc.
 */
export class TokenGenerator {
  /**
   * Generate a secure random token
   * @param bytes Number of random bytes to use (default: 32)
   * @returns A random hex string token
   */
  static generateToken(bytes: number = 32): string {
    try {
      return randomBytes(bytes).toString('hex');
    } catch (error) {
      logger.error('Error generating token:', error);
      // Fallback in case of error
      return randomBytes(16).toString('hex') + Date.now().toString(36);
    }
  }

  /**
   * Generate an expiration date for a token
   * @param hoursValid Number of hours the token should be valid (default: 1)
   * @returns Date object representing when the token expires
   */
  static generateExpirationDate(hoursValid: number = 1): Date {
    const expirationTime = new Date();
    expirationTime.setHours(expirationTime.getHours() + hoursValid);
    return expirationTime;
  }

  /**
   * Check if a token is expired
   * @param expirationDate The expiration date to check against
   * @returns True if the token is expired, false otherwise
   */
  static isTokenExpired(expirationDate: Date | null | undefined): boolean {
    if (!expirationDate) {
      return true;
    }
    return new Date() > new Date(expirationDate);
  }
}