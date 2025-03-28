import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Requirement, Activity } from '@/lib/types';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getCategoryColor, getPriorityInfo, formatDateTime } from '@/lib/utils';
import { ArrowLeft, Edit2, Save, Trash2, Clock, AlertTriangle, CheckCircle2, X } from 'lucide-react';

interface RequirementDetailProps {
  projectId: number;
  requirementId: number;
}

export default function RequirementDetail({ projectId, requirementId }: RequirementDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
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
      const result = await apiRequest("GET", `/api/projects/${projectId}/requirements/${requirementId}`);
      return result.json();
    }
  });
  
  // Get project activities related to this requirement
  const { data: activities } = useQuery({
    queryKey: ['/api/projects', projectId, 'activities'],
    queryFn: async () => {
      const result = await apiRequest("GET", `/api/projects/${projectId}/activities`);
      return result.json();
    }
  });
  
  // Filter activities related to this requirement
  const relatedActivities = activities?.filter(
    (activity: Activity) => activity.relatedEntityId === requirementId
  ) || [];
  
  // Update requirement mutation
  const updateRequirementMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const result = await apiRequest(
        "PUT",
        `/api/projects/${projectId}/requirements/${requirementId}`,
        data
      );
      return result.json();
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
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          onClick={() => setLocation(`/projects/${projectId}`)}
          className="mr-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Project
        </Button>
        
        <h1 className="text-2xl font-bold ml-2">{requirement.codeId}</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center">
                  Requirement Details
                  <Badge className="ml-3" variant="outline">
                    {requirement.category.charAt(0).toUpperCase() + requirement.category.slice(1)}
                  </Badge>
                  <Badge className="ml-2" variant="outline">
                    <PriorityIcon className="h-3 w-3 mr-1" />
                    {requirement.priority}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Added on {formatDateTime(requirement.createdAt)}
                </CardDescription>
              </div>
              
              {!isEditing ? (
                <div className="flex">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mr-2"
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
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ) : (
                <div className="flex">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mr-2"
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
                <TabsList className="mb-4">
                  <TabsTrigger value="metadata">Metadata</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
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
                      className="w-full justify-start"
                      onClick={() => setLocation(`/projects/${projectId}`)}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Project
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