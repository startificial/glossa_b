/**
 * Client Test Utilities
 * 
 * Common utilities and helpers for frontend tests.
 */
import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/components/theme-provider';

/**
 * Setup for userEvent
 */
export function setupUser() {
  return userEvent.setup();
}

/**
 * Custom render function with providers
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
  route?: string;
  theme?: 'light' | 'dark' | 'system';
}

/**
 * Create a wrapper with all providers
 */
function createWrapper(options: CustomRenderOptions = {}) {
  // Create a new QueryClient for each test
  const queryClient = options.queryClient || new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  });
  
  // If a route is provided, mock the router context
  if (options.route) {
    // Mock window.location for the route
    window.history.pushState({}, 'Test page', options.route);
  }
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme={options.theme || 'light'}>
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}

/**
 * Custom render function with all providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
) {
  const { queryClient, route, theme, ...renderOptions } = options;
  const Wrapper = createWrapper({ queryClient, route, theme });
  
  return {
    user: setupUser(),
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

/**
 * Mock response for API hooks
 */
export function mockApiResponse<T>(data: T) {
  return {
    data,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  };
}

/**
 * Mock error response for API hooks
 */
export function mockApiError(error: Error) {
  return {
    data: undefined,
    isLoading: false,
    isError: true,
    error,
    refetch: jest.fn(),
  };
}

/**
 * Mock loading state for API hooks
 */
export function mockApiLoading() {
  return {
    data: undefined,
    isLoading: true,
    isError: false,
    error: null,
    refetch: jest.fn(),
  };
}

/**
 * Generate a random color for testing
 */
export function generateRandomColor(): string {
  return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
}

/**
 * Wait for a specified time (in ms)
 */
export function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}