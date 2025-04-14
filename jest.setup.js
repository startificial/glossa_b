/**
 * Jest Setup
 * 
 * This file configures the test environment for React components
 * and sets up global mocks and utilities.
 */

// Add React Testing Library's custom matchers
import '@testing-library/jest-dom';

// Mock global fetch API
global.fetch = jest.fn();

// Mock matchMedia for tests (required for some UI components)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver (required for some UI components)
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {
    return null;
  }
  unobserve() {
    return null;
  }
  disconnect() {
    return null;
  }
};

// Mock ResizeObserver (required for some UI components)
global.ResizeObserver = class ResizeObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {
    return null;
  }
  unobserve() {
    return null;
  }
  disconnect() {
    return null;
  }
};

// Mock console.error and console.warn to make tests fail on warnings/errors
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = function(message) {
  // Skip React internal warnings that are expected in tests
  if (
    /Warning.*not wrapped in act/.test(message) ||
    /Warning.*cannot update a component/.test(message) ||
    /Warning.*React.createFactory/.test(message) ||
    /Warning.*ReactDOM.render is no longer supported/.test(message)
  ) {
    originalConsoleError.apply(console, arguments);
    return;
  }
  
  // Otherwise, fail the test
  originalConsoleError.apply(console, arguments);
  throw new Error(`Console error triggered: ${message}`);
};

console.warn = function(message) {
  // Skip certain expected warnings
  if (
    /Warning.*not wrapped in act/.test(message) ||
    /Warning.*componentWillReceiveProps/.test(message) ||
    /Warning.*componentWillMount/.test(message)
  ) {
    originalConsoleWarn.apply(console, arguments);
    return;
  }
  
  // Log but don't fail the test for warnings
  originalConsoleWarn.apply(console, arguments);
};

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
});