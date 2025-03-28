import { useQuery } from "@tanstack/react-query";
import { formatRelativeTime } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList, Upload, AlertTriangle, Clock } from "lucide-react";

interface MetricsCardProps {
  projectId: number;
}

export function MetricsCard({ projectId }: MetricsCardProps) {
  // Get requirements count
  const { data: requirements, isLoading: isLoadingRequirements } = useQuery({
    queryKey: [`/api/projects/${projectId}/requirements`]
  });

  // Get input data count
  const { data: inputData, isLoading: isLoadingInputData } = useQuery({
    queryKey: [`/api/projects/${projectId}/input-data`]
  });

  // Get high priority requirements count
  const { data: highPriorityRequirements, isLoading: isLoadingHighPriority } = useQuery({
    queryKey: [`/api/projects/${projectId}/requirements/high-priority`]
  });

  // Get project details for last updated
  const { data: project, isLoading: isLoadingProject } = useQuery({
    queryKey: [`/api/projects/${projectId}`]
  });

  const isLoading = isLoadingRequirements || isLoadingInputData || isLoadingHighPriority || isLoadingProject;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <Skeleton className="h-12 w-12 rounded-md" />
                <div className="ml-5 w-0 flex-1">
                  <Skeleton className="h-4 w-28 mb-2" />
                  <Skeleton className="h-6 w-12" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const totalRequirements = requirements?.length || 0;
  const inputDataSources = inputData?.length || 0;
  const highPriorityCount = highPriorityRequirements?.length || 0;
  const lastUpdated = project?.updatedAt || null;

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Requirements */}
      <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-primary bg-opacity-10 rounded-md p-3">
              <ClipboardList className="h-6 w-6 text-primary" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Total Requirements
                </dt>
                <dd>
                  <div className="text-lg font-medium text-gray-900 dark:text-white">
                    {totalRequirements}
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Input Data Sources */}
      <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-green-100 dark:bg-green-900 rounded-md p-3">
              <Upload className="h-6 w-6 text-green-600 dark:text-green-300" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Input Data Sources
                </dt>
                <dd>
                  <div className="text-lg font-medium text-gray-900 dark:text-white">
                    {inputDataSources}
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* High Priority */}
      <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-red-100 dark:bg-red-900 rounded-md p-3">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-300" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  High Priority
                </dt>
                <dd>
                  <div className="text-lg font-medium text-gray-900 dark:text-white">
                    {highPriorityCount}
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Last Updated */}
      <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-yellow-100 dark:bg-yellow-900 rounded-md p-3">
              <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-300" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Last Updated
                </dt>
                <dd>
                  <div className="text-lg font-medium text-gray-900 dark:text-white">
                    {lastUpdated ? formatRelativeTime(lastUpdated) : "N/A"}
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
