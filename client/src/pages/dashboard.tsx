import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Project } from "@/lib/types";
import { ProjectCard } from "@/components/projects/project-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { PlusIcon } from "lucide-react";
import { useLocation } from "wouter";
import { GlobalActivityFeed } from "@/components/dashboard/global-activity-feed";
import glossaLogo from "../assets/glossa-logo.png";

export default function Dashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const { 
    data: projects, 
    isLoading, 
    error 
  } = useQuery<Project[]>({
    queryKey: ['/api/projects']
  });
  
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load projects. Please try again later.",
        variant: "destructive"
      });
    }
  }, [error, toast]);

  const navigateToProjects = () => {
    setLocation('/projects');
  };

  return (
    <div className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <div className="flex justify-end">
            <Button onClick={navigateToProjects} className="shadow-sm">
              <PlusIcon className="mr-2 h-4 w-4" />
              Create New Project
            </Button>
          </div>
        </header>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Recent Projects</h2>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48">
                  <Skeleton className="h-full w-full rounded-lg" />
                </div>
              ))}
            </div>
          ) : projects && projects.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.slice(0, 3).map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No projects yet</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Create your first project to start generating requirements
              </p>
              <Button onClick={navigateToProjects}>
                Create Your First Project
              </Button>
            </div>
          )}
        </section>
        
        <section>
          <GlobalActivityFeed />
        </section>
      </div>
    </div>
  );
}
