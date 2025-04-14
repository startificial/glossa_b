import React, { memo, useMemo } from 'react';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatRelativeTime } from '@/lib/utils';
import { useActivities } from '@/hooks/use-activities';
import { useErrorHandler } from '@/hooks/use-error-handler';
import { ErrorBoundary } from '@/components/common/error-boundary';
import { LoadingState, EmptyState } from '@/components/common/loading-state';
import { ExtendedActivityWithStringDates } from '@/types/extended-types';

/**
 * Activity Item - Memoized individual activity item component
 * This helps prevent excessive re-renders in long lists
 */
const ActivityItem = memo(({ activity }: { activity: ExtendedActivityWithStringDates }) => {
  // Memoize formatted time to prevent recalculation on render
  const formattedTime = useMemo(() => 
    formatRelativeTime(activity.createdAt), 
    [activity.createdAt]
  );
  
  // Memoize avatar content
  const avatarContent = useMemo(() => {
    if (activity.user?.avatarUrl) {
      return (
        <AvatarImage 
          src={activity.user.avatarUrl} 
          alt={`${activity.user.firstName} ${activity.user.lastName}`} 
        />
      );
    } else {
      return (
        <AvatarFallback>
          {activity.user ? 
            `${activity.user.firstName.charAt(0)}${activity.user.lastName.charAt(0)}` : 
            activity.description.substring(0, 2).toUpperCase()}
        </AvatarFallback>
      );
    }
  }, [activity.user, activity.description]);

  return (
    <li className="px-0 py-4">
      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0">
          <Avatar className="h-8 w-8">
            {avatarContent}
          </Avatar>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {activity.description}
          </p>
          <div className="flex items-center">
            <Link href={`/projects/${activity.projectId}`}>
              <span className="text-xs text-primary hover:text-primary/80 mr-2">
                {activity.projectName}
              </span>
            </Link>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formattedTime}
            </span>
          </div>
        </div>
      </div>
    </li>
  );
});

ActivityItem.displayName = 'ActivityItem';

/**
 * ActivityList - Memoized activity list component
 */
const ActivityList = memo(({ activities }: { activities: ExtendedActivityWithStringDates[] }) => {
  return (
    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
      {activities.map((activity) => (
        <ActivityItem key={activity.id} activity={activity} />
      ))}
    </ul>
  );
});

ActivityList.displayName = 'ActivityList';

/**
 * GlobalActivityFeed Component
 * 
 * Displays recent activity from all projects
 * Optimized for performance using memoization
 */
export function GlobalActivityFeed() {
  const { activities, isLoading, error } = useActivities();
  const { handleQueryError } = useErrorHandler();
  
  // Handle errors with the generic error handler
  handleQueryError(error, {
    title: 'Error loading activities',
    fallbackMessage: 'Failed to load recent activities. Please try again later.'
  });
  
  // Cast to the extended type that includes projectName and user details
  const activityData = activities as ExtendedActivityWithStringDates[] | undefined;

  // Memoize the activity content to prevent unnecessary re-renders
  const activityContent = useMemo(() => {
    if (isLoading) {
      return <LoadingState variant="skeleton" skeletonCount={6} skeletonHeight="h-16" />;
    }
    
    if (!activityData || activityData.length === 0) {
      return (
        <EmptyState 
          title="No activities yet" 
          message="Create a project or upload data to get started."
        />
      );
    }
    
    return <ActivityList activities={activityData} />;
  }, [isLoading, activityData]);

  return (
    <ErrorBoundary>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Activity Across All Projects</CardTitle>
        </CardHeader>
        <CardContent>
          {activityContent}
        </CardContent>
      </Card>
    </ErrorBoundary>
  );
}