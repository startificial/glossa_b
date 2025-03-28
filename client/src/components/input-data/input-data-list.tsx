import { useQuery } from "@tanstack/react-query";
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

interface InputDataListProps {
  projectId: number;
}

export function InputDataList({ projectId }: InputDataListProps) {
  const { data: inputDataList, isLoading } = useQuery<InputData[]>({
    queryKey: [`/api/projects/${projectId}/input-data`],
  });

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
