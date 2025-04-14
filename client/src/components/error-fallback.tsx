/**
 * Error Fallback Component
 * 
 * This component is displayed when an error is caught by an error boundary.
 * It provides a user-friendly error message and a way to recover from the error.
 */
import { useCallback } from 'react';
import { useLocation, useNavigate } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { logger } from '@/lib/logger';

/**
 * Props for the ErrorFallback component
 */
interface ErrorFallbackProps {
  error?: Error;
  resetErrorBoundary?: () => void;
}

/**
 * Error fallback component
 */
export function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  const [location] = useLocation();
  const navigate = useNavigate();
  
  // Log the error
  if (error) {
    logger.error('Error boundary caught error:', { 
      error: error.message, 
      stack: error.stack,
      location 
    });
  }
  
  /**
   * Handle retrying the operation
   */
  const handleRetry = useCallback(() => {
    if (resetErrorBoundary) {
      resetErrorBoundary();
    }
  }, [resetErrorBoundary]);
  
  /**
   * Handle going back to the homepage
   */
  const handleGoHome = useCallback(() => {
    if (resetErrorBoundary) {
      resetErrorBoundary();
    }
    navigate('/');
  }, [navigate, resetErrorBoundary]);
  
  /**
   * Handle reloading the page
   */
  const handleReload = useCallback(() => {
    window.location.reload();
  }, []);
  
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-destructive">
            Something went wrong
          </CardTitle>
          <CardDescription>
            We've encountered an unexpected error. The development team has been notified.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="rounded-md bg-destructive/10 p-4 mb-4">
            <p className="text-sm text-destructive font-medium">
              {error?.message || 'An unknown error occurred'}
            </p>
            
            {error?.stack && process.env.NODE_ENV === 'development' && (
              <details className="mt-2">
                <summary className="text-xs text-destructive cursor-pointer">
                  Technical Details
                </summary>
                <pre className="mt-2 max-h-40 overflow-auto rounded-md bg-slate-900 p-2 text-xs text-white">
                  {error.stack}
                </pre>
              </details>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground">
            You can try to resolve this issue by:
          </p>
          <ul className="list-disc list-inside text-sm text-muted-foreground mt-2">
            <li>Refreshing the page</li>
            <li>Retrying your last action</li>
            <li>Returning to the home page</li>
          </ul>
        </CardContent>
        
        <CardFooter className="flex gap-2 flex-wrap">
          <Button variant="default" onClick={handleRetry} disabled={!resetErrorBoundary}>
            Retry
          </Button>
          <Button variant="outline" onClick={handleGoHome}>
            Go to Home
          </Button>
          <Button variant="ghost" onClick={handleReload}>
            Reload Page
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}