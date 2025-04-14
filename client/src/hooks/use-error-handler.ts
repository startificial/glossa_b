/**
 * Error Handler Hook
 * 
 * Custom hook for consistent error handling in components
 */
import { useEffect } from 'react';
import { useToast } from './use-toast';

type ErrorOptions = {
  title?: string;
  fallbackMessage?: string;
  action?: () => void;
  actionLabel?: string;
};

/**
 * Hook to consistently handle errors across components
 */
export function useErrorHandler() {
  const { toast } = useToast();
  
  /**
   * Handle an error with optional custom title and fallback message
   */
  const handleError = (error: unknown, options: ErrorOptions = {}) => {
    const {
      title = 'An error occurred',
      fallbackMessage = 'Something went wrong. Please try again.',
      action,
      actionLabel
    } = options;
    
    // Extract error message based on error type
    let message = fallbackMessage;
    
    if (error instanceof Error) {
      message = error.message || fallbackMessage;
    } else if (typeof error === 'string') {
      message = error;
    } else if (error && typeof error === 'object' && 'message' in error) {
      message = String((error as { message: unknown }).message);
    }
    
    // Show toast with error details
    toast({
      title,
      description: message,
      variant: 'destructive',
      action: action ? {
        label: actionLabel || 'Retry',
        onClick: action
      } : undefined
    });
    
    // Also log to console for debugging
    console.error(title, error);
    
    return message;
  };
  
  /**
   * Hook into a React Query error for automatic handling
   */
  const handleQueryError = (
    error: unknown | null | undefined, 
    options: ErrorOptions = {}
  ) => {
    useEffect(() => {
      if (error) {
        handleError(error, options);
      }
    }, [error]);
  };
  
  return {
    handleError,
    handleQueryError
  };
}