import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
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

interface ActivityWithProjectAndUser extends Activity {
  projectName: string;
  user?: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    company: string | null;
    avatarUrl: string | null;
    createdAt: string;
  };
};

export function GlobalActivityFeed() {
  const { data: activities, isLoading } = useQuery<ActivityWithProjectAndUser[]>({
    queryKey: ['/api/activities'],
    
    // Transform the data to fix the display of user names and initials
    select: (data) => {
      return data.map(activity => {
        // Make a copy so we don't modify the cached data
        const activityCopy = { ...activity };
        
        // Ensure the activity description shows the real user name
        if (activityCopy.user && activityCopy.description.startsWith('demo')) {
          const realName = activityCopy.user.firstName && activityCopy.user.lastName
            ? `${activityCopy.user.firstName} ${activityCopy.user.lastName}`
            : activityCopy.user.username;
          
          activityCopy.description = activityCopy.description.replace('demo', realName);
        }
        
        return activityCopy;
      });
    }
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Activity Across All Projects</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {[1, 2, 3, 4, 5, 6].map((i) => (
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
        ) : !activities || activities.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No activities yet. Create a project or upload data to get started.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {activities.map((activity, index) => (
              <li key={activity.id} className="px-0 py-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <Avatar className="h-8 w-8">
                      {/* Debug output for this specific user, wrapped in fragment to avoid React node error */}
                      {process.env.NODE_ENV !== 'production' && (
                        <>
                          {console.log('User initials debug:', 
                            index,
                            activity.user?.id,
                            activity.user?.username, 
                            activity.user?.firstName, 
                            activity.user?.lastName)}
                        </>
                      )}
                      
                      {activity.user?.avatarUrl ? (
                        <AvatarImage 
                          src={activity.user.avatarUrl} 
                          alt={`${activity.user.firstName || ''} ${activity.user.lastName || ''}`} 
                        />
                      ) : (
                        <AvatarFallback>
                          {activity.user && activity.user.firstName && activity.user.lastName ? 
                            /* If we have both first and last name, use their initials */
                            `${activity.user.firstName.charAt(0)}${activity.user.lastName.charAt(0)}` :
                            
                            activity.user && activity.user.username ? 
                              /* If we only have username, extract initials from it */
                              (activity.user.username.split(/[._-\s]/).length > 1 ? 
                                /* If username has separators, use first letter of each part */
                                activity.user.username.split(/[._-\s]/)
                                  .slice(0, 2)
                                  .map(part => part.charAt(0).toUpperCase())
                                  .join('') :
                                /* Otherwise just use first two characters of username */
                                activity.user.username.substring(0, 2).toUpperCase()) :
                              
                              /* Last resort: extract from activity description if available */
                              activity.description ? 
                                (activity.description.match(/^(\w+)\s+/) ? 
                                  /* If description starts with a username pattern, use that */
                                  (activity.description.match(/^(\w+)\s+/) || ['', 'UN'])[1].substring(0, 2).toUpperCase() :
                                  /* Otherwise use first two characters of description */
                                  activity.description.substring(0, 2).toUpperCase()) :
                                
                                /* Absolute last resort, if we have nothing else */
                                'UN' /* Unknown */
                          }
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
  );
}