import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Helper module for Google Cloud credentials management
 * Supports both direct JSON credentials or credentials file path
 */

/**
 * Setup Google Cloud credentials from environment variables
 * This function handles credential bootstrapping based on environment setup
 * @returns Path to the credentials file or undefined if using environment vars directly
 */
export async function setupGoogleCredentials(): Promise<string | undefined> {
  // Check if we have the credentials already set as a full JSON string
  const credentialsContent = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  
  if (!credentialsContent) {
    console.warn('Google Cloud credentials not found in environment variables');
    return undefined;
  }
  
  // If the content appears to be JSON, save it to a temporary file
  if (credentialsContent.trim().startsWith('{')) {
    try {
      // Create temp directory if it doesn't exist
      const tempDir = path.join(os.tmpdir(), 'app-credentials');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // Write credentials to a temp file
      const credentialsPath = path.join(tempDir, 'google-credentials.json');
      fs.writeFileSync(credentialsPath, credentialsContent, 'utf-8');
      
      // Update the environment variable to point to this file
      process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
      
      console.log('Google Cloud credentials set up from environment JSON string');
      return credentialsPath;
    } catch (error) {
      console.error('Error setting up Google credentials from JSON string:', error);
      throw error;
    }
  } else {
    // The variable is likely already a path to the credentials file
    console.log('Using existing Google Cloud credentials file path from environment');
    return credentialsContent;
  }
}

/**
 * Check if Google Cloud credentials are properly configured
 * @returns Boolean indicating if credentials are available
 */
export function hasGoogleCredentials(): boolean {
  return !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
}