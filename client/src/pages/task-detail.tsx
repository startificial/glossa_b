import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { ImplementationTask, Requirement, ImplementationStep } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { formatDateTime } from '@/lib/utils';
import { AlarmClock, ArrowLeft, CheckSquare, ClipboardList, Clock, Edit2, Hourglass, Save, Target, Trash2, User, Users, X } from 'lucide-react';
import { ImplementationStepsTable } from '@/components/implementation-tasks/implementation-steps-table';
import { TaskRoleEffort } from '@/components/roles/task-role-effort';

interface TaskDetailProps {
  taskId: number;
}

export default function TaskDetail({ taskId }: TaskDetailProps) {
  const [, setLocation] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  
  // Parse URL query parameters for additional context
  const searchParams = new URLSearchParams(window.location.search);
  const projectIdFromUrl = searchParams.get('projectId') ? parseInt(searchParams.get('projectId') || '0') : 0;
  const requirementIdFromUrl = searchParams.get('requirementId') ? parseInt(searchParams.get('requirementId') || '0') : 0;
  
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    status: string;
    priority: string;
    system: string;
    estimatedHours: number;
    complexity: string;
    assignee: string;
    taskType: string;
    sfDocumentationLinks: any[];
    implementationSteps: ImplementationStep[];
    overallDocumentationLinks: string[];
  }>({
    title: '',
    description: '',
    status: '',
    priority: '',
    system: '',
    estimatedHours: 0,
    complexity: '',
    assignee: '',
    taskType: '',
    sfDocumentationLinks: [],
    implementationSteps: [],
    overallDocumentationLinks: [],
  });

  // Get task data
  const { data: task, isLoading, isError } = useQuery({
    queryKey: ['/api/tasks', taskId],
    queryFn: async () => {
      try {
        const result = await apiRequest(`/api/tasks/${taskId}`);
        console.log("Task data received:", result);
        console.log("Implementation steps:", result.implementation_steps);
        console.log("Implementation steps (camelCase):", result.implementationSteps);
        return result;
      } catch (error) {
        console.error("Error fetching task:", error);
        throw error;
      }
    }
  });
  
  // Get requirement data for the task, use URL params as fallback
  const { data: requirement } = useQuery({
    queryKey: ['/api/requirements', task?.requirementId || requirementIdFromUrl],
    queryFn: async () => {
      // First try to use task.requirementId if available, otherwise use URL param
      const reqId = task?.requirementId || requirementIdFromUrl;
      const projId = task?.projectId || projectIdFromUrl;
      
      if (!reqId || !projId) return null;
      
      try {
        return apiRequest(`/api/projects/${projId}/requirements/${reqId}`);
      } catch (error) {
        console.error("Error fetching requirement:", error);
        return null;
      }
    },
    enabled: !!(task?.requirementId || (requirementIdFromUrl && projectIdFromUrl))
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest(`/api/tasks/${taskId}`, {
        method: "PUT",
        data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/tasks', taskId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/requirements', task?.requirementId, 'tasks'] 
      });
      
      toast({
        title: "Task updated",
        description: "The task has been updated successfully.",
      });
      
      setIsEditing(false);
    },
    onError: (error) => {
      toast({
        title: "Error updating task",
        description: "There was a problem updating the task.",
        variant: "destructive",
      });
    }
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/tasks/${taskId}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/requirements', task?.requirementId, 'tasks'] 
      });
      
      toast({
        title: "Task deleted",
        description: "The task has been deleted successfully.",
      });
      
      // Redirect back to requirement
      setLocation(`/projects/${task?.projectId}/requirements/${task?.requirementId}`);
    },
    onError: (error) => {
      toast({
        title: "Error deleting task",
        description: "There was a problem deleting the task.",
        variant: "destructive",
      });
    }
  });

  // Update form data when task data is loaded
  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        system: task.system,
        estimatedHours: task.estimatedHours || 0,
        complexity: task.complexity || '',
        assignee: task.assignee || '',
        taskType: task.taskType || 'implementation',
        sfDocumentationLinks: task.sfDocumentationLinks || [],
        implementationSteps: task.implementationSteps || [],
        overallDocumentationLinks: task.overallDocumentationLinks || [],
      });
    }
  }, [task]);

  const handleSave = () => {
    updateTaskMutation.mutate(formData);
  };

  const handleDelete = () => {
    deleteTaskMutation.mutate();
  };

  // Form input handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleEstimatedHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, estimatedHours: Number(e.target.value) || 0 });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-center items-center h-full">
          <div className="text-center">
            <h3 className="text-lg font-medium mb-2">Loading task...</h3>
            <div className="animate-spin w-6 h-6 border-2 border-primary rounded-full border-t-transparent mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !task) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center justify-center h-full">
          <h3 className="text-xl font-bold mb-2">Error Loading Task</h3>
          <p className="text-muted-foreground mb-4">This task could not be found or has been deleted.</p>
          <Button onClick={() => setLocation(`/`)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium"><Hourglass className="h-3 w-3" /> Pending</Badge>;
      case 'in-progress':
        return <Badge variant="default" className="bg-amber-500 flex items-center gap-1 px-2.5 py-1 text-xs font-medium"><AlarmClock className="h-3 w-3" /> In Progress</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-500 flex items-center gap-1 px-2.5 py-1 text-xs font-medium"><CheckSquare className="h-3 w-3" /> Completed</Badge>;
      default:
        return <Badge variant="outline" className="px-2.5 py-1 text-xs font-medium">{status}</Badge>;
    }
  };

  // Get system badge
  const getSystemBadge = (system: string) => {
    switch (system) {
      case 'source':
        return <Badge variant="outline" className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium"><ClipboardList className="h-3 w-3" /> Source</Badge>;
      case 'target':
        return <Badge variant="default" className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium"><Target className="h-3 w-3" /> Target</Badge>;
      default:
        return <Badge variant="outline" className="px-2.5 py-1 text-xs font-medium">{system}</Badge>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          onClick={() => setLocation(`/projects/${task.projectId}/requirements/${task.requirementId}`)}
          className="mr-2 flex items-center"
        >
          <ArrowLeft className="h-4 w-4 mr-2 flex-shrink-0" />
          <span>Back to Requirement</span>
        </Button>
        
        <h1 className="text-2xl font-bold ml-2">Implementation Task</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-xl mb-1">{task.title}</CardTitle>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  {getSystemBadge(task.system)}
                  {getStatusBadge(task.status)}
                  <span className="text-xs text-muted-foreground flex items-center">
                    <Clock className="h-3 w-3 mr-1.5" />
                    Created on {formatDateTime(task.createdAt)}
                  </span>
                </div>
              </div>
              
              {!isEditing ? (
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Task</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this task? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex gap-2 justify-end">
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsEditing(false)}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={handleSave}
                    disabled={updateTaskMutation.isPending}
                  >
                    {updateTaskMutation.isPending ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-current rounded-full border-t-transparent mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardHeader>
            
            <CardContent>
              {!isEditing ? (
                <div className="space-y-6">
                  <div>
                    <div className="p-4 border rounded-md bg-muted/20 whitespace-pre-line">
                      {task.description}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border rounded-md p-3">
                      <div className="text-sm text-muted-foreground mb-1 flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        Estimated Hours
                      </div>
                      <div className="font-medium">{task.estimatedHours || 'Not specified'}</div>
                    </div>
                    
                    <div className="border rounded-md p-3">
                      <div className="text-sm text-muted-foreground mb-1 flex items-center">
                        <Target className="h-3 w-3 mr-1" />
                        Complexity
                      </div>
                      <div className="font-medium">{task.complexity || 'Not specified'}</div>
                    </div>
                    
                    <div className="border rounded-md p-3">
                      <div className="text-sm text-muted-foreground mb-1 flex items-center">
                        <User className="h-3 w-3 mr-1" />
                        Assignee
                      </div>
                      <div className="font-medium">{task.assignee || 'Unassigned'}</div>
                    </div>
                    
                    <div className="border rounded-md p-3">
                      <div className="text-sm text-muted-foreground mb-1 flex items-center">
                        <Target className="h-3 w-3 mr-1" />
                        Task Type
                      </div>
                      <div className="font-medium">
                        {task.taskType ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-800 hover:bg-blue-100 font-normal">
                            {task.taskType.replace(/-/g, ' ')}
                          </Badge>
                        ) : 'Implementation'}
                      </div>
                    </div>
                  </div>
                  
                  <ImplementationStepsTable steps={task.implementationSteps || []} />
                  
                  <div className="mt-6">
                    <CardTitle className="text-lg font-medium mb-4 flex items-center">
                      <Users className="h-5 w-5 mr-2" />
                      Role Effort Estimation
                    </CardTitle>
                    <TaskRoleEffort 
                      projectId={task.projectId} 
                      taskId={task.id} 
                    />
                  </div>

                  {task.overallDocumentationLinks && task.overallDocumentationLinks.length > 0 && (
                    <div className="border rounded-md p-4 mb-4">
                      <div className="flex items-center mb-3">
                        <div className="bg-purple-50 p-1.5 rounded-md mr-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600">
                            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path>
                          </svg>
                        </div>
                        <h4 className="text-sm font-medium">Overall Documentation</h4>
                      </div>
                      <div className="space-y-2 pl-1">
                        {task.overallDocumentationLinks.map((link: string, index: number) => (
                          <div key={index} className="flex items-start">
                            <a 
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 hover:underline text-sm flex items-center"
                            >
                              <div className="w-4 h-4 mr-2 flex-shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                  <polyline points="15 3 21 3 21 9"></polyline>
                                  <line x1="10" y1="14" x2="21" y2="3"></line>
                                </svg>
                              </div>
                              {link}
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {task.sfDocumentationLinks && task.sfDocumentationLinks.length > 0 && (
                    <div className="border rounded-md p-4">
                      <div className="flex items-center mb-3">
                        <div className="bg-blue-50 p-1.5 rounded-md mr-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                            <path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <path d="M2 15h10"></path>
                            <path d="M9 18l3-3-3-3"></path>
                          </svg>
                        </div>
                        <h4 className="text-sm font-medium">Salesforce Documentation</h4>
                      </div>
                      <div className="space-y-2 pl-1">
                        {task.sfDocumentationLinks.map((doc: { title: string; url: string }, index: number) => (
                          <div key={index} className="flex items-start">
                            <a 
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 hover:underline text-sm flex items-center"
                            >
                              <div className="w-4 h-4 mr-2 flex-shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                  <polyline points="15 3 21 3 21 9"></polyline>
                                  <line x1="10" y1="14" x2="21" y2="3"></line>
                                </svg>
                              </div>
                              {doc.title}
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="title">Task Title</Label>
                    <Input 
                      id="title"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea 
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      className="min-h-[120px]"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select 
                        value={formData.status} 
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
                    
                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <Select 
                        value={formData.priority} 
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
                    
                    <div>
                      <Label htmlFor="system">System</Label>
                      <Select 
                        value={formData.system} 
                        onValueChange={(value) => handleSelectChange('system', value)}
                      >
                        <SelectTrigger id="system">
                          <SelectValue placeholder="Select system" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="source">Source</SelectItem>
                          <SelectItem value="target">Target</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="complexity">Complexity</Label>
                      <Select 
                        value={formData.complexity} 
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
                    
                    <div>
                      <Label htmlFor="estimatedHours">Estimated Hours</Label>
                      <Input 
                        id="estimatedHours"
                        type="number" 
                        min="0"
                        value={formData.estimatedHours}
                        onChange={handleEstimatedHoursChange}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="assignee">Assignee</Label>
                      <Input 
                        id="assignee"
                        name="assignee"
                        value={formData.assignee}
                        onChange={handleInputChange}
                        placeholder="Enter assignee name"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="taskType">Task Type</Label>
                      <Select 
                        value={formData.taskType} 
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
                  
                  <div className="mt-6">
                    <h3 className="text-base font-medium mb-3">Implementation Steps</h3>
                    <ImplementationStepsTable 
                      steps={formData.implementationSteps} 
                      isEditing={true}
                      onChange={(updatedSteps) => {
                        setFormData({ ...formData, implementationSteps: updatedSteps });
                      }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Related Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {requirement && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Requirement</h3>
                    <div className="border rounded-md p-3 bg-muted/20">
                      <p className="font-medium">{requirement.codeId}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {requirement.text}
                      </p>
                    </div>
                  </div>
                )}
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Actions</h3>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start items-center"
                      onClick={() => setLocation(`/projects/${task.projectId}/requirements/${task.requirementId}`)}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span>Back to Requirement</span>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}