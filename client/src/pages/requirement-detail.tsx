import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Requirement, Activity, Project, AcceptanceCriterion, GherkinStructure, ExpertReview } from '@/lib/types';
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
import { ArrowLeft, Edit2, Save, Trash2, Clock, AlertTriangle, CheckCircle2, X, Plus, Sparkles, Wrench, Video, FileText, AudioWaveform, Eye, Users } from 'lucide-react';
import { TasksTable } from '@/components/implementation-tasks/tasks-table';
import { ReferenceDataTab } from '@/components/reference-data/reference-data-tab';
import { RequirementRoleEffort } from '@/components/roles/requirement-role-effort';

interface RequirementDetailProps {
  projectId: number;
  requirementId: number;
}

export default function RequirementDetail({ projectId, requirementId }: RequirementDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isGeneratingCriteria, setIsGeneratingCriteria] = useState(false);
  const [isAddingCriterion, setIsAddingCriterion] = useState(false);
  const [isEditingCriterion, setIsEditingCriterion] = useState(false);
  const [selectedCriterion, setSelectedCriterion] = useState<AcceptanceCriterion | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newCriterion, setNewCriterion] = useState<{description: string, status: string}>({
    description: '',
    status: 'pending'
  });
  const [editCriterion, setEditCriterion] = useState<{description: string, status: string}>({
    description: '',
    status: 'pending'
  });
  const [, setLocation] = useLocation();
  
  // Form state
  const [formData, setFormData] = useState<{
    description: string;
    category: string;
    priority: string;
  }>({
    description: '',
    category: 'functional',
    priority: 'medium'
  });
  
  // Get requirement data
  const { data: requirement, isLoading, isError } = useQuery({
    queryKey: ['/api/projects', projectId, 'requirements', requirementId],
    queryFn: async () => {
      return apiRequest(`/api/projects/${projectId}/requirements/${requirementId}`);
    }
  });
  
  // Get project activities related to this requirement
  const { data: activities } = useQuery({
    queryKey: ['/api/projects', projectId, 'activities'],
    queryFn: async () => {
      return apiRequest(`/api/projects/${projectId}/activities`);
    }
  });
  
  // Get implementation tasks for this requirement
  const { data: implementationTasks, isLoading: isTasksLoading } = useQuery({
    queryKey: ['/api/requirements', requirementId, 'tasks'],
    queryFn: async () => {
      return apiRequest(`/api/requirements/${requirementId}/tasks`);
    }
  });
  
  // Get input data if requirement has inputDataId
  const { data: inputData } = useQuery({
    queryKey: ['/api/projects', projectId, 'input-data', requirement?.inputDataId],
    queryFn: async () => {
      if (!requirement || !requirement.inputDataId) return null;
      return apiRequest(`/api/projects/${projectId}/input-data/${requirement.inputDataId}`);
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
        `/api/projects/${projectId}/requirements/${requirementId}`,
        {
          method: "PUT",
          data
        }
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
        `/api/projects/${projectId}/requirements/${requirementId}`,
        {
          method: "DELETE"
        }
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
        description: requirement.description,
        category: requirement.category,
        priority: requirement.priority,
      });
    }
  }, [requirement]);
  
  const handleSave = () => {
    // Ensure we preserve all existing fields that aren't in the form
    // by merging formData with the existing requirement data
    if (requirement) {
      const updatedData = {
        ...formData,
        // Preserve these fields from the existing requirement
        title: requirement.title,
        codeId: requirement.codeId,
        source: requirement.source,
        videoScenes: requirement.videoScenes || [],
        textReferences: requirement.textReferences || [],
        audioTimestamps: requirement.audioTimestamps || [],
        expertReview: requirement.expertReview
      };
      updateRequirementMutation.mutate(updatedData);
    } else {
      updateRequirementMutation.mutate(formData);
    }
  };
  
  const handleDelete = () => {
    deleteRequirementMutation.mutate();
  };
  
  // Form input handlers
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData({ ...formData, description: e.target.value });
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
      console.log(`Generating criteria for requirement ID: ${requirementId} in project: ${projectId}`);
      // Call the server endpoint to generate acceptance criteria with Claude
      return apiRequest(
        `/api/requirements/${requirementId}/generate-acceptance-criteria`,
        {
          method: "POST",
          data: { projectId } // Include projectId in the request body
        }
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
        description: `${data.length} acceptance criteria have been automatically generated, providing comprehensive test scenarios for this requirement.`,
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
      console.log(`Generating tasks for requirement ID: ${requirementId} in project: ${projectId}`);
      return apiRequest(
        `/api/requirements/${requirementId}/generate-tasks`,
        {
          method: "POST",
          data: { projectId } // Include projectId in the request body
        }
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
      
      setIsGeneratingTasks(false);
    },
    onError: (error: any) => {
      const errorMessage = error.message || "There was a problem generating implementation tasks.";
      toast({
        title: "Error Generating Tasks",
        description: errorMessage,
        variant: "destructive",
      });
      
      setIsGeneratingTasks(false);
    }
  });
  
  // Track the tasks generation loading state
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);
  
  const handleGenerateTasks = () => {
    setIsGeneratingTasks(true);
    generateTasksMutation.mutate();
  };
  
  // Track the expert review generation loading state
  const [isGeneratingExpertReview, setIsGeneratingExpertReview] = useState(false);
  
  // Mutation for generating AI Expert Review using Google Gemini
  const generateExpertReviewMutation = useMutation({
    mutationFn: async () => {
      console.log(`Generating expert review for requirement ID: ${requirementId}`);
      // Call the server endpoint to generate expert review with Google Gemini
      return apiRequest(
        `/api/requirements/${requirementId}/generate-expert-review`,
        {
          method: "POST"
        }
      );
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/projects', projectId, 'requirements', requirementId] 
      });
      
      toast({
        title: "Expert Review Generated",
        description: "AI Expert review has been generated for this requirement using Google Gemini.",
      });
      
      setIsGeneratingExpertReview(false);
    },
    onError: (error: any) => {
      const errorMessage = error.message || "There was a problem generating the expert review.";
      
      // Check if it's an API key error
      if (errorMessage.includes("API key") || errorMessage.includes("GOOGLE_API_KEY")) {
        toast({
          title: "Google API Key Missing",
          description: "Please add your Google API key in the environment variables to use this feature.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error Generating Expert Review",
          description: errorMessage,
          variant: "destructive",
        });
      }
      
      setIsGeneratingExpertReview(false);
    }
  });
  
  const handleGenerateExpertReview = () => {
    setIsGeneratingExpertReview(true);
    generateExpertReviewMutation.mutate();
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
        `/api/projects/${projectId}/requirements/${requirementId}`,
        {
          method: "PUT",
          data: { 
            acceptanceCriteria: [...currentCriteria, newCriterionWithId]
          }
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
  
  // Update criterion mutation
  const updateCriterionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCriterion) return;
      
      // Get current criteria
      const currentCriteria = requirement.acceptanceCriteria || [];
      
      // Format the description in Gherkin format if it's not already
      let formattedDescription = editCriterion.description;
      
      // Check if description already has Gherkin format (case-insensitive manually)
      const hasGherkinFormat = /^\s*[Ss][Cc][Ee][Nn][Aa][Rr][Ii][Oo]:.*[Gg][Ii][Vv][Ee][Nn].*[Ww][Hh][Ee][Nn].*[Tt][Hh][Ee][Nn]/.test(formattedDescription);
      
      if (!hasGherkinFormat) {
        // Simple formatting to Gherkin if user entered plain text
        formattedDescription = `Scenario: User scenario\nGiven ${formattedDescription}\nWhen a condition occurs\nThen expected outcome happens`;
      }
      
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
      
      // Update the selected criterion with new data
      const updatedCriterion = {
        ...selectedCriterion,
        description: formattedDescription,
        status: editCriterion.status as 'pending' | 'approved' | 'rejected',
        gherkin: gherkinData
      };
      
      // Replace the old criterion with the updated one in the array
      const updatedCriteria = currentCriteria.map(criterion => 
        criterion.id === selectedCriterion.id ? updatedCriterion : criterion
      );
      
      // Update the requirement with the updated acceptance criteria
      return apiRequest(
        `/api/projects/${projectId}/requirements/${requirementId}`,
        {
          method: "PUT",
          data: { 
            acceptanceCriteria: updatedCriteria
          }
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/projects', projectId, 'requirements', requirementId] 
      });
      
      toast({
        title: "Criterion Updated",
        description: "The acceptance criterion has been updated successfully.",
      });
      
      // Reset form and close dialog
      setEditCriterion({
        description: '',
        status: 'pending'
      });
      setIsEditingCriterion(false);
    },
    onError: (error) => {
      toast({
        title: "Error Updating Criterion",
        description: "There was a problem updating the acceptance criterion.",
        variant: "destructive",
      });
    }
  });
  
  const handleUpdateCriterion = () => {
    if (editCriterion.description.trim() === '') {
      toast({
        title: "Validation Error",
        description: "Please enter a description for the criterion.",
        variant: "destructive",
      });
      return;
    }
    
    updateCriterionMutation.mutate();
  };
  
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
  
  // Parse expertReview if it's a string (from database JSON)
  const parsedExpertReview = requirement.expertReview ? 
    (typeof requirement.expertReview === 'string' ? 
      JSON.parse(requirement.expertReview as string) : 
      requirement.expertReview) as ExpertReview : 
    null;
  
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
                    {requirement.category ? 
                      requirement.category.charAt(0).toUpperCase() + requirement.category.slice(1) :
                      'Uncategorized'
                    }
                  </Badge>
                  <Badge className="ml-0 sm:ml-2" variant="outline">
                    <PriorityIcon className="h-3 w-3 mr-1" />
                    {requirement.priority || 'Medium'}
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
                  <div className="font-medium text-lg mb-2">{requirement.title}</div>
                  <div>{requirement.description}</div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="description">Requirement Description</Label>
                    <Textarea 
                      id="description"
                      value={formData.description}
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
                          <SelectItem value="usability">Usability</SelectItem>
                          <SelectItem value="compatibility">Compatibility</SelectItem>
                          <SelectItem value="workflow">Workflow</SelectItem>
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
                  <TabsTrigger className="text-xs sm:text-sm" value="roles">
                    <Users className="h-3.5 w-3.5 mr-1" />
                    Roles
                  </TabsTrigger>
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
                                      variant={!criterion.status ? 'outline' :
                                              criterion.status === 'approved' ? 'default' : 
                                              criterion.status === 'rejected' ? 'destructive' : 'outline'}
                                    >
                                      {criterion.status ? criterion.status.charAt(0).toUpperCase() + criterion.status.slice(1) : 'Pending'}
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
                                      <Button variant="ghost" size="icon" onClick={() => {
                                        setSelectedCriterion(criterion);
                                        setEditCriterion({
                                          description: criterion.description,
                                          status: criterion.status || 'pending'
                                        });
                                        setIsEditingCriterion(true);
                                      }}>
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
                                Generate Acceptance Criteria
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
                                  !selectedCriterion.status ? 'outline' :
                                  selectedCriterion.status === 'approved' ? 'default' :
                                  selectedCriterion.status === 'rejected' ? 'destructive' : 'outline'
                                }
                              >
                                {selectedCriterion.status ? selectedCriterion.status.charAt(0).toUpperCase() + selectedCriterion.status.slice(1) : 'Pending'}
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
                    
                    {/* Edit Acceptance Criterion Dialog */}
                    <Dialog open={isEditingCriterion} onOpenChange={setIsEditingCriterion}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Acceptance Criterion</DialogTitle>
                          <DialogDescription>
                            Update this acceptance criterion for the requirement.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                          <div>
                            <Label htmlFor="edit-description">Description</Label>
                            <Textarea 
                              id="edit-description"
                              placeholder="Enter criterion description..."
                              value={editCriterion.description}
                              onChange={(e) => setEditCriterion({ ...editCriterion, description: e.target.value })}
                              className="min-h-[120px]"
                            />
                          </div>
                          <div>
                            <Label htmlFor="edit-status">Status</Label>
                            <Select 
                              value={editCriterion.status} 
                              onValueChange={(value) => setEditCriterion({ ...editCriterion, status: value })}
                            >
                              <SelectTrigger id="edit-status">
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
                            onClick={() => setIsEditingCriterion(false)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit" 
                            onClick={handleUpdateCriterion}
                            disabled={updateCriterionMutation.isPending}
                          >
                            {updateCriterionMutation.isPending ? (
                              <>
                                <div className="animate-spin w-4 h-4 border-2 border-current rounded-full border-t-transparent mr-2"></div>
                                Saving...
                              </>
                            ) : (
                              'Save Changes'
                            )}
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
                          disabled={generateTasksMutation.isPending || isGeneratingTasks}
                          className="flex gap-2 items-center"
                        >
                          {isGeneratingTasks ? (
                            <>
                              <div className="animate-spin w-4 h-4 border-2 border-current rounded-full border-t-transparent mr-2"></div>
                              <span>Generating...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 mr-2" />
                              <span>Generate Tasks</span>
                            </>
                          )}
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
                
                <TabsContent value="roles">
                  <RequirementRoleEffort
                    projectId={projectId}
                    requirementId={requirementId}
                  />
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
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle>AI Expert Review</CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleGenerateExpertReview}
                disabled={isGeneratingExpertReview}
              >
                {isGeneratingExpertReview ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-current rounded-full border-t-transparent mr-2"></div>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Review
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent>
              {/* Use the parsed expert review */}
              {parsedExpertReview ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <h4 className="font-medium">Overall Rating:</h4>
                    <Badge 
                      variant={
                        parsedExpertReview.evaluation.rating === 'good' ? 'default' :
                        parsedExpertReview.evaluation.rating === 'bad' ? 'destructive' :
                        'outline'
                      }
                    >
                      {parsedExpertReview.evaluation.rating === 'good' ? 'Good' : 
                       parsedExpertReview.evaluation.rating === 'good with caveats' ? 'Good with Caveats' : 
                       'Needs Improvement'}
                    </Badge>
                  </div>
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Expert Explanation:</h4>
                    <div className="p-3 bg-muted/50 rounded-md whitespace-pre-line">
                      {parsedExpertReview.evaluation.explanation}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Follow-up Questions to Consider:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {parsedExpertReview.evaluation.follow_up_questions.map((question: string, index: number) => (
                        <li key={index} className="ml-2">{question}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 border rounded-md bg-muted/10">
                  <p className="text-muted-foreground mb-4">No expert review generated yet</p>
                  <p className="text-sm text-muted-foreground mb-6 max-w-md text-center">
                    Generate an AI-powered expert review using Google Gemini to evaluate this requirement's 
                    clarity, completeness, and consistency.
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={handleGenerateExpertReview}
                    disabled={isGeneratingExpertReview}
                    className="gap-2"
                  >
                    {isGeneratingExpertReview ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-current rounded-full border-t-transparent"></div>
                        Analyzing Requirement...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Expert Review
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}