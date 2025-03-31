import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Requirement } from "@/lib/types";
import { formatRelativeTime, getCategoryColor, getPriorityInfo } from "@/lib/utils";
import { MoreHorizontal, Trash2, Edit, Eye, ArrowRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface RequirementCardProps {
  requirement: Requirement;
  projectId: number;
  onEdit?: (requirement: Requirement) => void;
}

export function RequirementCard({ requirement, projectId, onEdit }: RequirementCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const categoryColor = getCategoryColor(requirement.category);
  const priorityInfo = getPriorityInfo(requirement.priority);
  
  const navigateToDetail = () => {
    setLocation(`/projects/${projectId}/requirements/${requirement.id}`);
  };

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/projects/${projectId}/requirements/${requirement.id}`);
    },
    onSuccess: () => {
      toast({
        title: "Requirement deleted",
        description: "The requirement has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/requirements`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/requirements/high-priority`] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete requirement: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const handleDelete = () => {
    deleteMutation.mutate();
    setIsDeleteDialogOpen(false);
  };

  return (
    <>
      <div 
        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow duration-200 cursor-pointer relative"
        onClick={navigateToDetail}
      >
        {/* View details indicator in top-right */}
        <div className="absolute top-2 right-2 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowRight className="h-4 w-4" />
        </div>
        
        <div className="flex justify-between items-start">
          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${categoryColor.bg} ${categoryColor.text} ${categoryColor.bgDark} ${categoryColor.textDark}`}>
            {requirement.category.charAt(0).toUpperCase() + requirement.category.slice(1)}
          </span>
          <div className="flex items-center">
            <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full ${priorityInfo.bgColor} ${priorityInfo.color} ${priorityInfo.bgDarkColor} ${priorityInfo.textDarkColor} text-xs font-medium`}>
              {priorityInfo.label}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className="ml-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                  onClick={(e) => e.stopPropagation()} // Prevent card click when clicking dropdown
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(requirement); }}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={navigateToDetail}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-red-600 dark:text-red-400" 
                  onClick={(e) => { e.stopPropagation(); setIsDeleteDialogOpen(true); }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="mt-2">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">{requirement.codeId}</h4>
            {requirement.name && (
              <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300">- {requirement.name}</h4>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {requirement.text}
          </p>
        </div>
        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
          <span>Source: {requirement.source || "Manual"}</span>
          <span>{formatRelativeTime(requirement.createdAt)}</span>
        </div>
      </div>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the requirement {requirement.codeId}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
