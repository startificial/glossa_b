/**
 * Spinner Component
 * 
 * A reusable loading spinner component with different size options.
 */
import { cn } from '@/lib/utils';

/**
 * Props for the Spinner component
 */
interface SpinnerProps {
  /** Optional CSS class to apply to the spinner */
  className?: string;
  /** Size of the spinner: 'sm', 'md', 'lg', or 'xl' */
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Spinner component
 */
export function Spinner({ className, size = 'md' }: SpinnerProps) {
  // Size classes
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-6 w-6 border-2',
    lg: 'h-8 w-8 border-3',
    xl: 'h-12 w-12 border-4',
  };

  return (
    <div
      className={cn(
        'inline-block animate-spin rounded-full border-solid border-current border-t-transparent text-primary',
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}