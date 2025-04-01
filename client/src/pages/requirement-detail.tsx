import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Requirement, Activity, Project, AcceptanceCriterion, GherkinStructure } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getCategoryColor, getPriorityInfo, formatDateTime } from '@/lib/utils';
import { ArrowLeft, Edit2, Save, Trash2, Clock, AlertTriangle, CheckCircle2, X, Plus, Sparkles, Wrench, Video, FileText, AudioWaveform, Eye } from 'lucide-react';
import { TasksTable } from '@/components/implementation-tasks/tasks-table';
import { ReferenceDataTab } from '@/components/reference-data/reference-data-tab';

interface RequirementDetailProps {
  projectId: number;
  requirementId: number;
}

export default function RequirementDetail({ projectId, requirementId }: RequirementDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isGeneratingCriteria, setIsGeneratingCriteria] = useState(false);
  const [isAddingCriterion, setIsAddingCriterion] = useState(false);
  const [selectedCriterion, setSelectedCriterion] = useState<AcceptanceCriterion | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newCriterion, setNewCriterion] = useState<{description: string, status: string}>({
    description: '',
    status: 'pending'
  });
  const [, setLocation] = useLocation();
  
  // Form state
  const [formData, setFormData] = useState<{
    text: string;
    category: string;
    priority: string;
  }>({
    text: '',
    category: 'functional',
    priority: 'medium'
  });
  
  // Get requirement data
  const { data: requirement, isLoading, isError } = useQuery({
    queryKey: ['/api/projects', projectId, 'requirements', requirementId],
    queryFn: async () => {
      return apiRequest("GET", `/api/projects/${projectId}/requirements/${requirementId}`);
    }
  });
  
  // Get project activities related to this requirement
  const { data: activities } = useQuery({
    queryKey: ['/api/projects', projectId, 'activities'],
    queryFn: async () => {
      return apiRequest("GET", `/api/projects/${projectId}/activities`);
    }
  });
  
  // Get implementation tasks for this requirement
  const { data: implementationTasks, isLoading: isTasksLoading } = useQuery({
    queryKey: ['/api/requirements', requirementId, 'tasks'],
    queryFn: async () => {
      return apiRequest("GET", `/api/requirements/${requirementId}/tasks`);
    }
  });
  
  // Get input data if requirement has inputDataId
  const { data: inputData } = useQuery({
    queryKey: ['/api/projects', projectId, 'input-data', requirement?.inputDataId],
    queryFn: async () => {
      if (!requirement || !requirement.inputDataId) return null;
      return apiRequest("GET", `/api/projects/${projectId}/input-data/${requirement.inputDataId}`);
    },
    enabled: !!requirement && !!requirement.inputDataId
  });
  
  // Filter activities related to this requirement
  const relatedActivities = activities?.filter(
    (activity: Activity) => activity.relatedEntityId === requirementId
  ) || [];
  
  // Update requirement mutation
  const updateRequirementMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest(
        "PUT",
        `/api/projects/${projectId}/requirements/${requirementId}`,
        data
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/projects', projectId, 'requirements'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/projects', projectId, 'requirements', requirementId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/projects', projectId, 'activities'] 
      });
      
      toast({
        title: "Requirement updated",
        description: "The requirement has been updated successfully.",
      });
      
      setIsEditing(false);
    },
    onError: (error) => {
      toast({
        title: "Error updating requirement",
        description: "There was a problem updating the requirement.",
        variant: "destructive",
      });
    }
  });
  
  // Delete requirement mutation
  const deleteRequirementMutation = useMutation({
    mutationFn: async () => {
      const result = await apiRequest(
        "DELETE",
        `/api/projects/${projectId}/requirements/${requirementId}`
      );
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/projects', projectId, 'requirements'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/projects', projectId, 'activities'] 
      });
      
      toast({
        title: "Requirement deleted",
        description: "The requirement has been deleted successfully.",
      });
      
      // Redirect back to project details
      setLocation(`/projects/${projectId}`);
    },
    onError: (error) => {
      toast({
        title: "Error deleting requirement",
        description: "There was a problem deleting the requirement.",
        variant: "destructive",
      });
    }
  });
  
  // Update form data when requirement data is loaded
  useEffect(() => {
    if (requirement) {
      setFormData({
        text: requirement.text,
        category: requirement.category,
        priority: requirement.priority,
      });
    }
  }, [requirement]);
  
  const handleSave = () => {
    updateRequirementMutation.mutate(formData);
  };
  
  const handleDelete = () => {
    deleteRequirementMutation.mutate();
  };
  
  // Form input handlers
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData({ ...formData, text: e.target.value });
  };
  
  const handleCategoryChange = (value: string) => {
    setFormData({ ...formData, category: value });
  };
  
  const handlePriorityChange = (value: string) => {
    setFormData({ ...formData, priority: value });
  };

  // Mutation for generating acceptance criteria using Claude API
  const generateCriteriaMutation = useMutation({
    mutationFn: async () => {
      // Call the server endpoint to generate acceptance criteria with Claude
      return apiRequest(
        "POST",
        `/api/requirements/${requirementId}/generate-acceptance-criteria`,
        {}
      );
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/projects', projectId, 'requirements', requirementId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/projects', projectId, 'activities'] 
      });
      
      toast({
        title: "Acceptance Criteria Generated",
        description: `${data.length} acceptance criteria have been automatically generated for this requirement.`,
      });
      
      setIsGeneratingCriteria(false);
    },
    onError: (error: any) => {
      const errorMessage = error.message || "There was a problem generating acceptance criteria.";
      
      // Check if it's an API key error
      if (errorMessage.includes("API key") || errorMessage.includes("ANTHROPIC_API_KEY")) {
        toast({
          title: "Claude API Key Missing",
          description: "Please add your Anthropic Claude API key in the environment variables to use this feature.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error Generating Criteria",
          description: errorMessage,
          variant: "destructive",
        });
      }
      
      setIsGeneratingCriteria(false);
    }
  });
  
  const handleGenerateCriteria = () => {
    setIsGeneratingCriteria(true);
    generateCriteriaMutation.mutate();
  };
  
  // Generate implementation tasks mutation
  const generateTasksMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(
        "POST",
        `/api/requirements/${requirementId}/generate-tasks`,
        {}
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/requirements', requirementId, 'tasks'] 
      });
      
      toast({
        title: "Tasks Generated",
        description: "Implementation tasks have been generated for this requirement."
      });
    },
    onError: (error: any) => {
      const errorMessage = error.message || "There was a problem generating implementation tasks.";
      toast({
        title: "Error Generating Tasks",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });
  
  const handleGenerateTasks = () => {
    generateTasksMutation.mutate();
  };
  
  // Add criterion mutation
  const addCriterionMutation = useMutation({
    mutationFn: async () => {
      // Get current criteria
      const currentCriteria = requirement.acceptanceCriteria || [];
      
      // Format the description in Gherkin format if it's not already
      let formattedDescription = newCriterion.description;
      
      // Check if description already has Gherkin format (case-insensitive manually)
      const hasGherkinFormat = /^\s*[Ss][Cc][Ee][Nn][Aa][Rr][Ii][Oo]:.*[Gg][Ii][Vv][Ee][Nn].*[Ww][Hh][Ee][Nn].*[Tt][Hh][Ee][Nn]/.test(formattedDescription);
      
      if (!hasGherkinFormat) {
        // Simple formatting to Gherkin if user entered plain text
        formattedDescription = `Scenario: User scenario\nGiven ${formattedDescription}\nWhen a condition occurs\nThen expected outcome happens`;
      }
      
      // Create a new criterion
      // Parse the Gherkin formatted description to create structured data
      const lines = formattedDescription.split('\n');
      let gherkinData: GherkinStructure | undefined;
      
      let scenario = '';
      let given = '';
      let when = '';
      let andClauses: string[] = [];
      let then = '';
      let andThenClauses: string[] = [];
      
      // Parse each line to extract structured Gherkin components
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        if (trimmedLine.match(/^[Ss][Cc][Ee][Nn][Aa][Rr][Ii][Oo]:/)) {
          scenario = trimmedLine.replace(/^[Ss][Cc][Ee][Nn][Aa][Rr][Ii][Oo]:?\s*/, '').trim();
        } else if (trimmedLine.match(/^[Gg][Ii][Vv][Ee][Nn]\s/)) {
          given = trimmedLine.replace(/^[Gg][Ii][Vv][Ee][Nn]\s/, '').trim();
        } else if (trimmedLine.match(/^[Ww][Hh][Ee][Nn]\s/)) {
          when = trimmedLine.replace(/^[Ww][Hh][Ee][Nn]\s/, '').trim();
        } else if (trimmedLine.match(/^[Aa][Nn][Dd]\s/) && then === '') {
          // If 'Then' hasn't been seen yet, this is a 'When And'
          andClauses.push(trimmedLine.replace(/^[Aa][Nn][Dd]\s/, '').trim());
        } else if (trimmedLine.match(/^[Tt][Hh][Ee][Nn]\s/)) {
          then = trimmedLine.replace(/^[Tt][Hh][Ee][Nn]\s/, '').trim();
        } else if (trimmedLine.match(/^[Aa][Nn][Dd]\s/) && then !== '') {
          // If 'Then' has been seen, this is a 'Then And'
          andThenClauses.push(trimmedLine.replace(/^[Aa][Nn][Dd]\s/, '').trim());
        }
      }
      
      // Create structured Gherkin data if we have the core components
      if (scenario && given && when && then) {
        gherkinData = {
          scenario,
          given,
          when,
          and: andClauses,
          then,
          andThen: andThenClauses
        };
      }
      
      const newCriterionWithId = {
        id: crypto.randomUUID(),
        description: formattedDescription,
        status: newCriterion.status as 'pending' | 'approved' | 'rejected',
        notes: '',
        gherkin: gherkinData
      };
      
      // Update the requirement with the new acceptance criteria
      return apiRequest(
        "PUT",
        `/api/projects/${projectId}/requirements/${requirementId}`,
        { 
          acceptanceCriteria: [...currentCriteria, newCriterionWithId]
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/projects', projectId, 'requirements', requirementId] 
      });
      
      toast({
        title: "Criterion Added",
        description: "A new acceptance criterion has been added to this requirement.",
      });
      
      // Reset form and close dialog
      setNewCriterion({
        description: '',
        status: 'pending'
      });
      setIsAddingCriterion(false);
    },
    onError: (error) => {
      toast({
        title: "Error Adding Criterion",
        description: "There was a problem adding the acceptance criterion.",
        variant: "destructive",
      });
    }
  });
  
  const handleAddCriterion = () => {
    if (newCriterion.description.trim() === '') {
      toast({
        title: "Validation Error",
        description: "Please enter a description for the criterion.",
        variant: "destructive",
      });
      return;
    }
    
    addCriterionMutation.mutate();
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">Loading requirement...</h3>
          <div className="animate-spin w-6 h-6 border-2 border-primary rounded-full border-t-transparent mx-auto"></div>
        </div>
      </div>
    );
  }
  
  if (isError || !requirement) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h3 className="text-xl font-bold mb-2">Error Loading Requirement</h3>
        <p className="text-muted-foreground mb-4">This requirement could not be found or has been deleted.</p>
        <Button onClick={() => setLocation(`/projects/${projectId}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Project
        </Button>
      </div>
    );
  }
  
  // Determine the status badge color and text based on priority
  const priorityInfo = getPriorityInfo(requirement.priority);
  const priorityColor = priorityInfo.color;
  
  // Import icons for priorities
  const PriorityIcons = {
    high: AlertTriangle,
    medium: CheckCircle2,
    low: ArrowLeft
  };
  
  // Set the appropriate priority icon
  const PriorityIcon = PriorityIcons[requirement.priority as keyof typeof PriorityIcons] || CheckCircle2;
  
  // Get category color
  const categoryColors = getCategoryColor(requirement.category);
  
  return (
    <div className="container mx-auto px-4 py-6 overflow-auto h-[calc(100vh-64px)]">
      <div className="flex items-center mb-6 sticky top-0 z-10 bg-background py-2">
        <Button 
          variant="ghost" 
          onClick={() => setLocation(`/projects/${projectId}`)}
          className="mr-2 flex items-center"
        >
          <ArrowLeft className="h-4 w-4 mr-2 flex-shrink-0" />
          <span>Back to Project</span>
        </Button>
        
        <h1 className="text-2xl font-bold ml-2">{requirement.codeId}</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-16">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-xl flex flex-wrap items-center gap-2">
                  Requirement Details
                  <Badge className="ml-0 sm:ml-3" variant="outline">
                    {requirement.category.charAt(0).toUpperCase() + requirement.category.slice(1)}
                  </Badge>
                  <Badge className="ml-0 sm:ml-2" variant="outline">
                    <PriorityIcon className="h-3 w-3 mr-1" />
                    {requirement.priority}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Added on {formatDateTime(requirement.createdAt)}
                </CardDescription>
              </div>
              
              {!isEditing ? (
                <div className="flex items-center gap-2 self-start sm:self-center">
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
                        <AlertDialogTitle>Delete Requirement</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this requirement? This action cannot be undone.
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
                    disabled={updateRequirementMutation.isPending}
                  >
                    {updateRequirementMutation.isPending ? (
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
                <div className="p-4 border rounded-md bg-muted/20 whitespace-pre-line">
                  {requirement.text}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="text">Requirement Text</Label>
                    <Textarea 
                      id="text"
                      value={formData.text}
                      onChange={handleTextChange}
                      className="min-h-[120px]"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select 
                        value={formData.category} 
                        onValueChange={handleCategoryChange}
                      >
                        <SelectTrigger id="category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="functional">Functional</SelectItem>
                          <SelectItem value="non-functional">Non-functional</SelectItem>
                          <SelectItem value="security">Security</SelectItem>
                          <SelectItem value="performance">Performance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <Select 
                        value={formData.priority} 
                        onValueChange={handlePriorityChange}
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
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="metadata">
                <TabsList className="mb-4 flex flex-wrap gap-1">
                  <TabsTrigger className="text-xs sm:text-sm" value="metadata">Metadata</TabsTrigger>
                  <TabsTrigger className="text-xs sm:text-sm" value="acceptance">Acceptance Criteria</TabsTrigger>
                  <TabsTrigger className="text-xs sm:text-sm" value="tasks">Implementation Tasks</TabsTrigger>
                  <TabsTrigger className="text-xs sm:text-sm" value="references">Reference Data</TabsTrigger>
                  <TabsTrigger className="text-xs sm:text-sm" value="history">History</TabsTrigger>
                </TabsList>
                
                <TabsContent value="metadata">
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Requirement ID</dt>
                      <dd className="text-md font-semibold">{requirement.codeId}</dd>
                    </div>
                    
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Source</dt>
                      <dd className="text-md font-semibold">{requirement.source || 'Manually created'}</dd>
                    </div>
                    
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Created At</dt>
                      <dd className="text-md font-semibold">{formatDateTime(requirement.createdAt)}</dd>
                    </div>
                    
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Last Updated</dt>
                      <dd className="text-md font-semibold">{formatDateTime(requirement.updatedAt)}</dd>
                    </div>
                  </dl>
                </TabsContent>
                
                <TabsContent value="acceptance">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-4 sticky top-0 bg-background pt-2 pb-2 z-10">
                      <h3 className="text-lg font-medium">Acceptance Criteria</h3>
                      <Dialog open={isAddingCriterion} onOpenChange={setIsAddingCriterion}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="whitespace-nowrap">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Criterion
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Acceptance Criterion</DialogTitle>
                            <DialogDescription>
                              Add a new criterion that must be met for this requirement to be considered complete.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-2">
                            <div>
                              <Label htmlFor="description">Description</Label>
                              <Textarea 
                                id="description"
                                placeholder="Enter criterion description..."
                                value={newCriterion.description}
                                onChange={(e) => setNewCriterion({ ...newCriterion, description: e.target.value })}
                                className="min-h-[120px]"
                              />
                            </div>
                            <div>
                              <Label htmlFor="status">Status</Label>
                              <Select 
                                value={newCriterion.status} 
                                onValueChange={(value) => setNewCriterion({ ...newCriterion, status: value })}
                              >
                                <SelectTrigger id="status">
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="approved">Approved</SelectItem>
                                  <SelectItem value="rejected">Rejected</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <DialogFooter className="flex gap-2 justify-end mt-4">
                            <Button
                              variant="outline"
                              onClick={() => setIsAddingCriterion(false)}
                            >
                              Cancel
                            </Button>
                            <Button 
                              type="submit" 
                              onClick={handleAddCriterion}
                              disabled={addCriterionMutation.isPending}
                            >
                              {addCriterionMutation.isPending ? (
                                <>
                                  <div className="animate-spin w-4 h-4 border-2 border-current rounded-full border-t-transparent mr-2"></div>
                                  Adding...
                                </>
                              ) : (
                                'Add Criterion'
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                    
                    <div className="max-h-[400px] overflow-y-auto rounded-md border">
                      {requirement.acceptanceCriteria && requirement.acceptanceCriteria.length > 0 ? (
                        <Table>
                          <TableCaption>List of criteria that must be met for this requirement to be considered complete.</TableCaption>
                          <TableHeader className="sticky top-0 bg-muted/50 backdrop-blur-sm">
                            <TableRow>
                              <TableHead className="w-[50px]">#</TableHead>
                              <TableHead>Scenario</TableHead>
                              <TableHead>Given</TableHead>
                              <TableHead>When</TableHead>
                              <TableHead>And</TableHead>
                              <TableHead>Then</TableHead>
                              <TableHead className="w-[100px]">Status</TableHead>
                              <TableHead className="w-[80px] text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {requirement.acceptanceCriteria.map((criterion: AcceptanceCriterion, index: number) => {
                              // Parse Gherkin components from description
                              const description = criterion.description || '';
                              
                              // Use the structured gherkin data if available, otherwise parse from description
                              let scenario = '';
                              let given = '';
                              let when = '';
                              let and = '';
                              let then = '';
                              
                              // Check if we have structured gherkin data
                              if (criterion.gherkin) {
                                scenario = criterion.gherkin.scenario;
                                given = criterion.gherkin.given;
                                when = criterion.gherkin.when;
                                and = criterion.gherkin.and && criterion.gherkin.and.length > 0 
                                  ? criterion.gherkin.and[0] 
                                  : '';
                                then = criterion.gherkin.then;
                              } else {
                                // Fallback to text parsing for backward compatibility
                                // Split by lines for better parsing
                                const lines = description.split('\n');
                                for (const line of lines) {
                                  const trimmedLine = line.trim();
                                  
                                  // Check for Scenario
                                  if (trimmedLine.match(/^[Ss][Cc][Ee][Nn][Aa][Rr][Ii][Oo]:/)) {
                                    scenario = trimmedLine.replace(/^[Ss][Cc][Ee][Nn][Aa][Rr][Ii][Oo]:?\s*/, '').trim();
                                  }
                                  // Check for Given
                                  else if (trimmedLine.match(/^[Gg][Ii][Vv][Ee][Nn]/)) {
                                    given = trimmedLine.replace(/^[Gg][Ii][Vv][Ee][Nn]\s+/, '').trim();
                                  }
                                  // Check for When
                                  else if (trimmedLine.match(/^[Ww][Hh][Ee][Nn]/)) {
                                    when = trimmedLine.replace(/^[Ww][Hh][Ee][Nn]\s+/, '').trim();
                                  }
                                  // Check for And - take the first one
                                  else if (trimmedLine.match(/^[Aa][Nn][Dd]/) && !and) {
                                    and = trimmedLine.replace(/^[Aa][Nn][Dd]\s+/, '').trim();
                                  }
                                  // Check for Then
                                  else if (trimmedLine.match(/^[Tt][Hh][Ee][Nn]/)) {
                                    then = trimmedLine.replace(/^[Tt][Hh][Ee][Nn]\s+/, '').trim();
                                  }
                                }
                              }
                              
                              return (
                                <TableRow key={criterion.id}>
                                  <TableCell className="font-medium p-2 align-top">
                                    <div className="w-6 text-center">{index + 1}</div>
                                  </TableCell>
                                  <TableCell className="p-2 align-top">
                                    <div className="w-[150px] break-words hover:underline cursor-pointer"
                                         onClick={() => {
                                           setSelectedCriterion(criterion);
                                           setDialogOpen(true);
                                         }}>
                                      {scenario}
                                    </div>
                                  </TableCell>
                                  <TableCell className="p-2 align-top">
                                    <div className="w-[150px] break-words">{given}</div>
                                  </TableCell>
                                  <TableCell className="p-2 align-top">
                                    <div className="w-[150px] break-words">{when}</div>
                                  </TableCell>
                                  <TableCell className="p-2 align-top">
                                    <div className="w-[150px] break-words">{and}</div>
                                  </TableCell>
                                  <TableCell className="p-2 align-top">
                                    <div className="w-[150px] break-words">{then}</div>
                                  </TableCell>
                                  <TableCell className="p-2 align-top">
                                    <Badge 
                                      variant={criterion.status === 'approved' ? 'default' : 
                                              criterion.status === 'rejected' ? 'destructive' : 'outline'}
                                    >
                                      {criterion.status.charAt(0).toUpperCase() + criterion.status.slice(1)}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right p-2 align-top">
                                    <div className="flex gap-1 justify-end">
                                      <Button variant="ghost" size="icon" onClick={() => {
                                        setSelectedCriterion(criterion);
                                        setDialogOpen(true);
                                      }}>
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon">
                                        <Edit2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 bg-muted/10">
                          <p className="text-muted-foreground mb-4">No acceptance criteria defined yet</p>
                          <Button 
                            variant="outline" 
                            className="gap-2"
                            onClick={handleGenerateCriteria}
                            disabled={isGeneratingCriteria}
                          >
                            {isGeneratingCriteria ? (
                              <>
                                <div className="animate-spin w-4 h-4 border-2 border-current rounded-full border-t-transparent"></div>
                                Generating...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-4 w-4 mr-2" />
                                Generate Criteria Automatically
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Acceptance Criteria Expanded View Dialog */}
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                      <DialogContent className="max-w-3xl">
                        <DialogHeader>
                          <DialogTitle>Acceptance Criterion Details</DialogTitle>
                        </DialogHeader>
                        {selectedCriterion && (
                          <div className="space-y-4 py-2">
                            <div className="flex items-center justify-between mb-2">
                              <Badge
                                variant={
                                  selectedCriterion.status === 'approved' ? 'default' :
                                  selectedCriterion.status === 'rejected' ? 'destructive' : 'outline'
                                }
                              >
                                {selectedCriterion.status.charAt(0).toUpperCase() + selectedCriterion.status.slice(1)}
                              </Badge>
                            </div>
                            <div className="p-4 border rounded-lg bg-muted/20 whitespace-pre-line">
                              {selectedCriterion.description}
                            </div>
                            {selectedCriterion.notes && (
                              <div>
                                <h4 className="text-sm font-medium mb-1">Notes:</h4>
                                <p className="text-muted-foreground text-sm">{selectedCriterion.notes}</p>
                              </div>
                            )}
                          </div>
                        )}
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Close
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </TabsContent>
                
                <TabsContent value="tasks">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium">Implementation Tasks</h3>
                      <div className="relative group">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleGenerateTasks}
                          disabled={generateTasksMutation.isPending}
                          className="flex gap-2 items-center"
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          <span>Generate Tasks</span>
                        </Button>
                        <div className="absolute right-0 top-full mt-2 w-72 p-2 bg-popover text-popover-foreground text-sm rounded-md shadow-md hidden group-hover:block z-50">
                          Project must have source and target systems defined. 
                          Edit the project details to add this information.
                        </div>
                      </div>
                    </div>
                    {isTasksLoading ? (
                      <div className="py-8 flex justify-center">
                        <div className="animate-spin w-8 h-8 border-2 border-primary rounded-full border-t-transparent"></div>
                      </div>
                    ) : implementationTasks && implementationTasks.length > 0 ? (
                      <TasksTable 
                        projectId={projectId}
                        requirementId={requirementId}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 bg-muted/10 rounded-md border">
                        <Wrench className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                        <p className="text-muted-foreground mb-2">No implementation tasks defined yet</p>
                        <p className="text-sm text-muted-foreground mb-4 max-w-md text-center">
                          Define tasks that need to be completed in both source and target systems to implement this requirement.
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="references">
                  <ReferenceDataTab 
                    requirementId={requirementId} 
                    projectId={projectId} 
                  />
                </TabsContent>
                
                <TabsContent value="history">
                  {relatedActivities.length > 0 ? (
                    <div className="space-y-4">
                      {relatedActivities.map((activity: Activity) => (
                        <div 
                          key={activity.id}
                          className="flex items-start border-l-2 border-primary pl-4 py-2"
                        >
                          <Clock className="h-5 w-5 mr-2 text-muted-foreground shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium">{activity.description}</p>
                            <p className="text-xs text-muted-foreground">{formatDateTime(activity.createdAt)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No activity history available for this requirement</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
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
                {requirement.inputDataId ? (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Source Data</h3>
                    <div className="border rounded-md p-3 bg-muted/20">
                      <p className="font-medium">{requirement.source}</p>
                      <p className="text-sm text-muted-foreground">
                        Generated from input data
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Source</h3>
                    <div className="border rounded-md p-3 bg-muted/20">
                      <p className="text-sm text-muted-foreground">
                        Manually created
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
                      onClick={() => setLocation(`/projects/${projectId}`)}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span>Back to Project</span>
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