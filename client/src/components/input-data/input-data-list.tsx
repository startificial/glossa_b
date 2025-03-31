import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatBytes, formatRelativeTime, getFileIcon } from "@/lib/utils";
import { InputData } from "@/lib/types";
import { Eye, Download, FileText, FileAudio, FileVideo, File, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

interface InputDataListProps {
  projectId: number;
}

export function InputDataList({ projectId }: InputDataListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [processingItems, setProcessingItems] = useState<InputData[]>([]);
  const processingIdsRef = useRef<Set<number>>(new Set());
  const completedIdsRef = useRef<Set<number>>(new Set());
  
  const { 
    data: inputDataList, 
    isLoading 
  } = useQuery<InputData[]>({
    queryKey: [`/api/projects/${projectId}/input-data`],
    refetchInterval: (data) => {
      // If any input data is processing, refetch every 2 seconds
      if (data && Array.isArray(data)) {
        return data.some((item: InputData) => item.status === 'processing') ? 2000 : false;
      }
      return false;
    }
  });
  
  // Track and handle status transitions
  useEffect(() => {
    if (!inputDataList) return;
    
    // Update currently processing items
    const currentProcessingItems = inputDataList.filter(
      (item: InputData) => item.status === 'processing'
    );
    
    // Create a set of processing IDs for current items
    const currentProcessingIds = new Set(currentProcessingItems.map(item => item.id));
    
    // Create a deep copy of current processing items to avoid infinite update issue
    const currentProcessingItemsCopy = [...currentProcessingItems];
    
    // Track which previously processing items are now completed
    if (processingItems.length > 0) {
      // Check each previously processing item to see if it's no longer processing
      processingItems.forEach(prevItem => {
        const isStillProcessing = currentProcessingIds.has(prevItem.id);
        const hasBeenNotified = completedIdsRef.current.has(prevItem.id);
        
        // If an item was processing before but isn't now, and we haven't notified about it yet
        if (!isStillProcessing && !hasBeenNotified) {
          // Add to completed set to avoid repeated notifications
          completedIdsRef.current.add(prevItem.id);
          
          // Find the current state of the file
          const completedFile = inputDataList.find(item => item.id === prevItem.id);
          
          if (completedFile && completedFile.status === 'completed') {
            // Notify about the completed file
            toast({
              title: "Processing complete",
              description: `Requirements generated from ${completedFile.name}`,
            });
            
            // Immediately refresh requirements data
            queryClient.invalidateQueries({ 
              queryKey: [`/api/projects/${projectId}/requirements`] 
            });
            queryClient.invalidateQueries({ 
              queryKey: [`/api/projects/${projectId}/requirements/high-priority`] 
            });
          } else if (completedFile && completedFile.status === 'failed') {
            // Notify about the failed file
            toast({
              title: "Processing failed",
              description: `Failed to generate requirements from ${completedFile.name}`,
              variant: "destructive"
            });
          }
        }
      });
    }
    
    // Only update processing items state if there's an actual change
    const hasChanged = processingItems.length !== currentProcessingItems.length ||
      processingItems.some(item => !currentProcessingIds.has(item.id)) ||
      currentProcessingItems.some(item => !processingIdsRef.current.has(item.id));
    
    if (hasChanged) {
      // Update tracking refs
      processingIdsRef.current = currentProcessingIds;
      // Update state (only if changed to prevent infinite loop)
      setProcessingItems(currentProcessingItemsCopy);
    }
    
    // Setup ongoing polling if items are still processing
    let processingInterval: NodeJS.Timeout | null = null;
    
    if (currentProcessingItems.length > 0) {
      processingInterval = setInterval(() => {
        // Refresh both input data (to catch status changes) and requirements data
        queryClient.invalidateQueries({ 
          queryKey: [`/api/projects/${projectId}/input-data`]
        });
        queryClient.invalidateQueries({ 
          queryKey: [`/api/projects/${projectId}/requirements`] 
        });
        queryClient.invalidateQueries({ 
          queryKey: [`/api/projects/${projectId}/requirements/high-priority`] 
        });
      }, 3000); // Poll every 3 seconds
    }
    
    // Cleanup interval when component unmounts or dependencies change
    return () => {
      if (processingInterval) {
        clearInterval(processingInterval);
      }
    };
  }, [inputDataList, projectId, queryClient, toast, processingItems]);

  const getFileTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'audio':
        return <FileAudio className="h-4 w-4" />;
      case 'video':
        return <FileVideo className="h-4 w-4" />;
      case 'document':
      case 'text':
      case 'pdf':
        return <FileText className="h-4 w-4" />;
      default:
        return <File className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string, processed: boolean) => {
    if (status === 'processing') {
      return (
        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700">
          Processing
        </Badge>
      );
    } else if (status === 'failed') {
      return (
        <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200 border-red-200 dark:border-red-700">
          Failed
        </Badge>
      );
    } else if (processed) {
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200 border-green-200 dark:border-green-700">
          Requirements Generated
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700">
          Ready
        </Badge>
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Input Data Sources</CardTitle>
        <CardDescription>Manage your uploaded input data files.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : inputDataList?.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">No input data sources yet. Upload files to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inputDataList?.map((item: InputData) => (
                  <TableRow key={item.id}>
                    <TableCell className="flex items-center">
                      {getFileTypeIcon(item.type)}
                      <span className="ml-2 font-medium">{item.name}</span>
                    </TableCell>
                    <TableCell className="capitalize">{item.type}</TableCell>
                    <TableCell className="capitalize">
                      {item.contentType ? item.contentType.replace('_', ' ') : 'General'}
                    </TableCell>
                    <TableCell>{formatBytes(item.size)}</TableCell>
                    <TableCell>{formatRelativeTime(item.createdAt)}</TableCell>
                    <TableCell>
                      {getStatusBadge(item.status, item.processed)}
                      {item.status === 'processing' && (
                        <div className="mt-2">
                          <div className="flex items-center space-x-2">
                            <Progress value={65} className="h-2" />
                            <RefreshCw className="h-3 w-3 animate-spin text-yellow-600 dark:text-yellow-400" />
                          </div>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <p className="text-xs text-muted-foreground mt-1">Extracting requirements with AI...</p>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">This process may take a few minutes depending on file size and complexity</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-primary hover:text-blue-700 dark:hover:text-blue-400"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
