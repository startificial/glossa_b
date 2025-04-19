import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { ImplementationTask, Requirement, ImplementationStep } from '@/lib/types';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useToast } from '@/hooks/use-toast';
import { ImplementationStepsTable } from '@/components/implementation-tasks/implementation-steps-table';
import { 
  Clock, 
  ArrowUpDown, 
  AlertTriangle, 
  CheckCircle2, 
  Hourglass, 
  Target, 
  Database, 
  CloudCog,
  Plus,
  Check,
  ChevronsUpDown
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
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("all");
  const [, setLocation] = useLocation();
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [taskFormData, setTaskFormData] = useState({
    title: '',
    description: '',
    system: 'source',
    status: 'pending',
    priority: 'medium',
    requirementId: '',
    estimatedHours: '',
    complexity: 'medium',
    assignee: '',
    taskType: 'implementation',
    implementationSteps: [] as ImplementationStep[]
  });

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
  
  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/requirements/${data.requirementId}/tasks`, {
        method: 'POST',
        data
      });
    },
    onSuccess: () => {
      // Invalidate and refetch all requirement tasks queries
      requirementIds.forEach(reqId => {
        queryClient.invalidateQueries({ queryKey: [`/api/requirements/${reqId}/tasks`] });
      });
      
      // Reset form
      setTaskFormData({
        title: '',
        description: '',
        system: 'source',
        status: 'pending',
        priority: 'medium',
        requirementId: '',
        estimatedHours: '',
        complexity: 'medium',
        assignee: '',
        taskType: 'implementation',
        implementationSteps: []
      });
      
      // Close dialog
      setNewTaskOpen(false);
      
      // Show success message
      toast({
        title: "Success",
        description: "Implementation task created successfully",
        variant: "default",
      });
    },
    onError: (error) => {
      console.error("Error creating task:", error);
      toast({
        title: "Error",
        description: "Failed to create implementation task. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Form handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTaskFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setTaskFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!taskFormData.requirementId) {
      toast({
        title: "Validation Error",
        description: "Please select a requirement for this task",
        variant: "destructive",
      });
      return;
    }
    
    const payload = {
      ...taskFormData,
      requirementId: parseInt(taskFormData.requirementId),
      estimatedHours: taskFormData.estimatedHours ? parseInt(taskFormData.estimatedHours) : null,
    };
    
    createTaskMutation.mutate(payload);
  };

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
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Implementation Tasks</CardTitle>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setNewTaskOpen(true)}
          className="flex items-center gap-1"
        >
          <Plus className="h-4 w-4" />
          Add Task
        </Button>
        
        {/* Task Creation Dialog */}
        <Dialog open={newTaskOpen} onOpenChange={setNewTaskOpen}>
          <DialogContent className="max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Implementation Task</DialogTitle>
              <DialogDescription>
                Create a new task and associate it with a requirement.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateTask} className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="requirementId" className="text-right">
                  Requirement
                </Label>
                <div className="col-span-3">
                  <div className="relative w-full">
                    {/* We need a custom Command component instead of Select for better search */}
                    <div className="w-full">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between"
                          >
                            {taskFormData.requirementId 
                              ? requirements?.find(req => req.id.toString() === taskFormData.requirementId)?.title || "Select requirement"
                              : "Select requirement"
                            }
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput placeholder="Search requirements..." className="h-9" />
                            <CommandEmpty>No requirement found.</CommandEmpty>
                            <CommandGroup className="max-h-[300px] overflow-y-auto">
                              {requirements?.map((req) => (
                                <CommandItem
                                  key={req.id}
                                  value={req.title}
                                  onSelect={() => {
                                    handleSelectChange('requirementId', req.id.toString());
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      taskFormData.requirementId === req.id.toString() ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {req.title}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">
                  Title
                </Label>
                <Input
                  id="title"
                  name="title"
                  value={taskFormData.title}
                  onChange={handleInputChange}
                  className="col-span-3"
                  required
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  value={taskFormData.description}
                  onChange={handleInputChange}
                  className="col-span-3"
                  required
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="system" className="text-right">
                  System
                </Label>
                <div className="col-span-3">
                  <Select 
                    value={taskFormData.system} 
                    onValueChange={(value) => handleSelectChange('system', value)}
                  >
                    <SelectTrigger id="system">
                      <SelectValue placeholder="Select system" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="source">Source</SelectItem>
                      <SelectItem value="target">Target</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="priority" className="text-right">
                  Priority
                </Label>
                <div className="col-span-3">
                  <Select 
                    value={taskFormData.priority} 
                    onValueChange={(value) => handleSelectChange('priority', value)}
                  >
                    <SelectTrigger id="priority">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">
                  Status
                </Label>
                <div className="col-span-3">
                  <Select 
                    value={taskFormData.status} 
                    onValueChange={(value) => handleSelectChange('status', value)}
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="taskType" className="text-right">
                  Task Type
                </Label>
                <div className="col-span-3">
                  <Select 
                    value={taskFormData.taskType} 
                    onValueChange={(value) => handleSelectChange('taskType', value)}
                  >
                    <SelectTrigger id="taskType">
                      <SelectValue placeholder="Select task type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="implementation">Implementation</SelectItem>
                      <SelectItem value="data-mapping">Data Mapping</SelectItem>
                      <SelectItem value="workflow">Workflow</SelectItem>
                      <SelectItem value="ui">UI Development</SelectItem>
                      <SelectItem value="integration">Integration</SelectItem>
                      <SelectItem value="security">Security</SelectItem>
                      <SelectItem value="testing">Testing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="complexity" className="text-right">
                  Complexity
                </Label>
                <div className="col-span-3">
                  <Select 
                    value={taskFormData.complexity} 
                    onValueChange={(value) => handleSelectChange('complexity', value)}
                  >
                    <SelectTrigger id="complexity">
                      <SelectValue placeholder="Select complexity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="estimatedHours" className="text-right">
                  Est. Hours
                </Label>
                <Input
                  id="estimatedHours"
                  name="estimatedHours"
                  type="number"
                  value={taskFormData.estimatedHours}
                  onChange={handleInputChange}
                  className="col-span-3"
                  placeholder="Estimated hours to complete"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="assignee" className="text-right">
                  Assignee
                </Label>
                <Input
                  id="assignee"
                  name="assignee"
                  value={taskFormData.assignee}
                  onChange={handleInputChange}
                  className="col-span-3"
                  placeholder="Person assigned to this task"
                />
              </div>
              
              <div className="mt-4">
                <div className="mb-3">
                  <Label>Implementation Steps</Label>
                </div>
                <ImplementationStepsTable 
                  steps={taskFormData.implementationSteps} 
                  isEditing={true}
                  onChange={(steps) => setTaskFormData(prev => ({ ...prev, implementationSteps: steps }))} 
                />
              </div>
              
              <DialogFooter className="mt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setNewTaskOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createTaskMutation.isPending}
                >
                  {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
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
              Click "Add Task" to create a new implementation task.
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