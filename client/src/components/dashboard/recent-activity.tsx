import { useQuery } from "@tanstack/react-query";
import { formatRelativeTime } from "@/lib/utils";
import { Activity } from "@/lib/types";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface RecentActivityProps {
  projectId: number;
}

export function RecentActivity({ projectId }: RecentActivityProps) {
  const { data: activities, isLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}/activities`],
  });

  // Mock avatar URLs for demo purposes - in a real app, these would come from the user data
  const avatarUrls = [
    "https://images.unsplash.com/photo-1550525811-e5869dd03032?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    "https://images.unsplash.com/photo-1491528323818-fdd1faba62cc?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
  ];

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
            {activities?.map((activity: Activity, index: number) => (
              <li key={activity.id} className="px-0 py-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={avatarUrls[index % avatarUrls.length]} alt="User avatar" />
                      <AvatarFallback>
                        {activity.description.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
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
