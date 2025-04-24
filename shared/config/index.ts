/**
 * Configuration Module
 * 
 * This module exports all application configuration in a centralized way.
 * Import from '@shared/config' to access all configuration settings.
 */

export * from './system-defaults';

// Re-export default if needed
import systemDefaults from './system-defaults';
export default systemDefaults;