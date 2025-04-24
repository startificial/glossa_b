/**
 * Application Settings Routes
 * 
 * API routes for managing application-wide settings.
 * These endpoints are protected and require admin access.
 */
import { Router } from 'express';
import { applicationSettingsController } from '../controllers/application-settings-controller';
import { isAuthenticated, isAdmin } from '../middleware/auth';

const router = Router();

/**
 * @route GET /api/application-settings
 * @desc Get application settings
 * @access Private
 */
router.get('/', isAuthenticated, applicationSettingsController.getApplicationSettings);

/**
 * @route PUT /api/application-settings
 * @desc Update application settings
 * @access Private (Admin only)
 */
router.put('/', isAuthenticated, isAdmin, applicationSettingsController.updateApplicationSettings);

export default router;