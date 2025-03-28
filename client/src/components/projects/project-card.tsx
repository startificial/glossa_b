import { Link } from "wouter";
import { formatRelativeTime } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Project } from "@/lib/types";
import { FolderOpenIcon } from "lucide-react";

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link href={`/projects/${project.id}`}>
      <a className="block h-full">
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
            <p className="text-sm text-muted-foreground line-clamp-2">
              {project.description || "No description provided."}
            </p>
            <div className="mt-3 flex items-center text-xs text-muted-foreground">
              <span className="inline-flex items-center px-2 py-1 rounded-full bg-primary/10 text-primary">
                {project.type}
              </span>
            </div>
          </CardContent>
        </Card>
      </a>
    </Link>
  );
}
