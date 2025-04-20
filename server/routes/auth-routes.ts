import { Express, Request, Response } from 'express';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import session from 'express-session';
import { storage } from '../storage';
import { logger } from '../logger';
import { User } from '@shared/schema';
import { UserService } from '../services/user-service';
import { sendPasswordResetEmail } from '../services/email-service';
import { TokenGenerator } from '../utils/token-generator';
import { hashPassword, comparePasswords } from '../utils/password-utils';

// Initialize user service
const userService = new UserService(storage);

/**
 * Set up authentication routes and middleware
 * @param app Express application instance
 */
export function setupAuth(app: Express): void {
  // Session configuration
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'default-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    }
  };

  // Initialize session and passport
  app.set('trust proxy', 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure Passport local strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`[DEBUG] Attempting login for username: ${username}`);
        const user = await storage.getUserByUsername(username);
        
        if (!user) {
          console.log(`[DEBUG] User ${username} not found`);
          return done(null, false);
        }
        
        console.log(`[DEBUG] User found, password format: ${user.password.substring(0, 10)}...`);
        const passwordValid = await comparePasswords(password, user.password);
        console.log(`[DEBUG] Password validation result: ${passwordValid}`);
        
        if (!passwordValid) {
          return done(null, false);
        }
        
        return done(null, user);
      } catch (error) {
        logger.error('Authentication error:', error);
        return done(error);
      }
    })
  );

  // Serialize user to the session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user from the session
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      logger.error('Error deserializing user:', error);
      done(error);
    }
  });

  // Login route
  app.post('/api/login', (req, res, next) => {
    passport.authenticate('local', (err: any, user: User | false, info: any) => {
      if (err) {
        logger.error('Login error:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }
      
      if (!user) {
        return res.status(401).json({ message: 'Invalid username or password' });
      }
      
      req.login(user, (err) => {
        if (err) {
          logger.error('Session error:', err);
          return res.status(500).json({ message: 'Internal server error' });
        }
        return res.status(200).json(user);
      });
    })(req, res, next);
  });

  // Logout route
  app.post('/api/logout', (req, res) => {
    const wasAuthenticated = req.isAuthenticated();
    req.logout((err) => {
      if (err) {
        logger.error('Logout error:', err);
        return res.status(500).json({ message: 'Error during logout' });
      }
      
      if (wasAuthenticated) {
        logger.info('User logged out successfully');
        res.status(200).json({ message: 'Logged out successfully' });
      } else {
        res.status(200).json({ message: 'No active session' });
      }
    });
  });

  // Get current user route
  app.get('/api/user', (req, res) => {
    if (req.isAuthenticated()) {
      res.status(200).json(req.user);
    } else {
      res.status(401).json({ message: 'Not authenticated' });
    }
  });
  
  // User registration via invite only
  app.post('/api/register', async (req, res) => {
    try {
      // Check for invite token - registration only allowed with valid invite
      const { inviteToken } = req.body;
      
      if (!inviteToken) {
        logger.warn('Registration attempt without invite token');
        return res.status(403).json({ 
          message: 'Registration is by invitation only. Please contact an administrator.'
        });
      }
      
      // Verify the invite token
      const invite = await storage.getInvite(inviteToken);
      
      if (!invite || invite.used) {
        logger.warn(`Invalid or used invite token: ${inviteToken}`);
        return res.status(403).json({ 
          message: 'Invalid or expired invitation link'
        });
      }
      
      // Check if the username is already taken
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }

      // Create the new user
      const hashedPassword = await hashPassword(req.body.password);
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
        invitedBy: invite.createdById
      });

      // Mark the invite as used
      await storage.markInviteAsUsed(inviteToken);
      
      // Log in the newly registered user
      req.login(user, (err) => {
        if (err) {
          logger.error('Login error after registration:', err);
          return res.status(500).json({ message: 'Error during login after registration' });
        }
        res.status(201).json(user);
      });
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({ message: 'An error occurred while registering' });
    }
  });

  // Forgot password route
  app.post('/api/forgot-password', async (req, res) => {
    try {
      const { username, email } = req.body;
      
      if (!username || !email) {
        return res.status(400).json({ message: 'Username and email are required' });
      }
      
      // Always return success even if email doesn't match or user doesn't exist
      // This prevents user enumeration attacks
      const user = await userService.getUserByUsername(username);
      
      if (!user || user.email !== email) {
        // For security, we don't reveal that the user doesn't exist or email doesn't match
        logger.info(`Password reset requested for non-existent user or email mismatch: ${username}`);
        return res.status(200).json({ message: 'If your account exists, a password reset link has been sent to your email' });
      }
      
      // Generate reset token and set expiry
      const resetToken = TokenGenerator.generateToken();
      const resetExpires = TokenGenerator.generateExpirationDate();
      
      // Store token in database
      await userService.setPasswordResetToken(user.id, resetToken, resetExpires);
      
      // Send password reset email
      const mailSent = await sendPasswordResetEmail(
        user.email,
        user.username,
        resetToken,
        req.headers.origin || undefined
      );
      
      if (!mailSent) {
        logger.error(`Failed to send password reset email to ${user.email}`);
      }
      
      res.status(200).json({
        message: 'If your account exists, a password reset link has been sent to your email'
      });
    } catch (error) {
      logger.error('Forgot password error:', error);
      res.status(500).json({ message: 'An error occurred while processing your request' });
    }
  });

  // Verify reset token route
  app.post('/api/verify-reset-token', async (req, res) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ 
          valid: false,
          message: 'Invalid token format' 
        });
      }
      
      const user = await userService.getUserByResetToken(token);
      
      if (!user || !user.resetPasswordExpires || TokenGenerator.isTokenExpired(user.resetPasswordExpires)) {
        return res.status(200).json({ 
          valid: false,
          message: 'Token is invalid or has expired' 
        });
      }
      
      res.status(200).json({ 
        valid: true,
        message: 'Token is valid' 
      });
    } catch (error) {
      logger.error('Verify reset token error:', error);
      res.status(500).json({ 
        valid: false,
        message: 'An error occurred while processing your request' 
      });
    }
  });

  // Reset password route
  app.post('/api/reset-password', async (req, res) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ message: 'Invalid token or password' });
      }
      
      // Get user by reset token directly (don't use the service yet)
      console.log(`[DEBUG] Reset password: Looking up user by reset token`);
      const user = await storage.getUserByResetToken(token);
      
      if (!user || !user.resetPasswordExpires || TokenGenerator.isTokenExpired(user.resetPasswordExpires)) {
        return res.status(400).json({ message: 'Token is invalid or has expired' });
      }
      
      console.log(`[DEBUG] Reset password: Found valid reset token for user: ${user.username}`);
      
      // Hash the new password using bcrypt directly (like the successful script)
      console.log(`[DEBUG] Reset password: Hashing new password with bcrypt directly`);
      const bcrypt = await import('bcrypt');
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      console.log(`[DEBUG] Reset password: New hashed password: ${hashedPassword.substring(0, 10)}...`);
      
      // Import direct neon client
      console.log(`[DEBUG] Reset password: Using Neon HTTP client for password update`);
      const { neon } = await import('@neondatabase/serverless');
      
      // Create SQL client
      const sql = neon(process.env.DATABASE_URL!);
      
      // Get username for direct query
      const username = user.username;
      
      // Execute the update by username directly (matching the successful script exactly)
      console.log(`[DEBUG] Reset password: Updating password for user: ${username}`);
      const updateResult = await sql`
        UPDATE users 
        SET password = ${hashedPassword}, 
            reset_password_token = NULL,
            reset_password_expires = NULL,
            updated_at = NOW() 
        WHERE username = ${username} 
        RETURNING id, username, password
      `;
      
      if (!updateResult || updateResult.length === 0) {
        console.error(`[ERROR] Reset password: Update failed, no rows returned`);
        return res.status(500).json({ message: 'Failed to update password' });
      }
      
      console.log('Password update result:', updateResult);
      
      // Verify the password was updated correctly
      const userCheck = await sql`
        SELECT id, username, password
        FROM users 
        WHERE username = ${username}
      `;
      
      console.log('User after update:', userCheck);
      
      // Verify the new password works with the hash
      const fullPasswordResult = await sql`
        SELECT password FROM users WHERE username = ${username}
      `;
      
      const fullPassword = fullPasswordResult[0].password;
      
      // Test that the stored password is valid
      const isNewPasswordMatch = await bcrypt.compare(password, fullPassword);
      console.log(`[DEBUG] Reset password: New password verification: ${isNewPasswordMatch ? 'SUCCESS' : 'FAILED'}`);
      
      if (!isNewPasswordMatch) {
        console.error('[ERROR] Critical: Password verification failed after update!');
        return res.status(500).json({ message: 'Password update verification failed' });
      }
      
      // Log the user in if they're not already logged in
      if (!req.isAuthenticated()) {
        const updatedUser = await storage.getUser(user.id);
        
        if (updatedUser) {
          req.login(updatedUser, (err) => {
            if (err) {
              logger.error('Error logging in user after password reset:', err);
              // Continue with the response anyway since the password was reset
            } else {
              logger.info(`User ${updatedUser.username} logged in automatically after password reset`);
            }
          });
        }
      }
      
      res.status(200).json({ message: 'Password has been reset successfully' });
    } catch (error) {
      logger.error('Reset password error:', error);
      res.status(500).json({ message: 'An error occurred while processing your request' });
    }
  });

  // Change password route (for authenticated users)
  app.post('/api/change-password', async (req, res) => {
    try {
      // Make sure the user is authenticated
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const { newPassword } = req.body;
      
      if (!newPassword) {
        return res.status(400).json({ message: 'New password is required' });
      }
      
      // Get user ID from the authenticated session
      const userId = req.user.id;
      console.log(`[DEBUG] Change password: Getting user with ID ${userId}`);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Also get username for direct query
      const username = user.username;
      console.log(`[DEBUG] Change password: Got user from database: ${username}`);
      
      // Hash the new password using bcrypt directly
      console.log(`[DEBUG] Change password: Hashing new password with bcrypt directly`);
      const bcrypt = await import('bcrypt');
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      console.log(`[DEBUG] Change password: New hashed password: ${hashedPassword.substring(0, 10)}...`);
      
      // Import direct neon client
      console.log(`[DEBUG] Change password: Using database client for password update`);
      const { sql } = await import('../db');
      
      // Execute the update by user ID directly
      console.log(`[DEBUG] Change password: Updating password for user ID: ${userId}`);
      const updateResult = await sql`
        UPDATE users 
        SET password = ${hashedPassword}, 
            updated_at = NOW() 
        WHERE id = ${userId} 
        RETURNING id, username, password
      `;
      
      if (!updateResult || updateResult.length === 0) {
        console.error(`[ERROR] Change password: Update failed, no rows returned`);
        return res.status(500).json({ message: 'Failed to update password' });
      }
      
      console.log(`[DEBUG] Change password: Password update result:`, updateResult);
      
      // Verify the password was updated correctly
      const userCheck = await sql`
        SELECT id, username, password
        FROM users 
        WHERE id = ${userId}
      `;
      
      console.log(`[DEBUG] Change password: User after update:`, userCheck);
      
      // Test that the stored password is valid
      const isNewPasswordMatch = await bcrypt.compare(newPassword, userCheck[0].password);
      console.log(`[DEBUG] Change password: New password verification: ${isNewPasswordMatch ? 'SUCCESS' : 'FAILED'}`);
      
      if (!isNewPasswordMatch) {
        console.error('[ERROR] Critical: Password verification failed after update!');
        return res.status(500).json({ message: 'Password update verification failed' });
      }
      
      // Refresh the user session after the password change
      const userToRefresh = await storage.getUser(userId);
      if (userToRefresh) {
        console.log(`[DEBUG] Change password: refreshing user session with updated data`);
        req.login(userToRefresh, (err) => {
          if (err) {
            logger.error('Error refreshing session after password change:', err);
          } else {
            console.log(`[DEBUG] Change password: session successfully refreshed`);
          }
        });
      }
      
      console.log(`[DEBUG] Change password: successfully changed password for user ${username}`);
      res.status(200).json({ message: 'Password changed successfully' });
    } catch (error) {
      logger.error('Change password error:', error);
      res.status(500).json({ message: 'An error occurred while processing your request' });
    }
  });
}