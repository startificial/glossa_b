import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { downloadJSON } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ExportData, Project } from "@/lib/types";
import { Plus, Download, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProjectHeaderProps {
  projectId: number;
  onAddInputData: () => void;
}

export function ProjectHeader({ projectId, onAddInputData }: ProjectHeaderProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const { data: project, isLoading } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", `/api/projects/${projectId}/export`);
      return response.json() as Promise<ExportData>;
    },
    onSuccess: (data) => {
      downloadJSON(data, `${data.project.name.replace(/\s+/g, '_')}_requirements.json`);
      toast({
        title: "Success",
        description: "Requirements exported successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to export requirements: ${error.message}`,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsExporting(false);
    }
  });

  const handleExport = () => {
    setIsExporting(true);
    exportMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="flex space-x-3">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-9 w-9 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Project not found</h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{project.name}</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {project.description || "No description provided."}
            </p>
          </div>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              size="sm"
              className="text-sm"
              onClick={onAddInputData}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Input Data
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-sm"
              onClick={handleExport}
              disabled={isExporting}
            >
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? "Exporting..." : "Export Requirements"}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Project Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Edit Project</DropdownMenuItem>
                <DropdownMenuItem>Duplicate Project</DropdownMenuItem>
                <DropdownMenuItem>Archive Project</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600 dark:text-red-400">
                  Delete Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}
