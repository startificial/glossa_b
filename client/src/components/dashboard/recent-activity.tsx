import { useQuery } from "@tanstack/react-query";
import { formatRelativeTime } from "@/lib/utils";
import { Activity, User } from "@/lib/types";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ActivityWithUser extends Activity {
  user?: {
    firstName: string;
    lastName: string;
    username: string;
    avatarUrl: string | null;
  };
}

interface RecentActivityProps {
  projectId: number;
}

export function RecentActivity({ projectId }: RecentActivityProps) {
  const { data: activities, isLoading } = useQuery<ActivityWithUser[]>({
    queryKey: [`/api/projects/${projectId}/activities`],
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Activity</CardTitle>
        <a href="#" className="text-sm text-primary hover:text-blue-700">View all</a>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {[1, 2, 3, 4].map((i) => (
              <li key={i} className="py-4">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="min-w-0 flex-1">
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {activities?.map((activity: ActivityWithUser) => (
              <li key={activity.id} className="px-0 py-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <Avatar className="h-8 w-8">
                      {activity.user?.avatarUrl ? (
                        <AvatarImage src={activity.user.avatarUrl} alt={`${activity.user.firstName} ${activity.user.lastName}`} />
                      ) : (
                        <AvatarFallback>
                          {activity.user?.firstName?.charAt(0) || ""}
                          {activity.user?.lastName?.charAt(0) || ""}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {activity.description}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatRelativeTime(activity.createdAt)}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
