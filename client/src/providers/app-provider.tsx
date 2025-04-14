/**
 * Application Provider
 * 
 * This component serves as the top-level provider for the application,
 * wrapping all global providers in the correct order and providing
 * a centralized error boundary.
 */
import { ReactNode, Suspense } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { ErrorBoundary } from '@/components/error-boundary';
import { queryClient } from '@/lib/query-client-optimized';
import { ErrorFallback } from '@/components/error-fallback';
import { Spinner } from '@/components/ui/spinner';

/**
 * Props for the AppProvider component
 */
interface AppProviderProps {
  children: ReactNode;
}

/**
 * Global loading fallback component
 */
function GlobalLoadingFallback() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Spinner size="lg" className="text-primary" />
      <span className="ml-2 text-lg font-medium">Loading application...</span>
    </div>
  );
}

/**
 * App provider component that wraps all global providers
 */
export function AppProvider({ children }: AppProviderProps) {
  return (
    // Global error boundary
    <ErrorBoundary fallback={<ErrorFallback />}>
      {/* Theme provider for light/dark mode */}
      <ThemeProvider>
        {/* Query client for data fetching */}
        <QueryClientProvider client={queryClient}>
          {/* Suspense boundary for code splitting */}
          <Suspense fallback={<GlobalLoadingFallback />}>
            {/* Main application content */}
            {children}
            
            {/* Toast notifications */}
            <Toaster />
          </Suspense>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}