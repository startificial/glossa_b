/**
 * Utility functions for the server
 */

/**
 * Generate a unique ID
 * @param length Length of the ID
 * @returns A unique ID string
 */
export function generateUniqueId(length: number = 10): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * Format a file size in bytes to a human-readable string
 * @param bytes Number of bytes
 * @returns Formatted file size string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Sanitize a string for use in file names
 * @param str Input string
 * @returns Sanitized string
 */
export function sanitizeFileName(str: string): string {
  return str
    .replace(/[^\w\s.-]/g, '_')
    .replace(/\s+/g, '_')
    .toLowerCase();
}

/**
 * Truncate a string to a maximum length
 * @param str Input string
 * @param maxLength Maximum length
 * @returns Truncated string
 */
export function truncateString(str: string, maxLength: number = 100): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
}

/**
 * Get file extension from a file name
 * @param fileName File name
 * @returns File extension (without dot)
 */
export function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

/**
 * Check if a file is a video file based on its extension
 * @param fileName File name
 * @returns Boolean indicating if it's a video file
 */
export function isVideoFile(fileName: string): boolean {
  const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'];
  const extension = getFileExtension(fileName);
  return videoExtensions.includes(extension);
}

/**
 * Delay execution for a specified time
 * @param ms Milliseconds to delay
 * @returns Promise that resolves after the delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate a random requirement code ID
 * @returns A random requirement code ID (e.g., "REQ-001")
 */
export function generateRequirementCode(): string {
  const randomNum = Math.floor(Math.random() * 1000);
  return `REQ-${randomNum.toString().padStart(3, '0')}`;
}

export default {
  generateUniqueId,
  formatFileSize,
  sanitizeFileName,
  truncateString,
  getFileExtension,
  isVideoFile,
  delay,
  generateRequirementCode
};