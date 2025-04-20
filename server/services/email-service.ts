import { MailService } from '@sendgrid/mail';
import { logger } from '../utils/logger';

// Initialize SendGrid mail service if API key is available
const mailService = new MailService();

if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  logger.warn('SendGrid API key not found. Email functionality will be disabled.');
}

/**
 * Send a password reset email to a user
 * 
 * @param email The recipient's email address
 * @param username The username of the account
 * @param token The reset token to include in the email
 * @param originUrl Optional origin URL for the reset link
 * @returns Boolean indicating whether the email was sent successfully
 */
export async function sendPasswordResetEmail(
  email: string,
  username: string,
  token: string,
  originUrl?: string
): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    logger.warn('Cannot send password reset email: SendGrid API key not configured');
    return false;
  }

  try {
    // Build the reset URL
    const resetUrl = originUrl 
      ? `${originUrl}?reset_token=${token}` 
      : `https://${process.env.REPLIT_DOMAIN || 'app.example.com'}/auth?reset_token=${token}`;
    
    // Email content with HTML and text versions
    const mailOptions = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@glossaapp.com',
      subject: 'Password Reset Request - Glossa',
      text: `
        Hello ${username},

        You recently requested to reset your password for your Glossa account. Click the link below to reset it:
        
        ${resetUrl}
        
        If you did not request a password reset, please ignore this email or contact support if you have concerns.
        
        This link is only valid for 60 minutes.
        
        Thanks,
        The Glossa Team
      `,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>Hello ${username},</p>
          <p>You recently requested to reset your password for your Glossa account. Click the button below to reset it:</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #5E4FDB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Your Password</a>
          </p>
          <p>If the button above doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px;">${resetUrl}</p>
          <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
          <p><strong>This link is only valid for 60 minutes.</strong></p>
          <hr style="border: 1px solid #eee; margin: 30px 0;" />
          <p style="color: #666; font-size: 12px;">Thanks,<br />The Glossa Team</p>
        </div>
      `,
    };
    
    // Send the email
    await mailService.send(mailOptions);
    logger.info(`Password reset email sent to ${email}`);
    return true;
  } catch (error) {
    logger.error('Failed to send password reset email:', error);
    return false;
  }
}