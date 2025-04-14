import React, { memo, useMemo } from 'react';
import { Link } from "wouter";
import { formatRelativeTime } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderOpenIcon, ArrowRightIcon, BuildingIcon } from "lucide-react";
import { ProjectWithStringDates } from "@/types/extended-types";
import { ErrorBoundary } from "@/components/common/error-boundary";

interface ProjectCardProps {
  project: ProjectWithStringDates;
}

/**
 * Project Card Component (Optimized with memoization)
 * 
 * Displays a summary of a project with customer and system information
 * Uses memoization to prevent unnecessary re-renders
 */
function ProjectCardComponent({ project }: ProjectCardProps) {
  // Memoize the formatted time to prevent recalculation on every render
  const formattedTime = useMemo(() => 
    formatRelativeTime(project.updatedAt), 
    [project.updatedAt]
  );

  // Memoize customer display logic
  const customerDisplay = useMemo(() => {
    const customerDetails = (project as any).customerDetails;
    
    if (customerDetails) {
      return (
        <div className="mb-3 flex items-center text-xs text-muted-foreground border-l-2 border-primary pl-2">
          <BuildingIcon className="h-3.5 w-3.5 mr-1.5 text-primary" />
          <div className="flex flex-col">
            <span className="font-medium">{customerDetails.name}</span>
            {customerDetails.industry && (
              <span className="text-xs opacity-80">{customerDetails.industry}</span>
            )}
          </div>
        </div>
      );
    }
    
    if (project.customer) {
      return (
        <div className="mb-3 flex items-center text-xs text-muted-foreground border-l-2 border-primary pl-2">
          <BuildingIcon className="h-3.5 w-3.5 mr-1.5 text-primary" />
          <span>
            {typeof project.customer === 'string' 
              ? project.customer 
              : (project.customer as any).name}
          </span>
        </div>
      );
    }
    
    return null;
  }, [project.customer, (project as any).customerDetails]);

  // Memoize systems display logic
  const systemsDisplay = useMemo(() => {
    if (!project.sourceSystem && !project.targetSystem) {
      return null;
    }
    
    return (
      <div className="mb-3 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-2">
          {project.sourceSystem && (
            <div className="flex items-center flex-shrink-0">
              <span className="font-medium mr-1 whitespace-nowrap">From:</span> 
              <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 max-w-[120px] truncate">
                {project.sourceSystem}
              </span>
            </div>
          )}
          
          {project.sourceSystem && project.targetSystem && (
            <ArrowRightIcon className="h-3 w-3 flex-shrink-0" />
          )}
          
          {project.targetSystem && (
            <div className="flex items-center flex-shrink-0">
              <span className="font-medium mr-1 whitespace-nowrap">To:</span>
              <span className="px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 max-w-[120px] truncate">
                {project.targetSystem}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }, [project.sourceSystem, project.targetSystem]);

  return (
    <ErrorBoundary>
      <Link href={`/projects/${project.id}`}>
        <Card className="h-full hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div className="flex items-center">
                <FolderOpenIcon className="h-5 w-5 text-primary mr-2" />
                <CardTitle className="text-lg">{project.name}</CardTitle>
              </div>
              <div className="text-xs text-muted-foreground">
                {formattedTime}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {project.description || "No description provided."}
            </p>
            
            {/* Customer information - memoized */}
            {customerDisplay}
            
            {/* Systems information - memoized */}
            {systemsDisplay}
            
            <div className="flex items-center text-xs text-muted-foreground">
              <span className="inline-flex items-center px-2 py-1 rounded-full bg-primary/10 text-primary max-w-full truncate">
                {project.type}
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>
    </ErrorBoundary>
  );
}

// Memoize the entire component to prevent re-renders when props haven't changed
export const ProjectCard = memo(ProjectCardComponent);

// Export non-memoized version for testing and specific use cases
export { ProjectCardComponent };