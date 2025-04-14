/**
 * Error Handling Hook
 * 
 * A custom hook for handling errors consistently across the application.
 * This provides a standardized way to display error messages to users
 * and handle different types of errors appropriately.
 */
import { useCallback } from 'react';
import { useToast } from './use-toast';
import { useLocation, useNavigate } from 'wouter';
import { Button } from '@/components/ui/button';

/**
 * Error response shape from the backend
 */
interface ApiErrorResponse {
  code: string;
  message: string;
  statusCode: number;
  timestamp: string;
  path?: string;
  validationErrors?: Record<string, string[]>;
  requestId?: string;
}

/**
 * Hook for handling errors consistently
 */
export function useErrorHandler() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const navigateTo = useNavigate();
  
  /**
   * Handle API errors consistently
   */
  const handleApiError = useCallback((
    error: any,
    options?: {
      title?: string;
      fallbackMessage?: string;
      actionLabel?: string;
      onAction?: () => void;
      redirectTo?: string;
    }
  ) => {
    console.error('API Error:', error);
    
    // Extract error details
    const apiError = extractApiError(error);
    const errorMessage = apiError?.message || options?.fallbackMessage || 'An unexpected error occurred';
    const statusCode = apiError?.statusCode || 500;
    
    // Handle based on status code
    if (statusCode === 401) {
      // Authentication error - redirect to login
      toast({
        title: 'Authentication Required',
        description: 'Please log in to continue',
        variant: 'destructive',
      });
      navigate('/login');
      return;
    }
    
    if (statusCode === 403) {
      // Authorization error
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to perform this action',
        variant: 'destructive',
      });
      return;
    }
    
    if (statusCode === 404) {
      // Not found error
      toast({
        title: 'Not Found',
        description: errorMessage,
        variant: 'destructive',
        action: options?.actionLabel ? {
          label: options.actionLabel,
          onClick: options.onAction || (() => navigate('/'))
        } : undefined
      });
      
      if (options?.redirectTo) {
        navigate(options.redirectTo);
      }
      
      return;
    }
    
    // Form validation errors (422, 400)
    if (apiError?.validationErrors && (statusCode === 422 || statusCode === 400)) {
      // Get the first validation error message
      const firstField = Object.keys(apiError.validationErrors)[0];
      const firstMessage = apiError.validationErrors[firstField]?.[0];
      
      toast({
        title: options?.title || 'Validation Error',
        description: firstMessage || errorMessage,
        variant: 'destructive',
      });
      
      return;
    }
    
    // Generic error
    toast({
      title: options?.title || 'Error',
      description: errorMessage,
      variant: 'destructive',
      action: options?.actionLabel ? (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={options.onAction || (() => {})}
        >
          {options.actionLabel}
        </Button>
      ) : undefined
    });
    
    // Redirect if specified
    if (options?.redirectTo) {
      navigate(options.redirectTo);
    }
  }, [toast, navigate]);
  
  /**
   * Handle validation errors
   */
  const handleValidationErrors = useCallback((
    errors: Record<string, string[]>,
    options?: {
      title?: string;
    }
  ) => {
    // Get the first validation error message
    const firstField = Object.keys(errors)[0];
    const firstMessage = errors[firstField]?.[0];
    
    toast({
      title: options?.title || 'Validation Error',
      description: firstMessage || 'Please check the form for errors',
      variant: 'destructive',
    });
  }, [toast]);
  
  return {
    handleApiError,
    handleValidationErrors,
  };
}

/**
 * Extract error details from various error formats
 */
function extractApiError(error: any): ApiErrorResponse | null {
  // Already in the expected format
  if (error && error.code && error.statusCode) {
    return error as ApiErrorResponse;
  }
  
  // Axios error
  if (error?.response?.data) {
    return error.response.data as ApiErrorResponse;
  }
  
  // Error from fetch API
  if (error?.json && typeof error.json === 'function') {
    try {
      const data = error.json();
      if (data.code && data.statusCode) {
        return data as ApiErrorResponse;
      }
    } catch (e) {
      // Ignore parsing error
    }
  }
  
  // Unknown format, create a basic error structure
  if (error instanceof Error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message,
      statusCode: 500,
      timestamp: new Date().toISOString(),
    };
  }
  
  // Couldn't extract structured error info
  return null;
}