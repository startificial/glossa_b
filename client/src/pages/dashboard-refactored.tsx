import { ProjectCard } from "@/components/projects/project-card-refactored";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { GlobalActivityFeed } from "@/components/dashboard/global-activity-feed-refactored";
import { useProjects } from "@/hooks/use-projects";
import { useErrorHandler } from "@/hooks/use-error-handler";
import { ErrorBoundary } from "@/components/common/error-boundary";
import { LoadingState, EmptyState } from "@/components/common/loading-state";
import { ProjectWithStringDates } from "@/types/extended-types";

/**
 * Dashboard Page Component
 * 
 * Shows recent projects and global activity
 */
export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { handleQueryError } = useErrorHandler();
  
  // Fetch projects data
  const { 
    projects, 
    isLoading, 
    error 
  } = useProjects();
  
  // Handle errors automatically
  handleQueryError(error, {
    title: "Error loading projects",
    fallbackMessage: "Failed to load projects. Please try again later."
  });
  
  const navigateToProjects = () => {
    setLocation('/projects');
  };

  // Cast projects to the correct type with string dates
  const projectsWithStringDates = projects as unknown as ProjectWithStringDates[];

  return (
    <div className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-900">
      <ErrorBoundary>
        <div className="max-w-7xl mx-auto">
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Recent Projects</h2>
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <LoadingState variant="skeleton" skeletonCount={3} skeletonHeight="h-48" />
              </div>
            ) : !projectsWithStringDates || projectsWithStringDates.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
                <EmptyState 
                  title="No projects yet" 
                  message="Create your first project to start generating requirements"
                >
                  <Button onClick={navigateToProjects}>
                    Create Your First Project
                  </Button>
                </EmptyState>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {projectsWithStringDates.slice(0, 3).map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            )}
          </section>
          
          <section>
            <GlobalActivityFeed />
          </section>
        </div>
      </ErrorBoundary>
    </div>
  );
}