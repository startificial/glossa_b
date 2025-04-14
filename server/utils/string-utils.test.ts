/**
 * Tests for string utility functions
 */
// @jest-environment node
import { describe, expect, it } from '@jest/globals';
import { 
  capitalizeFirstLetter,
  truncateString,
  toKebabCase,
  toCamelCase
} from './string-utils';

describe('String Utils', () => {
  describe('capitalizeFirstLetter', () => {
    it('should capitalize the first letter of a string', () => {
      expect(capitalizeFirstLetter('hello')).toBe('Hello');
      expect(capitalizeFirstLetter('world')).toBe('World');
    });

    it('should not change already capitalized strings', () => {
      expect(capitalizeFirstLetter('Hello')).toBe('Hello');
    });

    it('should handle empty strings', () => {
      expect(capitalizeFirstLetter('')).toBe('');
    });

    it('should handle undefined input', () => {
      expect(capitalizeFirstLetter(undefined as unknown as string)).toBe(undefined);
    });

    it('should handle single character strings', () => {
      expect(capitalizeFirstLetter('a')).toBe('A');
    });
  });

  describe('truncateString', () => {
    it('should truncate strings longer than maxLength', () => {
      expect(truncateString('Hello world', 5)).toBe('Hello...');
    });

    it('should not truncate strings shorter than maxLength', () => {
      expect(truncateString('Hello', 10)).toBe('Hello');
    });

    it('should use custom suffix when provided', () => {
      expect(truncateString('Hello world', 5, '---')).toBe('Hello---');
    });

    it('should handle empty strings', () => {
      expect(truncateString('', 5)).toBe('');
    });

    it('should handle undefined input', () => {
      expect(truncateString(undefined as unknown as string, 5)).toBe(undefined);
    });
  });

  describe('toKebabCase', () => {
    it('should convert camelCase to kebab-case', () => {
      expect(toKebabCase('helloWorld')).toBe('hello-world');
    });

    it('should convert PascalCase to kebab-case', () => {
      expect(toKebabCase('HelloWorld')).toBe('hello-world');
    });

    it('should convert space-separated words to kebab-case', () => {
      expect(toKebabCase('hello world')).toBe('hello-world');
    });

    it('should convert underscore_separated words to kebab-case', () => {
      expect(toKebabCase('hello_world')).toBe('hello-world');
    });

    it('should handle empty strings', () => {
      expect(toKebabCase('')).toBe('');
    });

    it('should handle undefined input', () => {
      expect(toKebabCase(undefined as unknown as string)).toBe(undefined);
    });
  });

  describe('toCamelCase', () => {
    it('should convert kebab-case to camelCase', () => {
      expect(toCamelCase('hello-world')).toBe('helloWorld');
    });

    it('should convert snake_case to camelCase', () => {
      expect(toCamelCase('hello_world')).toBe('helloWorld');
    });

    it('should convert space-separated words to camelCase', () => {
      expect(toCamelCase('hello world')).toBe('helloWorld');
    });

    it('should handle empty strings', () => {
      expect(toCamelCase('')).toBe('');
    });

    it('should handle undefined input', () => {
      expect(toCamelCase(undefined as unknown as string)).toBe(undefined);
    });
  });
});