import { useState } from "react";
import { ImplementationTask, ImplementationStep } from "@/lib/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HourglassIcon, Loader2Icon, ClockIcon, BrainCircuitIcon, UserIcon, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImplementationStepsTable } from "@/components/implementation-tasks/implementation-steps-table";

interface TasksTableProps {
  projectId: number;
  requirementId: number;
}

export function TasksTable({ projectId, requirementId }: TasksTableProps) {
  const [selectedTab, setSelectedTab] = useState("all");
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [taskFormData, setTaskFormData] = useState({
    title: "",
    description: "",
    system: "target",
    priority: "medium",
    complexity: "medium",
    estimatedHours: 4,
    status: "pending",
    assignee: "",
    taskType: "implementation",
    sfDocumentationLinks: [],
    implementationSteps: [] as ImplementationStep[]
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["/api/requirements", requirementId, "tasks"],
    queryFn: () => apiRequest(`/api/requirements/${requirementId}/tasks`),
  });

  const generateTasksMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/requirements/${requirementId}/generate-tasks`, { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requirements", requirementId, "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "activities"] });
      toast({
        title: "Tasks Generated",
        description: "Implementation tasks have been automatically generated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Generate Tasks",
        description: error instanceof Error ? error.message : "An error occurred while generating tasks.",
        variant: "destructive",
      });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (taskData: Record<string, any>) => {
      return apiRequest(`/api/requirements/${requirementId}/tasks`, { 
        method: "POST", 
        data: taskData 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requirements", requirementId, "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "activities"] });
      toast({
        title: "Task Created",
        description: "A new implementation task has been created.",
      });
      setNewTaskOpen(false);
      setTaskFormData({
        title: "",
        description: "",
        system: "target",
        priority: "medium",
        complexity: "medium",
        estimatedHours: 4,
        status: "pending",
        assignee: "",
        taskType: "implementation",
        sfDocumentationLinks: [],
        implementationSteps: []
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Create Task",
        description: error instanceof Error ? error.message : "An error occurred while creating the task.",
        variant: "destructive",
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, any> }) => {
      return apiRequest(`/api/tasks/${id}`, { 
        method: "PUT", 
        data 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requirements", requirementId, "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "activities"] });
      toast({
        title: "Task Updated",
        description: "The implementation task has been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Update Task",
        description: error instanceof Error ? error.message : "An error occurred while updating the task.",
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (taskId: number, newStatus: string) => {
    updateTaskMutation.mutate({
      id: taskId,
      data: { status: newStatus },
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTaskFormData((prev) => ({
      ...prev,
      [name]: name === "estimatedHours" ? Number(value) : value,
    }));
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    createTaskMutation.mutate(taskFormData);
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

  const totalEstimatedHours = filteredTasks.reduce(
    (sum: number, task: ImplementationTask) => sum + (task.estimatedHours || 0),
    0
  );

  function getStatusBadge(status: string) {
    switch (status) {
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      case "in-progress":
        return <Badge variant="secondary">In Progress</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-200">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  function getComplexityBadge(complexity: string | null) {
    switch (complexity) {
      case "low":
        return <Badge variant="outline">Low</Badge>;
      case "medium":
        return <Badge variant="secondary">Medium</Badge>;
      case "high":
        return <Badge variant="destructive">High</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  }

  function getPriorityBadge(priority: string) {
    switch (priority) {
      case "low":
        return <Badge variant="outline">Low</Badge>;
      case "medium":
        return <Badge variant="secondary">Medium</Badge>;
      case "high":
        return <Badge variant="destructive">High</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  }

  return (
    <Card className="mb-8">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Implementation Tasks</CardTitle>
            <CardDescription>
              Tasks needed to implement this requirement across source and target systems
            </CardDescription>
          </div>
          <div className="flex gap-2 relative">
            <Dialog open={newTaskOpen} onOpenChange={setNewTaskOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">Add Task</Button>
              </DialogTrigger>
              <DialogContent className="max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create New Implementation Task</DialogTitle>
                  <DialogDescription>
                    Add a new task to implement this requirement in source or target system
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateTask} className="grid gap-4 py-4">
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
                    <Select
                      name="system"
                      value={taskFormData.system}
                      onValueChange={(value) =>
                        setTaskFormData((prev) => ({ ...prev, system: value }))
                      }
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select system" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="source">Source</SelectItem>
                        <SelectItem value="target">Target</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="taskType" className="text-right">
                      Task Type
                    </Label>
                    <Select
                      name="taskType"
                      value={taskFormData.taskType}
                      onValueChange={(value) =>
                        setTaskFormData((prev) => ({ ...prev, taskType: value }))
                      }
                    >
                      <SelectTrigger className="col-span-3">
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
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="priority" className="text-right">
                      Priority
                    </Label>
                    <Select
                      name="priority"
                      value={taskFormData.priority}
                      onValueChange={(value) =>
                        setTaskFormData((prev) => ({ ...prev, priority: value }))
                      }
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="complexity" className="text-right">
                      Complexity
                    </Label>
                    <Select
                      name="complexity"
                      value={taskFormData.complexity}
                      onValueChange={(value) =>
                        setTaskFormData((prev) => ({ ...prev, complexity: value }))
                      }
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select complexity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="estimatedHours" className="text-right">
                      Est. Hours
                    </Label>
                    <Input
                      id="estimatedHours"
                      name="estimatedHours"
                      type="number"
                      min="0"
                      value={taskFormData.estimatedHours}
                      onChange={handleInputChange}
                      className="col-span-3"
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
                      placeholder="(Optional)"
                    />
                  </div>
                  <div className="mt-6">
                    <Label className="mb-2 block">Implementation Steps</Label>
                    <ImplementationStepsTable 
                      steps={taskFormData.implementationSteps || []} 
                      isEditing={true}
                      onChange={(steps) => setTaskFormData(prev => ({ ...prev, implementationSteps: steps }))} 
                    />
                  </div>
                  
                  <DialogFooter className="mt-4">
                    <Button type="submit" disabled={createTaskMutation.isPending}>
                      {createTaskMutation.isPending ? (
                        <>
                          <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Task"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            <Button
              onClick={() => generateTasksMutation.mutate()}
              disabled={generateTasksMutation.isPending || (tasks && tasks.length > 0)}
              variant={generateTasksMutation.isPending ? "outline" : "default"}
              className={generateTasksMutation.isPending ? "border-blue-400 bg-blue-50 text-blue-700" : ""}
            >
              {generateTasksMutation.isPending ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin text-blue-700" />
                  <span>Generating Implementation Tasks...</span>
                </>
              ) : (
                "Generate Tasks"
              )}
            </Button>
            {generateTasksMutation.isPending && (
              <div className="absolute right-0 bottom-0 mb-12 flex justify-center items-center pointer-events-none">
                <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-md text-xs border border-blue-200 shadow-md">
                  This may take up to 30 seconds...
                </div>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs
          value={selectedTab}
          onValueChange={(value) => setSelectedTab(value)}
          className="w-full"
        >
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="all" className="flex items-center">
                All ({tasks?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="source" className="flex items-center">
                Source ({sourceCount})
              </TabsTrigger>
              <TabsTrigger value="target" className="flex items-center">
                Target ({targetCount})
              </TabsTrigger>
              <TabsTrigger value="pending" className="flex items-center">
                Pending ({pendingCount})
              </TabsTrigger>
              <TabsTrigger value="in-progress" className="flex items-center">
                In Progress ({inProgressCount})
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center">
                Completed ({completedCount})
              </TabsTrigger>
            </TabsList>
            <div className="flex items-center text-sm text-muted-foreground">
              <ClockIcon className="w-4 h-4 mr-1" />
              Total: {totalEstimatedHours} hours
            </div>
          </div>

          <TabsContent value={selectedTab} className="pt-2">
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <HourglassIcon className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p>No tasks found. {tasks?.length === 0 ? "Generate or create tasks to get started." : "Try changing filters."}</p>
              </div>
            ) : (
              <div className="border rounded-md">
                <div className="max-h-[500px] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead className="w-[25%]">Task</TableHead>
                        <TableHead>System</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>
                          <div className="flex items-center">
                            <BrainCircuitIcon className="w-4 h-4 mr-1" />
                            Complexity
                          </div>
                        </TableHead>
                        <TableHead>
                          <div className="flex items-center">
                            <ClockIcon className="w-4 h-4 mr-1" />
                            Est. Hours
                          </div>
                        </TableHead>
                        <TableHead>
                          <div className="flex items-center">
                            <UserIcon className="w-4 h-4 mr-1" />
                            Assignee
                          </div>
                        </TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTasks.map((task: ImplementationTask) => (
                        <TableRow 
                          key={task.id} 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => window.location.href = `/tasks/${task.id}?projectId=${projectId}&requirementId=${requirementId}`}
                        >
                          <TableCell className="font-medium">
                            <div className="font-medium">{task.title}</div>
                            <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {task.description}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={task.system === "source" ? "outline" : "default"}>
                              {task.system.charAt(0).toUpperCase() + task.system.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(task.status)}</TableCell>
                          <TableCell>
                            {task.taskType ? (
                              <Badge variant="outline" className="bg-blue-50 text-blue-800 hover:bg-blue-100">
                                {task.taskType.replace(/-/g, ' ')}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">Implementation</span>
                            )}
                          </TableCell>
                          <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                          <TableCell>{getComplexityBadge(task.complexity)}</TableCell>
                          <TableCell>{task.estimatedHours} hrs</TableCell>
                          <TableCell>
                            {task.assignee ? (
                              task.assignee
                            ) : (
                              <span className="text-muted-foreground">Unassigned</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Select
                              value={task.status}
                              onValueChange={(value) => handleStatusChange(task.id, value)}
                            >
                              <SelectTrigger className="h-8 w-[120px]">
                                <SelectValue placeholder="Change status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="in-progress">In Progress</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}