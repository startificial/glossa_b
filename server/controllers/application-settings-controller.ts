/**
 * Application Settings Controller
 * 
 * Handles API requests for application-wide settings management.
 */
import { Request, Response } from 'express';
import { storage } from '../storage';
import { z } from 'zod';
import { ApplicationSettingsData } from '@shared/types';

/**
 * Get the application settings
 * @param req Express request
 * @param res Express response
 */
export async function getApplicationSettings(req: Request, res: Response) {
  try {
    const settings = await storage.getApplicationSettingsData();
    
    if (!settings) {
      // If no settings exist yet, create default settings
      const userId = req.session?.userId || 1; // Use the current user or fall back to admin (1)
      const newSettings = await storage.createDefaultApplicationSettings(userId);
      return res.status(200).json(newSettings.settings);
    }
    
    return res.status(200).json(settings);
  } catch (error) {
    console.error('Error getting application settings:', error);
    return res.status(500).json({ error: 'Failed to retrieve application settings' });
  }
}

/**
 * Validate settings data against schema
 */
const validateSettings = (data: any): { valid: boolean, errors?: string[] } => {
  try {
    // Define validation schema for each settings section
    const generalSchema = z.object({
      applicationName: z.string().min(1),
      companyName: z.string().min(1),
      supportEmail: z.string().email(),
      maxFileUploadSize: z.number().int().positive(),
      defaultLanguage: z.string().min(2),
      timeZone: z.string()
    });
    
    const passwordPolicySchema = z.object({
      minLength: z.number().int().min(6),
      requireSpecialChars: z.boolean(),
      requireNumbers: z.boolean(),
      requireUppercase: z.boolean(),
      requireLowercase: z.boolean()
    });
    
    const authSchema = z.object({
      passwordPolicy: passwordPolicySchema,
      mfaEnabled: z.boolean(),
      sessionTimeout: z.number().int().positive(),
      allowSelfRegistration: z.boolean(),
      loginAttempts: z.number().int().min(1)
    });
    
    const notificationSchema = z.object({
      emailNotificationsEnabled: z.boolean(),
      systemNotificationsEnabled: z.boolean(),
      defaultReminderTime: z.number().int().positive()
    });
    
    const integrationSchema = z.object({
      aiProvider: z.enum(['google', 'openai', 'anthropic', 'huggingface']),
      aiModel: z.string(),
      aiApiRateLimit: z.number().int().positive(),
      enableThirdPartyIntegrations: z.boolean()
    });
    
    // Validate each section
    generalSchema.parse(data.general);
    authSchema.parse(data.auth);
    notificationSchema.parse(data.notifications);
    integrationSchema.parse(data.integrations);
    
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        valid: false, 
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      };
    }
    return { valid: false, errors: ['Invalid settings data'] };
  }
};

/**
 * Update application settings
 * @param req Express request
 * @param res Express response
 */
export async function updateApplicationSettings(req: Request, res: Response) {
  try {
    const userId = req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const settingsData = req.body;
    
    // Validate the settings data
    const validation = validateSettings(settingsData);
    if (!validation.valid) {
      return res.status(400).json({ 
        error: 'Invalid settings data', 
        details: validation.errors 
      });
    }
    
    // Update the settings
    const updatedSettings = await storage.updateApplicationSettings(userId, settingsData);
    
    if (!updatedSettings) {
      return res.status(500).json({ error: 'Failed to update application settings' });
    }
    
    return res.status(200).json(updatedSettings.settings);
  } catch (error) {
    console.error('Error updating application settings:', error);
    return res.status(500).json({ error: 'Failed to update application settings' });
  }
}

// Export controller methods
export const applicationSettingsController = {
  getApplicationSettings,
  updateApplicationSettings
};