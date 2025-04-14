/**
 * Repository Module Index
 * 
 * Exports all repository interfaces and implementations.
 * Use this file to import repository-related functionality throughout the application.
 */

// Base repository interface
export * from './base-repository';

// Entity-specific repository interfaces
export * from './user-repository';
export * from './requirement-repository';
export * from './project-repository';

// Repository factory
export * from './repository-factory';

// Implementations are not exported directly - they should be accessed through the factory