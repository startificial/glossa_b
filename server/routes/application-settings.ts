/**
 * Application Settings Routes
 * 
 * API routes for managing application-wide settings.
 * These endpoints are protected and require admin access.
 */
import { Router } from 'express';
import { applicationSettingsController } from '../controllers/application-settings-controller';
import { requireAuthentication, requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * @route GET /api/application-settings
 * @desc Get application settings
 * @access Private
 */
router.get('/', requireAuthentication, applicationSettingsController.getApplicationSettings);

/**
 * @route PUT /api/application-settings
 * @desc Update application settings
 * @access Private (Admin only)
 */
router.put('/', requireAuthentication, requireAdmin, applicationSettingsController.updateApplicationSettings);

export default router;