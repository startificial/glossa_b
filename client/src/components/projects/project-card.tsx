import { Link } from "wouter";
import { formatRelativeTime } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Project } from "@/lib/types";
import { FolderOpenIcon, ArrowRightIcon, BuildingIcon } from "lucide-react";

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="h-full hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="flex items-center">
              <FolderOpenIcon className="h-5 w-5 text-primary mr-2" />
              <CardTitle className="text-lg">{project.name}</CardTitle>
            </div>
            <div className="text-xs text-muted-foreground">
              {formatRelativeTime(project.updatedAt)}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {project.description || "No description provided."}
          </p>
          
          {/* Customer information */}
          {project.customerDetails && (
            <div className="mb-3 flex items-center text-xs text-muted-foreground border-l-2 border-primary pl-2">
              <BuildingIcon className="h-3.5 w-3.5 mr-1.5 text-primary" />
              <div className="flex flex-col">
                <span className="font-medium">{project.customerDetails.name}</span>
                {project.customerDetails.industry && (
                  <span className="text-xs opacity-80">{project.customerDetails.industry}</span>
                )}
              </div>
            </div>
          )}
          
          {/* Legacy customer field fallback */}
          {!project.customerDetails && project.customer && (
            <div className="mb-3 flex items-center text-xs text-muted-foreground border-l-2 border-primary pl-2">
              <BuildingIcon className="h-3.5 w-3.5 mr-1.5 text-primary" />
              <span>
                {typeof project.customer === 'string' 
                  ? project.customer 
                  : (project.customer as Customer).name}
              </span>
            </div>
          )}
          
          {/* Systems information */}
          {(project.sourceSystem || project.targetSystem) && (
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
          )}
          
          <div className="flex items-center text-xs text-muted-foreground">
            <span className="inline-flex items-center px-2 py-1 rounded-full bg-primary/10 text-primary max-w-full truncate">
              {project.type}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
