/**
 * Routes Configuration with Code Splitting
 * 
 * This module centralizes route definitions with React.lazy for code splitting.
 * This improves initial page load time by only loading components when needed.
 */
import React, { lazy, Suspense } from 'react';
import { Route, Switch } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { Loader2 } from 'lucide-react';

// Simple loading indicator for lazy-loaded components
function LoadingIndicator() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

// Lazy-loaded routes for code splitting
const LazyDashboard = lazy(() => import('@/pages/dashboard-refactored'));
const LazyProjects = lazy(() => import('@/pages/projects'));
const LazyProjectDetail = lazy(() => import('@/pages/project-detail'));
const LazyRequirementsPage = lazy(() => import('@/pages/requirements'));
const LazyReportsPage = lazy(() => import('@/pages/reports'));
const LazyTaskPage = lazy(() => import('@/pages/tasks'));
const LazyTaskDetail = lazy(() => import('@/pages/task-detail'));
const LazyDocuments = lazy(() => import('@/pages/documents'));
const LazySearchResults = lazy(() => import('@/pages/search-results'));
const LazySettings = lazy(() => import('@/pages/settings'));
const LazyAuth = lazy(() => import('@/pages/auth'));
const LazyNotFound = lazy(() => import('@/pages/not-found'));

/**
 * Application Routes Component
 * Renders all application routes with appropriate protection
 */
export function AppRoutes() {
  const { isLoading } = useAuth();
  
  // Show loading spinner during auth check
  if (isLoading) {
    return <LoadingIndicator />;
  }
  
  return (
    <Suspense fallback={<LoadingIndicator />}>
      <Switch>
        {/* Auth pages (public) */}
        <Route path="/auth">
          <LazyAuth />
        </Route>
        
        {/* Protected routes (require authentication) */}
        <ProtectedRoute path="/" component={() => <LazyDashboard />} />
        <ProtectedRoute path="/dashboard" component={() => <LazyDashboard />} />
        <ProtectedRoute path="/projects" component={() => <LazyProjects />} />
        <ProtectedRoute path="/projects/:id" component={() => <LazyProjectDetail />} />
        <ProtectedRoute path="/projects/:id/requirements" component={() => <LazyRequirementsPage />} />
        <ProtectedRoute path="/projects/:id/tasks" component={() => <LazyTaskPage />} />
        <ProtectedRoute path="/tasks/:id" component={() => <LazyTaskDetail />} />
        <ProtectedRoute path="/projects/:id/reports" component={() => <LazyReportsPage />} />
        <ProtectedRoute path="/projects/:id/documents" component={() => <LazyDocuments />} />
        <ProtectedRoute path="/search" component={() => <LazySearchResults />} />
        <ProtectedRoute path="/settings" component={() => <LazySettings />} />
        
        {/* 404 page (public) */}
        <Route>
          <LazyNotFound />
        </Route>
      </Switch>
    </Suspense>
  );
}