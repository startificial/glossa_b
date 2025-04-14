import { Link } from "wouter";
import { formatRelativeTime } from "@/lib/utils";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useActivities } from "@/hooks/use-activities";
import { useErrorHandler } from "@/hooks/use-error-handler";
import { ErrorBoundary } from "@/components/common/error-boundary";
import { LoadingState, EmptyState } from "@/components/common/loading-state";
import { ExtendedActivityWithStringDates } from "@/types/extended-types";

/**
 * Global Activity Feed Component
 * 
 * Shows recent activity across all projects
 */
export function GlobalActivityFeed() {
  const { handleQueryError } = useErrorHandler();
  
  // Use the custom activities hook with a limit of 10 activities
  const { 
    activities: activityData, 
    isLoading,
    error
  } = useActivities(10);
  
  // Handle any errors that occur during data fetching
  handleQueryError(error, {
    title: "Error loading activities",
    fallbackMessage: "Failed to load recent activities. Please try again later."
  });
  
  // Cast to the extended type that includes projectName and user details
  const activities = activityData as ExtendedActivityWithStringDates[] | undefined;

  return (
    <ErrorBoundary>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Activity Across All Projects</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingState variant="skeleton" skeletonCount={6} skeletonHeight="h-16" />
          ) : !activities || activities.length === 0 ? (
            <EmptyState 
              title="No activities yet" 
              message="Create a project or upload data to get started."
            />
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {activities.map((activity) => (
                <li key={activity.id} className="px-0 py-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <Avatar className="h-8 w-8">
                        {activity.user?.avatarUrl ? (
                          <AvatarImage 
                            src={activity.user.avatarUrl} 
                            alt={`${activity.user.firstName} ${activity.user.lastName}`} 
                          />
                        ) : (
                          <AvatarFallback>
                            {activity.user ? 
                              `${activity.user.firstName.charAt(0)}${activity.user.lastName.charAt(0)}` : 
                              activity.description.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        )}
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
                          {formatRelativeTime(activity.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </ErrorBoundary>
  );
}