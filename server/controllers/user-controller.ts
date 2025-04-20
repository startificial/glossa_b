import { Request, Response } from 'express';
import { UserService } from '../services/user-service';
import { logger } from '../utils/logger';
import { z } from 'zod';

/**
 * Controller handling user-related operations
 */
export class UserController {
  constructor(private userService: UserService) {}

  /**
   * Request a password reset
   * @param req Express request object
   * @param res Express response object
   */
  async requestPasswordReset(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const schema = z.object({
        username: z.string().min(1, "Username is required"),
        email: z.string().email("Invalid email format"),
      });

      const result = schema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: result.error.issues
        });
        return;
      }

      const { username, email } = result.data;
      
      // Get origin URL for the reset link
      const originUrl = req.headers.origin || undefined;
      
      // Process password reset request
      const resetResult = await this.userService.requestPasswordReset(
        username,
        email,
        originUrl
      );
      
      // Always return 200 even if user/email not found to prevent user enumeration
      res.status(200).json({
        success: resetResult.success,
        message: resetResult.message
      });
    } catch (error) {
      logger.error('Error in requestPasswordReset controller:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while processing your request.'
      });
    }
  }

  /**
   * Verify reset token validity
   * @param req Express request object
   * @param res Express response object
   */
  async verifyResetToken(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;
      
      if (!token) {
        res.status(400).json({
          success: false,
          message: 'Reset token is required'
        });
        return;
      }
      
      // Find user by reset token
      const user = await this.userService.getUserByResetToken(token);
      
      // Check if user exists and token is valid
      if (!user || !user.resetPasswordToken || !user.resetPasswordExpires) {
        res.status(400).json({
          success: false,
          message: 'Invalid or expired reset token'
        });
        return;
      }
      
      // Check if token is expired
      if (new Date() > user.resetPasswordExpires) {
        res.status(400).json({
          success: false,
          message: 'Reset token has expired'
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        message: 'Reset token is valid',
        username: user.username
      });
    } catch (error) {
      logger.error('Error in verifyResetToken controller:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while processing your request.'
      });
    }
  }

  /**
   * Reset user password
   * @param req Express request object
   * @param res Express response object
   */
  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const schema = z.object({
        token: z.string().min(1, "Reset token is required"),
        password: z.string().min(8, "Password must be at least 8 characters")
      });

      const result = schema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: result.error.issues
        });
        return;
      }

      const { token, password } = result.data;
      
      // Reset the password
      const resetResult = await this.userService.resetPassword(token, password);
      
      // Return appropriate response
      if (resetResult.success) {
        res.status(200).json({
          success: true,
          message: resetResult.message
        });
      } else {
        res.status(400).json({
          success: false,
          message: resetResult.message
        });
      }
    } catch (error) {
      logger.error('Error in resetPassword controller:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while processing your request.'
      });
    }
  }
}