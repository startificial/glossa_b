import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatRelativeTime } from "@/lib/utils";
import { Requirement } from "@/lib/types";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PriorityRequirementsProps {
  projectId: number;
}

export function PriorityRequirements({ projectId }: PriorityRequirementsProps) {
  const { data: requirements, isLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}/requirements/high-priority`],
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>High Priority Requirements</CardTitle>
        <a href={`/projects/${projectId}`} className="text-sm text-primary hover:text-blue-700">View all</a>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {[1, 2, 3, 4].map((i) => (
              <li key={i} className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-72 mb-1" />
                      <Skeleton className="h-3 w-36" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {requirements?.map((req: Requirement) => (
              <li key={req.id} className="px-0 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-red-100 dark:bg-red-800">
                      <span className="text-sm font-medium leading-none text-red-800 dark:text-red-300">HP</span>
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {req.text}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {req.codeId} • {req.category.charAt(0).toUpperCase() + req.category.slice(1)} • From: {req.source || "Manual"}
                    </p>
                  </div>
                </div>
                <div className="ml-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                        <MoreHorizontal className="h-5 w-5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => window.location.href = `/projects/${projectId}`}>
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem>Edit Requirement</DropdownMenuItem>
                      <DropdownMenuItem>Change Priority</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
