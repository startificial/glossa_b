import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Project } from "@/lib/types";
import { ProjectCard } from "@/components/projects/project-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { PlusIcon } from "lucide-react";
import { useLocation } from "wouter";

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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome to Glossa</h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Intelligent requirements generation and management platform
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <Button onClick={navigateToProjects} className="shadow-sm">
                <PlusIcon className="mr-2 h-4 w-4" />
                Create New Project
              </Button>
            </div>
          </div>
        </header>

        <section className="mb-10">
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
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary bg-opacity-10 mb-4">
                <svg className="h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h10M7 16h10" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Generate Requirements</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Automatically extract requirements from various input sources including audio, video, and text documents.
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary bg-opacity-10 mb-4">
                <svg className="h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Organize & Prioritize</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Easily organize requirements into categories and set priorities to focus on what matters most.
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary bg-opacity-10 mb-4">
                <svg className="h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Export & Share</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Export your project requirements in various formats to share with stakeholders and team members.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
