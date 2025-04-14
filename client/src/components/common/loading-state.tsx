import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface LoadingStateProps {
  /**
   * Optional text to display under the loading indicator
   */
  text?: string;
  
  /**
   * Optional className for styling
   */
  className?: string;
  
  /**
   * Whether to show a spinner or skeleton
   * @default 'spinner'
   */
  variant?: 'spinner' | 'skeleton';
  
  /**
   * Skeleton count when variant is 'skeleton'
   * @default 3
   */
  skeletonCount?: number;
  
  /**
   * Height of each skeleton item
   * @default 'h-12'
   */
  skeletonHeight?: string;
}

/**
 * Loading State Component
 * 
 * Reusable loading indicator for consistent UI across the application
 */
export function LoadingState({ 
  text = 'Loading...', 
  className = '',
  variant = 'spinner',
  skeletonCount = 3,
  skeletonHeight = 'h-12'
}: LoadingStateProps) {
  // Default container class if none provided
  const containerClass = `flex ${
    variant === 'spinner' ? 'flex-col' : 'flex-col'
  } items-center justify-center p-8 ${className}`;
  
  if (variant === 'skeleton') {
    return (
      <div className={`space-y-3 w-full ${className}`}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <Skeleton 
            key={i} 
            className={`w-full ${skeletonHeight} rounded-md`} 
          />
        ))}
      </div>
    );
  }
  
  return (
    <div className={containerClass}>
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      {text && (
        <p className="mt-2 text-sm text-muted-foreground">{text}</p>
      )}
    </div>
  );
}

/**
 * Empty State Component
 * 
 * Shows a message when data is empty
 */
export function EmptyState({
  title = 'No data available',
  message = 'There is no data to display.',
  className = '',
  children
}: {
  title?: string;
  message?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={`p-8 text-center ${className}`}>
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
        {title}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {message}
      </p>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}