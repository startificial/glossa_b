import { useState, useEffect } from "react";
import { Project } from "@/lib/types";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectForm } from "@/components/projects/project-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as projectService from "@/services/api/projectService";
import { useProjects } from "@/hooks/use-projects";

export default function Projects() {
  const { toast } = useToast();
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  
  // Use the specialized hook instead of direct query
  const { 
    projects, 
    isLoading, 
    error, 
    refetch
  } = useProjects();
  
  // Using useEffect to handle error toast to prevent infinite rendering
  // This ensures the toast is only shown once when an error occurs
  useEffect(() => {
    if (error) {
      console.error("Project fetch error:", error);
      toast({
        title: "Error",
        description: "Failed to load projects. Please try again later.",
        variant: "destructive"
      });
    }
  }, [error, toast]);

  const handleCreateProject = () => {
    console.log("Opening project modal");
    setIsProjectModalOpen(true);
  };

  const handleProjectCreated = () => {
    console.log("Project created, closing modal and refetching");
    setIsProjectModalOpen(false);
    refetch();
  };

  return (
    <div className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Projects</h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Create and manage your projects
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <Button onClick={handleCreateProject} className="shadow-sm">
                <PlusIcon className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </div>
          </div>
        </header>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-48">
                <Skeleton className="h-full w-full rounded-lg" />
              </div>
            ))}
          </div>
        ) : projects && projects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center max-w-md mx-auto">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary bg-opacity-10 mx-auto mb-4">
              <PlusIcon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No projects yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Get started by creating your first project
            </p>
            <Button onClick={handleCreateProject}>
              Create Project
            </Button>
          </div>
        )}
      </div>

      <ProjectForm 
        isOpen={isProjectModalOpen} 
        onClose={() => {
          console.log("ProjectForm onClose called");
          setIsProjectModalOpen(false);
        }} 
      />
    </div>
  );
}
