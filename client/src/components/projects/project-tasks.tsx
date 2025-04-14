import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { ImplementationTask, Requirement } from '@/lib/types';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Clock, 
  ArrowUpDown, 
  AlertTriangle, 
  CheckCircle2, 
  Hourglass, 
  Target, 
  Database, 
  CloudCog 
} from 'lucide-react';

interface ProjectTasksProps {
  projectId: number;
}

// Custom hook to fetch tasks for multiple requirements
function useRequirementsTasks(requirementIds: number[] = []) {
  // Ensure requirementIds is an array before mapping
  const safeRequirementIds = Array.isArray(requirementIds) ? requirementIds : [];
  
  // We always return an object with the same structure
  // to maintain hook calling order consistency
  const isLoading = useRef(false);
  const isError = useRef(false);
  const queryResults = useRef<Array<ReturnType<typeof useQuery>>>([]);
  
  // Fixed maximum number of queries we'll support
  // This ensures we always call the same number of hooks
  const MAX_QUERIES = 50;
  
  // Create an array of fixed size to hold our queries
  const queries: Array<ReturnType<typeof useQuery>> = [];
  
  // First, create all the required queries for actual requirement IDs
  for (let i = 0; i < Math.min(safeRequirementIds.length, MAX_QUERIES); i++) {
    const reqId = safeRequirementIds[i];
    const query = useQuery<ImplementationTask[]>({
      queryKey: [`/api/requirements/${reqId}/tasks`],
      enabled: !!reqId,
    });
    queries.push(query);
  }
  
  // Then fill the rest with disabled queries to maintain the hook call count
  for (let i = safeRequirementIds.length; i < MAX_QUERIES; i++) {
    const query = useQuery<ImplementationTask[]>({
      queryKey: [`/api/requirements/placeholder-${i}/tasks`],
      enabled: false, // This query will never run
    });
    queries.push(query);
  }
  
  // Combine all task data with useMemo to avoid unnecessary recalculations
  const allTasks = useMemo(() => {
    // Only use the actual queries that correspond to real requirement IDs
    const activeQueries = queries.slice(0, safeRequirementIds.length);
    
    // Update loading and error states
    isLoading.current = activeQueries.some(query => query.isLoading);
    isError.current = activeQueries.some(query => query.isError);
    
    // Store query results for debugging if needed
    queryResults.current = activeQueries;
    
    return activeQueries.reduce((acc: ImplementationTask[], query) => {
      if (query.data && Array.isArray(query.data)) {
        return [...acc, ...query.data];
      }
      return acc;
    }, []);
  }, [queries, safeRequirementIds]);

  return { 
    data: allTasks, 
    isLoading: isLoading.current, 
    isError: isError.current 
  };
}

export function ProjectTasks({ projectId }: ProjectTasksProps) {
  const [selectedTab, setSelectedTab] = useState("all");
  const [, setLocation] = useLocation();

  // Fetch all requirements for this project
  const { data: requirements, isLoading: requirementsLoading } = useQuery<Requirement[]>({
    queryKey: [`/api/projects/${projectId}/requirements`],
  });

  // Extract requirement IDs
  const requirementIds = useMemo(() => {
    if (!requirements || !Array.isArray(requirements)) return [];
    return requirements.map((req: any) => req.id);
  }, [requirements]);

  // Use our custom hook to fetch all tasks
  const { data: tasks = [], isLoading: tasksLoading } = useRequirementsTasks(requirementIds);

  const filteredTasks = tasks
    ? tasks.filter((task: ImplementationTask) => {
        if (selectedTab === "all") return true;
        if (selectedTab === "source") return task.system === "source";
        if (selectedTab === "target") return task.system === "target";
        if (selectedTab === "pending") return task.status === "pending";
        if (selectedTab === "in-progress") return task.status === "in-progress";
        if (selectedTab === "completed") return task.status === "completed";
        return true;
      })
    : [];

  const sourceCount = tasks?.filter((task: ImplementationTask) => task.system === "source").length || 0;
  const targetCount = tasks?.filter((task: ImplementationTask) => task.system === "target").length || 0;
  const pendingCount = tasks?.filter((task: ImplementationTask) => task.status === "pending").length || 0;
  const inProgressCount = tasks?.filter((task: ImplementationTask) => task.status === "in-progress").length || 0;
  const completedCount = tasks?.filter((task: ImplementationTask) => task.status === "completed").length || 0;

  function getStatusBadge(status: string) {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <Hourglass className="h-3 w-3" />
            <span>Pending</span>
          </Badge>
        );
      case "in-progress":
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>In Progress</span>
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            <span>Completed</span>
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  function getPriorityBadge(priority: string) {
    switch (priority) {
      case "high":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <ArrowUpDown className="h-3 w-3" />
            <span>High</span>
          </Badge>
        );
      case "medium":
        return (
          <Badge variant="default" className="flex items-center gap-1">
            <ArrowUpDown className="h-3 w-3" />
            <span>Medium</span>
          </Badge>
        );
      case "low":
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <ArrowUpDown className="h-3 w-3" />
            <span>Low</span>
          </Badge>
        );
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  }

  function getSystemBadge(system: string) {
    switch (system) {
      case "source":
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <Database className="h-3 w-3" />
            <span>Source</span>
          </Badge>
        );
      case "target":
        return (
          <Badge variant="default" className="flex items-center gap-1">
            <Target className="h-3 w-3" />
            <span>Target</span>
          </Badge>
        );
      default:
        return <Badge variant="outline">{system}</Badge>;
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Implementation Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        {requirementsLoading ? (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Skeleton className="h-10 w-16" />
              <Skeleton className="h-10 w-16" />
              <Skeleton className="h-10 w-16" />
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CloudCog className="h-16 w-16 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">No Implementation Tasks</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Tasks will appear here when you generate them from requirement details.
            </p>
          </div>
        ) : (
          <>
            <Tabs defaultValue="all" className="space-y-4" onValueChange={setSelectedTab}>
              <TabsList className="grid grid-cols-6 gap-2">
                <TabsTrigger value="all">
                  All ({tasks.length})
                </TabsTrigger>
                <TabsTrigger value="source">
                  Source ({sourceCount})
                </TabsTrigger>
                <TabsTrigger value="target">
                  Target ({targetCount})
                </TabsTrigger>
                <TabsTrigger value="pending">
                  Pending ({pendingCount})
                </TabsTrigger>
                <TabsTrigger value="in-progress">
                  In Progress ({inProgressCount})
                </TabsTrigger>
                <TabsTrigger value="completed">
                  Completed ({completedCount})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value={selectedTab} className="space-y-4">
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[300px]">Title</TableHead>
                        <TableHead>System</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Requirement</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTasks.map((task: ImplementationTask) => {
                        // Find the requirement that this task belongs to
                        const requirement = requirements?.find((req: Requirement) => req.id === task.requirementId);
                        
                        return (
                          <TableRow 
                            key={task.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => window.location.href = `/tasks/${task.id}`}
                          >
                            <TableCell className="font-medium">
                              <div className="font-medium">{task.title}</div>
                              <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {task.description}
                              </div>
                            </TableCell>
                            <TableCell>
                              {getSystemBadge(task.system)}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(task.status)}
                            </TableCell>
                            <TableCell>
                              {getPriorityBadge(task.priority)}
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="link" 
                                className="h-auto p-0 text-left font-normal" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLocation(`/projects/${projectId}/requirements/${task.requirementId}`);
                                }}
                              >
                                {requirement && requirement.title ? requirement.title.substring(0, 30) + "..." : `Requirement #${task.requirementId}`}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </CardContent>
    </Card>
  );
}