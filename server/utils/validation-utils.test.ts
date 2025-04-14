/**
 * Tests for Validation Utilities
 * 
 * These tests ensure that our validation utility functions
 * correctly format and process validation errors.
 */
import { ZodError, z } from 'zod';
import { formatZodError, validateSchema } from './validation-utils';
import { ValidationError } from '../error/error-types';

describe('Validation Utilities', () => {
  describe('formatZodError', () => {
    it('should format Zod errors into a structured object', () => {
      // Arrange
      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(8),
        age: z.number().min(18),
      });
      
      let zodError: ZodError;
      try {
        schema.parse({
          email: 'not-an-email',
          password: 'short',
          age: 16,
        });
      } catch (error) {
        zodError = error as ZodError;
      }
      
      // Act
      const formattedErrors = formatZodError(zodError!);
      
      // Assert
      expect(formattedErrors).toEqual({
        email: expect.arrayContaining(['Invalid email']),
        password: expect.arrayContaining(['String must contain at least 8 character(s)']),
        age: expect.arrayContaining(['Number must be greater than or equal to 18']),
      });
    });
    
    it('should group multiple errors for the same field', () => {
      // Arrange
      const schema = z.object({
        password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
      });
      
      let zodError: ZodError;
      try {
        schema.parse({
          password: 'short',
        });
      } catch (error) {
        zodError = error as ZodError;
      }
      
      // Act
      const formattedErrors = formatZodError(zodError!);
      
      // Assert
      expect(formattedErrors.password).toHaveLength(3); // 3 different validation errors
      expect(formattedErrors.password).toEqual(expect.arrayContaining([
        'String must contain at least 8 character(s)',
        expect.stringContaining('Regular expression'),
        expect.stringContaining('Regular expression'),
      ]));
    });
    
    it('should handle nested object errors', () => {
      // Arrange
      const schema = z.object({
        user: z.object({
          name: z.string().min(2),
          email: z.string().email(),
        }),
      });
      
      let zodError: ZodError;
      try {
        schema.parse({
          user: {
            name: '',
            email: 'invalid',
          },
        });
      } catch (error) {
        zodError = error as ZodError;
      }
      
      // Act
      const formattedErrors = formatZodError(zodError!);
      
      // Assert
      expect(formattedErrors).toEqual({
        'user.name': expect.arrayContaining(['String must contain at least 2 character(s)']),
        'user.email': expect.arrayContaining(['Invalid email']),
      });
    });
    
    it('should handle array errors', () => {
      // Arrange
      const schema = z.object({
        tags: z.array(z.string().min(3)),
      });
      
      let zodError: ZodError;
      try {
        schema.parse({
          tags: ['ok', '', 'ab'],
        });
      } catch (error) {
        zodError = error as ZodError;
      }
      
      // Act
      const formattedErrors = formatZodError(zodError!);
      
      // Assert
      expect(formattedErrors).toEqual({
        'tags.1': expect.arrayContaining(['String must contain at least 3 character(s)']),
        'tags.2': expect.arrayContaining(['String must contain at least 3 character(s)']),
      });
    });
    
    it('should handle optional fields', () => {
      // Arrange
      const schema = z.object({
        name: z.string().min(2),
        email: z.string().email().optional(),
      });
      
      let zodError: ZodError;
      try {
        schema.parse({
          name: 'a',
          email: 'invalid-but-optional',
        });
      } catch (error) {
        zodError = error as ZodError;
      }
      
      // Act
      const formattedErrors = formatZodError(zodError!);
      
      // Assert
      expect(formattedErrors).toEqual({
        name: expect.arrayContaining(['String must contain at least 2 character(s)']),
        email: expect.arrayContaining(['Invalid email']),
      });
    });
  });
  
  describe('validateSchema', () => {
    it('should return parsed data when validation passes', () => {
      // Arrange
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });
      
      const data = {
        name: 'John',
        age: 30,
      };
      
      // Act
      const result = validateSchema(schema, data);
      
      // Assert
      expect(result).toEqual(data);
    });
    
    it('should throw ValidationError when schema validation fails', () => {
      // Arrange
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });
      
      const invalidData = {
        name: 'John',
        age: 'thirty', // Should be a number
      };
      
      // Act & Assert
      expect(() => validateSchema(schema, invalidData)).toThrow(ValidationError);
    });
    
    it('should include formatted validation errors in thrown error', () => {
      // Arrange
      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(8),
      });
      
      const invalidData = {
        email: 'not-an-email',
        password: 'short',
      };
      
      // Act & Assert
      try {
        validateSchema(schema, invalidData);
        fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).validationErrors).toEqual({
          email: expect.arrayContaining(['Invalid email']),
          password: expect.arrayContaining(['String must contain at least 8 character(s)']),
        });
      }
    });
    
    it('should use custom error message if provided', () => {
      // Arrange
      const schema = z.object({
        name: z.string(),
      });
      
      const invalidData = {
        name: 123, // Should be a string
      };
      
      const customMessage = 'Custom validation error message';
      
      // Act & Assert
      try {
        validateSchema(schema, invalidData, customMessage);
        fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).message).toBe(customMessage);
      }
    });
    
    it('should handle schema with transformations', () => {
      // Arrange
      const schema = z.object({
        name: z.string(),
        dob: z.string().transform(str => new Date(str)),
      });
      
      const data = {
        name: 'John',
        dob: '1990-01-01',
      };
      
      // Act
      const result = validateSchema(schema, data);
      
      // Assert
      expect(result.name).toBe('John');
      expect(result.dob).toBeInstanceOf(Date);
      expect(result.dob.getFullYear()).toBe(1990);
    });
  });
});