/**
 * Invite Routes
 * 
 * Defines Express routes for invitation management.
 */
import { Express } from 'express';
import { inviteController } from '../controllers/invite-controller';
import { isAuthenticated } from '../middleware/auth';

/**
 * Register invite routes with the Express application
 * @param app Express application instance
 */
export function registerInviteRoutes(app: Express): void {
  /**
   * @route POST /api/invites
   * @desc Create a new invite
   * @access Private
   */
  app.post('/api/invites', isAuthenticated, inviteController.createInvite.bind(inviteController));
  
  /**
   * @route GET /api/invites
   * @desc Get all invites for the current user
   * @access Private
   */
  app.get('/api/invites', isAuthenticated, inviteController.getInvites.bind(inviteController));
}