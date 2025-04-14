/**
 * App Component (Optimized Version)
 * 
 * Main application component with performance optimizations:
 * - Code splitting via React.lazy
 * - Optimized TanStack Query configuration
 * - Tree-shakable imports
 * - Memoized context providers
 */
import React, { useEffect, useMemo } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { queryClient } from '@/lib/query-client-optimized';
import { AuthProvider } from '@/contexts/auth-context';
import { AppRoutes } from '@/lib/routes';
import { ThemeProvider } from '@/contexts/theme-context';
import { ErrorBoundary } from '@/components/common/error-boundary';

/**
 * Global error fallback UI for critical application errors
 */
function GlobalErrorFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-card p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-foreground mb-4">
          Something went wrong
        </h2>
        <p className="text-muted-foreground mb-6">
          We're sorry, but something unexpected happened. Please try refreshing the page.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded"
        >
          Refresh the page
        </button>
      </div>
    </div>
  );
}

/**
 * App Component
 */
export default function App() {
  // Effect to measure and report initial load performance
  useEffect(() => {
    // Report performance metrics after the app has loaded
    if (typeof window !== 'undefined' && 'performance' in window) {
      // Wait for any pending microtasks
      setTimeout(() => {
        const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigationTiming) {
          // Log key metrics
          console.info('Performance metrics:', {
            // Time to first byte (server response time)
            ttfb: Math.round(navigationTiming.responseStart - navigationTiming.requestStart),
            // DOM Content Loaded (basic HTML parsed)
            dcl: Math.round(navigationTiming.domContentLoadedEventEnd - navigationTiming.navigationStart),
            // Load Event (full page loaded)
            loadEvent: Math.round(navigationTiming.loadEventEnd - navigationTiming.navigationStart),
          });
        }
        
        // Report Largest Contentful Paint if available
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          console.info('Largest Contentful Paint:', Math.round(lastEntry.startTime));
          observer.disconnect();
        });
        
        observer.observe({ type: 'largest-contentful-paint', buffered: true });
      }, 0);
    }
  }, []);
  
  // Memoize the query client to prevent unnecessary re-renders
  const memoizedQueryClient = useMemo(() => queryClient, []);

  return (
    <ErrorBoundary fallback={<GlobalErrorFallback />}>
      <QueryClientProvider client={memoizedQueryClient}>
        <ThemeProvider>
          <AuthProvider>
            <AppRoutes />
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}