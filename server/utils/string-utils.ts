/**
 * Collection of string utility functions for the application
 */

/**
 * Capitalizes the first letter of a string
 * @param str String to capitalize
 * @returns Capitalized string
 */
export function capitalizeFirstLetter(str: string): string {
  if (!str || str.length === 0) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Truncates a string to a specified length and adds ellipsis if needed
 * @param str String to truncate
 * @param maxLength Maximum length before truncation
 * @param suffix Suffix to add when truncated (default: '...')
 * @returns Truncated string
 */
export function truncateString(str: string, maxLength: number, suffix: string = '...'): string {
  if (!str || str.length <= maxLength) return str;
  return str.substring(0, maxLength) + suffix;
}

/**
 * Converts a string to kebab-case
 * @param str String to convert
 * @returns Kebab-cased string
 */
export function toKebabCase(str: string): string {
  if (!str) return str;
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Converts a string to camelCase
 * @param str String to convert
 * @returns camelCased string
 */
export function toCamelCase(str: string): string {
  if (!str) return str;
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+|[-_]/g, '');
}