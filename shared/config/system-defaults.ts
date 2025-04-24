/**
 * System Default Configuration
 * 
 * This module centralizes default values used throughout the application.
 * Instead of hardcoding values in multiple files, we define them here for 
 * easier maintenance and consistency.
 */

export const DEFAULT_SYSTEM_NAMES = {
  /**
   * Default name for source systems when none is specified
   */
  source: 'Legacy System',
  
  /**
   * Default name for target systems when none is specified
   */
  target: 'New System',
};

export const ENV_CONFIG = {
  /**
   * Whether quick start mode is enabled
   * Can be controlled by setting QUICK_START=false in .env
   */
  QUICK_START: process.env.QUICK_START !== 'false',
  
  /**
   * Whether to enable verbose debug logs
   * Can be controlled by setting DEBUG_LOGS=true in .env
   */
  DEBUG_LOGS: process.env.DEBUG_LOGS === 'true',
};

export const DEMO_USER_CONFIG = {
  /**
   * Whether demo user features are enabled
   */
  ENABLED: process.env.ENABLE_DEMO_USER === 'true' || process.env.NODE_ENV !== 'production',
  
  /**
   * Whether to auto-login as demo user when no session exists
   */
  AUTO_LOGIN: process.env.AUTO_LOGIN_DEMO === 'true' || process.env.NODE_ENV !== 'production',
  
  /**
   * Demo user username
   */
  USERNAME: process.env.DEMO_USERNAME || 'demo_user',
};

// Export for centralized access
export default {
  DEFAULT_SYSTEM_NAMES,
  ENV_CONFIG,
  DEMO_USER_CONFIG,
};