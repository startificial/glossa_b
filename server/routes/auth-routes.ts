import { Express, Request, Response } from 'express';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import session from 'express-session';
import { storage } from '../storage';
import { logger } from '../logger';
import { User } from '@shared/schema';
import { UserService } from '../services/user-service';
import { sendPasswordResetEmail } from '../services/email-service';
import { TokenGenerator } from '../utils/token-generator';

// Convert scrypt to promise-based API
const scryptAsync = promisify(scrypt);

// Initialize user service
const userService = new UserService(storage);

/**
 * Hash a password using bcrypt to match the existing database format
 * @param password The plain text password to hash
 * @returns The hashed password
 */
async function hashPassword(password: string): Promise<string> {
  try {
    // Import and use the bcrypt directly
    const bcrypt = await import('bcrypt');
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log(`[DEBUG] Password hashed successfully. Format: ${hashedPassword.substring(0, 10)}...`);
    return hashedPassword;
  } catch (error) {
    logger.error('Error in hashPassword:', error);
    throw new Error('Failed to hash password');
  }
}

/**
 * Compare a supplied password with a stored hashed password
 * @param supplied The plain text password to check
 * @param stored The stored hashed password with salt
 * @returns True if the passwords match, false otherwise
 */
async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  try {
    // Check if the stored password is in bcrypt format (starts with $2a$ or $2b$)
    if (stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$')) {
      // Use bcrypt directly for comparison
      const bcrypt = await import('bcrypt');
      return await bcrypt.compare(supplied, stored);
    } else {
      // Use the original scrypt method for scrypt-formatted passwords
      const [hashed, salt] = stored.split('.');
      if (!salt) {
        logger.error('Invalid password format in database (no salt found)');
        return false;
      }
      const hashedBuf = Buffer.from(hashed, 'hex');
      const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
      return timingSafeEqual(hashedBuf, suppliedBuf);
    }
  } catch (error) {
    logger.error('Error in comparePasswords:', error);
    return false;
  }
}

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
        req.headers.origin ? `${req.headers.origin}/auth` : undefined
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
      
      const user = await userService.getUserByResetToken(token);
      
      if (!user || !user.resetPasswordExpires || TokenGenerator.isTokenExpired(user.resetPasswordExpires)) {
        return res.status(400).json({ message: 'Token is invalid or has expired' });
      }
      
      // Hash the new password
      const hashedPassword = await hashPassword(password);
      
      // Update the user's password and clear the reset token
      const result = await userService.resetPassword(token, hashedPassword);
      
      if (!result.success) {
        return res.status(400).json({ message: result.message });
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
      
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current password and new password are required' });
      }
      
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Verify current password
      console.log(`[DEBUG] Change password: verifying current password for user ${user.username}`);
      console.log(`[DEBUG] Change password: stored password format: ${user.password.substring(0, 10)}...`);
      const isCurrentPasswordValid = await comparePasswords(currentPassword, user.password);
      console.log(`[DEBUG] Change password: current password verification result: ${isCurrentPasswordValid}`);
      
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
      
      // Hash the new password using the same method as elsewhere in this file
      // We explicitly use our local hashPassword function, not the one from password-utils
      console.log(`[DEBUG] Change password: hashing new password`);
      const hashedPassword = await hashPassword(newPassword);
      console.log(`[DEBUG] Change password: new hashed password format: ${hashedPassword.substring(0, 10)}...`);
      
      console.log(`[DEBUG] Change password: updating password for user ID ${userId}`);
      // Update the password
      const updated = await storage.updatePasswordAndClearToken(userId, hashedPassword);
      
      console.log(`[DEBUG] Change password: update result: ${updated}`);
      
      if (!updated) {
        return res.status(500).json({ message: 'Failed to update password' });
      }
      
      console.log(`[DEBUG] Change password: successfully changed password`);
      res.status(200).json({ message: 'Password changed successfully' });
    } catch (error) {
      logger.error('Change password error:', error);
      res.status(500).json({ message: 'An error occurred while processing your request' });
    }
  });
}