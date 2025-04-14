/**
 * API Routes Configuration
 * 
 * This module defines all API routes used in the application in a centralized place.
 * This ensures consistency between frontend and backend route definitions.
 */

/**
 * Base API endpoint paths
 */
export const API_ENDPOINTS = {
  // Auth routes
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    REGISTER: '/api/auth/register',
    RESET_PASSWORD: '/api/auth/reset-password',
    ME: '/api/me',
  },
  
  // User management
  USERS: {
    BASE: '/api/users',
    BY_ID: (id: number) => `/api/users/${id}`,
  },
  
  // Projects
  PROJECTS: {
    BASE: '/api/projects',
    BY_ID: (id: number) => `/api/projects/${id}`,
    REQUIREMENTS: (projectId: number) => `/api/projects/${projectId}/requirements`,
    HIGH_PRIORITY_REQUIREMENTS: (projectId: number) => `/api/projects/${projectId}/requirements/high-priority`,
    ACTIVITIES: (projectId: number) => `/api/projects/${projectId}/activities`,
    TASKS: (projectId: number) => `/api/projects/${projectId}/tasks`,
    ANALYTICS: (projectId: number) => `/api/projects/${projectId}/analytics`,
  },
  
  // Requirements
  REQUIREMENTS: {
    BASE: '/api/requirements',
    BY_ID: (id: number) => `/api/requirements/${id}`,
    ACCEPTANCE_CRITERIA: (id: number) => `/api/requirements/${id}/acceptance-criteria`,
    GENERATE: '/api/requirements/generate',
    FILTER: '/api/requirements/filter',
    SEARCH: '/api/requirements/search',
    METRICS: '/api/requirements/metrics',
  },
  
  // Tasks
  TASKS: {
    BASE: '/api/tasks',
    BY_ID: (id: number) => `/api/tasks/${id}`,
    BY_REQUIREMENT: (requirementId: number) => `/api/requirements/${requirementId}/tasks`,
    BULK_UPDATE: '/api/tasks/bulk-update',
  },
  
  // Activities
  ACTIVITIES: {
    BASE: '/api/activities',
    BY_ID: (id: number) => `/api/activities/${id}`,
    GLOBAL: '/api/activities/global',
  },
  
  // Customers
  CUSTOMERS: {
    BASE: '/api/customers',
    BY_ID: (id: number) => `/api/customers/${id}`,
    PROJECTS: (customerId: number) => `/api/customers/${customerId}/projects`,
  },
  
  // Input data (files, etc.)
  INPUT_DATA: {
    BASE: '/api/input-data',
    BY_ID: (id: number) => `/api/input-data/${id}`,
    UPLOAD: '/api/input-data/upload',
    BY_PROJECT: (projectId: number) => `/api/projects/${projectId}/input-data`,
    ANALYZE: (id: number) => `/api/input-data/${id}/analyze`,
  },
  
  // AI services
  AI: {
    GENERATE_REQUIREMENTS: '/api/ai/generate-requirements',
    EXTRACT_ACCEPTANCE_CRITERIA: '/api/ai/extract-acceptance-criteria',
    SUMMARIZE: '/api/ai/summarize',
    ANALYZE_PROJECT: '/api/ai/analyze-project',
  },
  
  // Search
  SEARCH: {
    GLOBAL: '/api/search',
    PROJECTS: '/api/search/projects',
    REQUIREMENTS: '/api/search/requirements',
    TASKS: '/api/search/tasks',
  },
  
  // System
  SYSTEM: {
    HEALTH: '/api/health',
    VERSION: '/api/version',
    LOGS: '/api/logs',
    METRICS: '/api/metrics',
  },
};

/**
 * Generate query parameters string from an object
 */
export function generateQueryParams(params: Record<string, string | number | boolean | undefined | null>): string {
  const validParams = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  
  return validParams.length > 0 ? `?${validParams.join('&')}` : '';
}

/**
 * Generate a URL with query parameters
 */
export function generateUrl(path: string, params?: Record<string, string | number | boolean | undefined | null>): string {
  if (!params) return path;
  
  return `${path}${generateQueryParams(params)}`;
}