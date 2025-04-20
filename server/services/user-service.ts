import { IStorage } from '../storage';
import { User } from '@shared/schema';
import { TokenGenerator } from '../utils/token-generator';
import { logger } from '../utils/logger';
import { sendPasswordResetEmail } from './email-service';

/**
 * Service for user-related operations
 */
export class UserService {
  constructor(private storage: IStorage) {}

  /**
   * Get a user by their ID
   * @param id The user ID
   * @returns The user object or null if not found
   */
  async getUser(id: number): Promise<User | null> {
    return this.storage.getUser(id);
  }

  /**
   * Get a user by their username
   * @param username The username
   * @returns The user object or null if not found
   */
  async getUserByUsername(username: string): Promise<User | null> {
    return this.storage.getUserByUsername(username);
  }

  /**
   * Get a user by their email address
   * @param email The email address
   * @returns The user object or null if not found
   */
  async getUserByEmail(email: string): Promise<User | null> {
    return this.storage.getUserByEmail(email);
  }

  /**
   * Get a user by their reset token
   * @param token The reset token
   * @returns The user object or null if not found
   */
  async getUserByResetToken(token: string): Promise<User | null> {
    return this.storage.getUserByResetToken(token);
  }
  
  /**
   * Set a password reset token for a user
   * @param userId The user ID
   * @param token The reset token
   * @param expiresAt The token expiration date
   * @returns Boolean indicating success
   */
  async setPasswordResetToken(userId: number, token: string, expiresAt: Date): Promise<boolean> {
    return await this.storage.saveResetToken(userId, token, expiresAt);
  }

  /**
   * Request a password reset for a user
   * This checks if the username and email match before sending a reset email
   * 
   * @param username The username of the account
   * @param email The email address provided by the user
   * @param originUrl Optional origin URL for the reset link
   * @returns Object with success status and message
   */
  async requestPasswordReset(
    username: string, 
    email: string, 
    originUrl?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Find the user by username
      const user = await this.getUserByUsername(username);
      
      // If no user found or email doesn't match, return generic message
      // This prevents email enumeration attacks while still providing user feedback
      if (!user || !user.email || user.email !== email) {
        logger.warn(`Password reset rejected - username: ${username}, email: ${email}`);
        return { 
          success: false, 
          message: 'If a matching account was found, a password reset email has been sent.' 
        };
      }
      
      // Generate a secure token and expiration date
      const resetToken = TokenGenerator.generateToken();
      const expiresAt = TokenGenerator.generateExpirationDate(1); // 1 hour
      
      // Save the token to the user record
      const tokenSaved = await this.storage.saveResetToken(user.id, resetToken, expiresAt);
      if (!tokenSaved) {
        logger.error(`Failed to save reset token for user: ${username}`);
        return {
          success: false,
          message: 'An error occurred while processing your request. Please try again later.'
        };
      }
      
      // Send the password reset email
      const emailSent = await sendPasswordResetEmail(user.email, user.username, resetToken, originUrl);
      
      if (!emailSent) {
        logger.error(`Failed to send password reset email to: ${user.email}`);
        // Reset the token if email sending fails
        await this.storage.updateUser(user.id, {
          resetPasswordToken: null,
          resetPasswordExpires: null
        });
        
        return {
          success: false,
          message: 'An error occurred while sending the reset email. Please try again later.'
        };
      }
      
      logger.info(`Password reset requested for user: ${username}`);
      return {
        success: true,
        message: 'If a matching account was found, a password reset email has been sent.'
      };
    } catch (error) {
      logger.error('Error in requestPasswordReset:', error);
      return {
        success: false,
        message: 'An error occurred while processing your request. Please try again later.'
      };
    }
  }

  /**
   * Reset a user's password using a valid reset token
   * @param token The reset token
   * @param newPassword The new password (already hashed)
   * @returns Object with success status and message
   */
  async resetPassword(
    token: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string; userId?: number }> {
    try {
      // Find the user by reset token
      const user = await this.getUserByResetToken(token);
      
      // If no user is found or token doesn't exist
      if (!user || !user.resetPasswordToken) {
        logger.warn(`Invalid reset token used: ${token}`);
        return {
          success: false,
          message: 'Invalid or expired password reset token.'
        };
      }
      
      // Check if the token is expired
      if (user.resetPasswordExpires && TokenGenerator.isTokenExpired(user.resetPasswordExpires)) {
        logger.warn(`Expired reset token used for user ID: ${user.id}`);
        
        // Clear the expired token
        await this.storage.updateUser(user.id, {
          resetPasswordToken: null,
          resetPasswordExpires: null
        });
        
        return {
          success: false,
          message: 'Password reset link has expired. Please request a new one.'
        };
      }
      
      logger.info(`Resetting password for user ID: ${user.id} using direct SQL method`);
      
      // Update the password and clear the reset token using direct SQL
      const updated = await this.storage.updatePasswordAndClearToken(user.id, newPassword);
      
      if (!updated) {
        logger.error(`Failed to update password for user ID: ${user.id}`);
        return {
          success: false,
          message: 'Failed to update password. Please try again later.'
        };
      }
      
      logger.info(`Password reset successful for user ID: ${user.id}`);
      return {
        success: true,
        message: 'Your password has been updated successfully.',
        userId: user.id
      };
    } catch (error) {
      logger.error('Error in resetPassword:', error);
      return {
        success: false,
        message: 'An error occurred while processing your request. Please try again later.'
      };
    }
  }
}