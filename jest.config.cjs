/**
 * Jest Configuration for ES Modules
 * 
 * This configuration sets up Jest for testing both the frontend and backend
 * components of the application with appropriate transformers and module mappings.
 */
module.exports = {
  // Basic test setup for CommonJS
  projects: [
    {
      // Basic tests configuration
      displayName: 'basic',
      testMatch: ['<rootDir>/*.test.js', '<rootDir>/*.spec.js', '<rootDir>/basic-test.js'],
      testEnvironment: 'node',
    },
    {
      // Backend tests configuration
      displayName: 'backend',
      testMatch: ['<rootDir>/server/**/*.test.ts', '<rootDir>/server/**/*.spec.ts'],
      testEnvironment: 'node',
      preset: 'ts-jest',
      transform: {
        '^.+\\.(ts|tsx)$': 'babel-jest',
      },
      moduleNameMapper: {
        '^@shared/(.*)$': '<rootDir>/shared/$1',
      },
    },
    {
      // Frontend tests configuration
      displayName: 'frontend',
      testMatch: ['<rootDir>/client/**/*.test.{ts,tsx}', '<rootDir>/client/**/*.spec.{ts,tsx}'],
      testEnvironment: 'jsdom',
      preset: 'ts-jest',
      transform: {
        '^.+\\.(ts|tsx)$': 'babel-jest',
      },
      moduleNameMapper: {
        // Handle CSS imports (with CSS modules)
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        // Handle image imports
        '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
        // Handle module aliases
        '^@/(.*)$': '<rootDir>/client/src/$1',
        '^@shared/(.*)$': '<rootDir>/shared/$1',
        '^@assets/(.*)$': '<rootDir>/attached_assets/$1',
      },
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    },
  ],
  
  // Coverage configuration
  collectCoverage: false,
  collectCoverageFrom: [
    'server/**/*.{ts,tsx}',
    'client/src/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/*.stories.{ts,tsx}',
    '!**/*.test.{ts,tsx}',
    '!**/*.spec.{ts,tsx}',
    '!**/__tests__/**',
    '!**/__mocks__/**',
  ],
  coverageReporters: ['text', 'lcov', 'clover'],
  
  // Global test timeout
  testTimeout: 10000,
};