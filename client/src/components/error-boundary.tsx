/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing
 * the whole application.
 */
import { Component, ReactNode, ErrorInfo } from 'react';
import { logger } from '@/lib/logger';

/**
 * Props for the ErrorBoundary component
 */
interface ErrorBoundaryProps {
  /** Content to render when there is no error */
  children: ReactNode;
  /** Component to render when an error occurs */
  fallback: ReactNode;
  /** Optional callback when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

/**
 * State for the ErrorBoundary component
 */
interface ErrorBoundaryState {
  /** Whether an error has been caught */
  hasError: boolean;
  /** The error that was caught */
  error: Error | null;
}

/**
 * Error boundary component to catch and handle rendering errors
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  /**
   * Update state when an error is caught
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Log the error when it occurs
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error
    logger.error('Error caught by boundary:', {
      error: error.toString(),
      componentStack: errorInfo.componentStack,
    });

    // Call the optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  /**
   * Reset the error state
   */
  resetErrorBoundary = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    // If there's an error, render the fallback UI
    if (this.state.hasError) {
      // Check if the fallback is a function component that accepts the error and reset function
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback({
          error: this.state.error,
          resetErrorBoundary: this.resetErrorBoundary,
        });
      }
      
      // Otherwise, render the fallback as is
      return this.props.fallback;
    }

    // If there's no error, render the children
    return this.props.children;
  }
}