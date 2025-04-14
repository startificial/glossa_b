/**
 * Server Test Utilities
 * 
 * Common utilities and helpers for backend tests.
 */
import { Request, Response } from 'express';

/**
 * Create a mock Express request object
 */
export function createMockRequest(options: {
  params?: Record<string, string>;
  query?: Record<string, string>;
  body?: any;
  headers?: Record<string, string>;
  user?: any;
  session?: Record<string, any>;
} = {}): Request {
  const req = {
    params: options.params || {},
    query: options.query || {},
    body: options.body || {},
    headers: options.headers || {},
    user: options.user || null,
    session: options.session || {},
  } as Partial<Request>;
  
  return req as Request;
}

/**
 * Create a mock Express response object
 */
export function createMockResponse(): Response {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    sendStatus: jest.fn().mockReturnThis(),
    locals: {},
    headersSent: false,
    setHeader: jest.fn().mockReturnThis(),
  } as Partial<Response>;
  
  return res as Response;
}

/**
 * Create a mock Express next function
 */
export function createMockNext(): jest.Mock {
  return jest.fn();
}

/**
 * Generate a random string for testing
 */
export function generateRandomString(length: number = 10): string {
  return Math.random().toString(36).substring(2, 2 + length);
}

/**
 * Generate a random number within a range for testing
 */
export function generateRandomNumber(min: number = 1, max: number = 100): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Create a random date within range for testing
 */
export function generateRandomDate(
  start: Date = new Date(2020, 0, 1),
  end: Date = new Date()
): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

/**
 * Generate a mock database entity with required fields and optional overrides
 */
export function createMockEntity<T>(
  baseEntity: Partial<T>, 
  overrides: Partial<T> = {}
): T {
  return {
    ...baseEntity,
    ...overrides,
  } as T;
}