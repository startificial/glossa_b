import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RequirementCard } from "@/components/requirements/requirement-card";
import { RequirementsFilter } from "@/components/requirements/requirements-filter";
import { Requirement, RequirementsFilter as FilterType } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useToast } from "@/hooks/use-toast";

interface RequirementsListProps {
  projectId: number;
}

export function RequirementsList({ projectId }: RequirementsListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterType>({});
  const [page, setPage] = useState(1);
  const itemsPerPage = 9; // 3x3 grid
  const initialMountRef = useRef(true);
  const [checkingForNew, setCheckingForNew] = useState(false);
  
  // Query for requirements data
  const { 
    data: requirements, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: [`/api/projects/${projectId}/requirements`, filter],
    queryFn: async ({ queryKey }) => {
      const [url, currentFilter] = queryKey;
      const params = new URLSearchParams();
      
      // Ensure currentFilter is treated as a FilterType object
      const typedFilter = currentFilter as FilterType;
      
      if (typedFilter.category) params.append('category', typedFilter.category);
      if (typedFilter.priority) params.append('priority', typedFilter.priority);
      if (typedFilter.source) params.append('source', typedFilter.source);
      if (typedFilter.search) params.append('search', typedFilter.search);
      
      const response = await fetch(`${url as string}?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch requirements');
      }
      return response.json();
    }
  });

  // Auto-refresh effect
  useEffect(() => {
    // Initial invalidation when component mounts
    queryClient.invalidateQueries({ 
      queryKey: [`/api/projects/${projectId}/requirements`] 
    });
    
    // Mark that we've mounted once
    initialMountRef.current = false;
    
    // Set up periodic refresh interval
    const refreshInterval = setInterval(() => {
      // Check if we should show "checking" message
      if (requirements && requirements.length === 0 && !checkingForNew) {
        setCheckingForNew(true);
        toast({
          title: "Checking for requirements",
          description: "Looking for newly generated requirements...",
          duration: 2000,
        });
      } else if (requirements && requirements.length > 0) {
        // Reset checking flag once we have requirements
        setCheckingForNew(false);
        
        // Also refresh input data when requirements are found
        // This ensures the Input Data list gets updated with completed status
        queryClient.invalidateQueries({ 
          queryKey: [`/api/projects/${projectId}/input-data`]
        });
      }
      
      // Refresh the data
      queryClient.invalidateQueries({ 
        queryKey: [`/api/projects/${projectId}/requirements`] 
      });
    }, 5000); // Check every 5 seconds
    
    // Clean up the interval on unmount
    return () => clearInterval(refreshInterval);
  }, [projectId, queryClient, toast, requirements, checkingForNew]);
  
  // Handle filtering
  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
    setPage(1); // Reset to first page when filter changes
  };

  // Calculate pagination details
  const totalRequirements = requirements?.length || 0;
  const totalPages = Math.ceil(totalRequirements / itemsPerPage);
  const startIdx = (page - 1) * itemsPerPage;
  const endIdx = Math.min(startIdx + itemsPerPage, totalRequirements);
  const currentPageRequirements = requirements?.slice(startIdx, endIdx) || [];

  // Show error toast if needed
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load requirements.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  return (
    <div className="space-y-6">
      <RequirementsFilter onFilterChange={handleFilterChange} />
      
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">Requirements List</h3>
          
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <Skeleton className="h-5 w-24" />
                    <div className="flex items-center">
                      <Skeleton className="h-6 w-6 rounded-full" />
                      <Skeleton className="ml-2 h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <Skeleton className="h-4 w-16 mb-1" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full mt-1" />
                  </div>
                  <div className="mt-4 flex justify-between">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : totalRequirements === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No requirements found. Adjust filters or add new requirements.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {currentPageRequirements.map((requirement: Requirement) => (
                  <RequirementCard 
                    key={requirement.id} 
                    requirement={requirement} 
                    projectId={projectId}
                  />
                ))}
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      
                      {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                        let pageNumber: number;
                        if (totalPages <= 5) {
                          pageNumber = i + 1;
                        } else if (page <= 3) {
                          pageNumber = i + 1;
                          if (i === 4) return (
                            <PaginationItem key={i}>
                              <PaginationEllipsis />
                            </PaginationItem>
                          );
                        } else if (page >= totalPages - 2) {
                          pageNumber = totalPages - 4 + i;
                          if (i === 0) return (
                            <PaginationItem key={i}>
                              <PaginationEllipsis />
                            </PaginationItem>
                          );
                        } else {
                          if (i === 0) return (
                            <PaginationItem key={i}>
                              <PaginationLink onClick={() => setPage(1)}>1</PaginationLink>
                            </PaginationItem>
                          );
                          if (i === 1) return (
                            <PaginationItem key={i}>
                              <PaginationEllipsis />
                            </PaginationItem>
                          );
                          if (i === 3) return (
                            <PaginationItem key={i}>
                              <PaginationEllipsis />
                            </PaginationItem>
                          );
                          if (i === 4) return (
                            <PaginationItem key={i}>
                              <PaginationLink onClick={() => setPage(totalPages)}>{totalPages}</PaginationLink>
                            </PaginationItem>
                          );
                          pageNumber = page;
                        }
                        
                        return (
                          <PaginationItem key={i}>
                            <PaginationLink 
                              isActive={pageNumber === page}
                              onClick={() => setPage(pageNumber)}
                            >
                              {pageNumber}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                          className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                  
                  <div className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
                    Showing {startIdx + 1} to {endIdx} of {totalRequirements} requirements
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}