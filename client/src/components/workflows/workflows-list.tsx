import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Workflow } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, PlusCircle, GitBranch, AlertTriangle, Trash2, Edit, Eye, Filter } from 'lucide-react';
import { WorkflowEditor } from './workflow-editor';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface WorkflowsListProps {
  projectId: number;
}

interface WorkflowRequirement {
  id: number;
  title: string;
  description: string;
  category: string;
  priority: string;
  selected?: boolean;
}

export function WorkflowsList({ projectId }: WorkflowsListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<Workflow | null>(null);
  const [workflowRequirements, setWorkflowRequirements] = useState<WorkflowRequirement[]>([]);
  const [selectedRequirements, setSelectedRequirements] = useState<number[]>([]);

  // Query to fetch all workflows for this project
  const { data: workflows, isLoading, error } = useQuery<Workflow[]>({
    queryKey: [`/api/projects/${projectId}/workflows`],
  });
  
  // Query to fetch workflow requirements for this project
  const { data: requirements, isLoading: isLoadingRequirements } = useQuery<WorkflowRequirement[]>({
    queryKey: [`/api/projects/${projectId}/requirements`],
    select: (data) => data.filter(req => req.category.toLowerCase() === 'workflow'),
    enabled: isGenerateDialogOpen // Only fetch when dialog is open
  });

  // Mutation to delete a workflow
  const deleteWorkflowMutation = useMutation({
    mutationFn: async (workflowId: number) => {
      return apiRequest(`/api/workflows/${workflowId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      toast({
        title: "Workflow deleted",
        description: "The workflow has been successfully deleted",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/workflows`] });
      setIsDeleteDialogOpen(false);
      setWorkflowToDelete(null);
    },
    onError: (error) => {
      console.error('Error deleting workflow:', error);
      toast({
        title: "Error",
        description: "Failed to delete workflow. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Mutation to generate a workflow automatically
  const generateWorkflowMutation = useMutation({
    mutationFn: async (data: { name: string, requirementIds?: number[] }) => {
      return apiRequest<Workflow>(`/api/projects/${projectId}/generate-workflow`, {
        method: 'POST',
        data
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Workflow generated",
        description: "A new workflow has been generated from your requirements",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/workflows`] });
      setIsGenerateDialogOpen(false);
      setSelectedRequirements([]);
    },
    onError: (error: any) => {
      console.error('Error generating workflow:', error);
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to generate workflow. Make sure you have requirements with the 'Workflow' category.",
        variant: "destructive"
      });
    }
  });

  const handleCreateClick = () => {
    setIsCreating(true);
    setSelectedWorkflow(null);
  };

  const handleEditClick = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    setIsEditing(true);
  };

  const handleViewClick = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    setIsViewing(true);
  };

  const handleWorkflowSaved = (workflow: Workflow) => {
    queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/workflows`] });
    setIsCreating(false);
    setIsEditing(false);
    toast({
      title: "Success",
      description: `Workflow ${selectedWorkflow ? 'updated' : 'created'} successfully`,
    });
  };

  const handleDeleteClick = (workflow: Workflow) => {
    setWorkflowToDelete(workflow);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (workflowToDelete) {
      deleteWorkflowMutation.mutate(workflowToDelete.id);
    }
  };

  // Update workflowRequirements when requirements are loaded
  useEffect(() => {
    if (requirements) {
      setWorkflowRequirements(requirements);
    }
  }, [requirements]);

  // Toggle requirement selection
  const toggleRequirement = (reqId: number) => {
    setSelectedRequirements(prev => {
      if (prev.includes(reqId)) {
        return prev.filter(id => id !== reqId);
      } else {
        return [...prev, reqId];
      }
    });
  };

  const handleGenerateWorkflow = () => {
    generateWorkflowMutation.mutate({
      name: "Auto-generated Workflow",
      requirementIds: selectedRequirements.length > 0 ? selectedRequirements : undefined
    });
  };

  // If creating or editing, show the workflow editor
  if (isCreating) {
    return (
      <div className="flex flex-col h-full">
        <div className="mb-4">
          <Button variant="outline" onClick={() => setIsCreating(false)}>
            Back to Workflows
          </Button>
        </div>
        <div className="flex-1">
          <WorkflowEditor
            projectId={projectId}
            onSaved={handleWorkflowSaved}
            onCancel={() => setIsCreating(false)}
          />
        </div>
      </div>
    );
  }

  if (isEditing && selectedWorkflow) {
    return (
      <div className="flex flex-col h-full">
        <div className="mb-4">
          <Button variant="outline" onClick={() => setIsEditing(false)}>
            Back to Workflows
          </Button>
        </div>
        <div className="flex-1">
          <WorkflowEditor
            projectId={projectId}
            workflow={selectedWorkflow}
            onSaved={handleWorkflowSaved}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      </div>
    );
  }

  if (isViewing && selectedWorkflow) {
    return (
      <div className="flex flex-col h-full">
        <div className="mb-4">
          <Button variant="outline" onClick={() => setIsViewing(false)}>
            Back to Workflows
          </Button>
        </div>
        <div className="flex-1">
          <WorkflowEditor
            projectId={projectId}
            workflow={selectedWorkflow}
            onCancel={() => setIsViewing(false)}
            readOnly={true}
          />
        </div>
      </div>
    );
  }

  // Default view - list of workflows
  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Project Workflows</h2>
        <div className="flex space-x-2">
          <Button 
            onClick={() => setIsGenerateDialogOpen(true)}
            className="flex items-center"
            variant="outline"
          >
            <GitBranch className="h-4 w-4 mr-2" />
            Auto-Generate
          </Button>
          <Button onClick={handleCreateClick} className="flex items-center">
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Workflow
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load workflows. Please refresh the page and try again.
          </AlertDescription>
        </Alert>
      )}

      {/* Empty state */}
      {!isLoading && !error && (!workflows || workflows.length === 0) && (
        <Card className="bg-gray-50 dark:bg-gray-800 border-dashed border-2">
          <CardContent className="pt-6 flex flex-col items-center justify-center text-center h-60">
            <GitBranch className="h-12 w-12 text-gray-400 mb-4" />
            <CardTitle className="text-lg mb-2">No Workflows Yet</CardTitle>
            <CardDescription className="max-w-md mb-6">
              Create your first workflow to visualize and organize the process flow of your requirements.
              Or auto-generate a workflow from your requirements with the "Workflow" category.
            </CardDescription>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setIsGenerateDialogOpen(true)}
                className="flex items-center"
              >
                <GitBranch className="h-4 w-4 mr-2" />
                Auto-Generate
              </Button>
              <Button onClick={handleCreateClick} className="flex items-center">
                <PlusCircle className="h-4 w-4 mr-2" />
                Create Workflow
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workflows table */}
      {!isLoading && !error && workflows && workflows.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workflows.map((workflow) => (
              <TableRow key={workflow.id}>
                <TableCell>
                  <div className="font-medium">
                    {workflow.name}
                  </div>
                  {workflow.description && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {workflow.description}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={workflow.status === 'published' ? 'default' : 'outline'}>
                    {workflow.status}
                  </Badge>
                </TableCell>
                <TableCell>{workflow.version}</TableCell>
                <TableCell>
                  {new Date(workflow.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {new Date(workflow.updatedAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewClick(workflow)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditClick(workflow)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(workflow)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Auto-generate workflow dialog */}
      <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generate Workflow</DialogTitle>
            <DialogDescription>
              This will automatically create a workflow based on requirements with the "Workflow" category.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {isLoadingRequirements ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : workflowRequirements && workflowRequirements.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Available Workflow Requirements:</h3>
                <div className="max-h-60 overflow-y-auto border rounded-md p-2">
                  {workflowRequirements.map(req => (
                    <div key={req.id} className="flex items-start space-x-2 py-2 border-b last:border-0">
                      <Checkbox 
                        id={`req-${req.id}`} 
                        checked={selectedRequirements.includes(req.id)}
                        onCheckedChange={() => toggleRequirement(req.id)}
                      />
                      <div className="flex-1">
                        <label 
                          htmlFor={`req-${req.id}`}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {req.title}
                        </label>
                        <p className="text-xs text-muted-foreground line-clamp-2">{req.description}</p>
                      </div>
                      <Badge 
                        variant="outline" 
                        className="ml-auto self-start text-xs"
                      >
                        {req.priority}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <Alert>
                <AlertDescription>
                  No requirements with the "Workflow" category found. Please add requirements with this category before generating a workflow.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGenerateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleGenerateWorkflow}
              disabled={generateWorkflowMutation.isPending || (workflowRequirements && workflowRequirements.length === 0)}
            >
              {generateWorkflowMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Generate Workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Workflow</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this workflow? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {workflowToDelete && (
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                <p className="font-medium">{workflowToDelete.name}</p>
                {workflowToDelete.description && (
                  <p className="text-sm text-gray-500">{workflowToDelete.description}</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={deleteWorkflowMutation.isPending}
            >
              {deleteWorkflowMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete Workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}