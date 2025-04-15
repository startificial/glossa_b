import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { FileText, Download, Calendar, AlertCircle, CheckCircle, FileCheck, BookOpen, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";
import { Project, Requirement, ImplementationTask } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface SowGeneratorProps {
  projectId: number;
}

type DocumentType = "sow" | "implementation-plan" | "requirement-spec" | "user-guide" | "training-manual" | "feature-guide";

interface DocumentTemplate {
  id: DocumentType;
  title: string;
  description: string;
  icon: React.ReactNode;
  requiresTasks: boolean;
}

export function SowGenerator({ projectId }: SowGeneratorProps) {
  const [selectedDocType, setSelectedDocType] = useState<DocumentType>("sow");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedDocumentUrl, setGeneratedDocumentUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch project data
  const { data: project, isLoading: isLoadingProject } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`]
  });

  // Fetch requirements 
  const { data: requirements, isLoading: isLoadingRequirements } = useQuery<Requirement[]>({
    queryKey: [`/api/projects/${projectId}/requirements`]
  });

  // Fetch tasks
  const { data: tasks, isLoading: isLoadingTasks } = useQuery<ImplementationTask[][]>({
    queryKey: [`/api/projects/${projectId}/tasks`],
    enabled: !!requirements,
    queryFn: async () => {
      if (!requirements || requirements.length === 0) return [];
      
      const taskPromises = requirements.map(req => 
        fetch(`/api/requirements/${req.id}/tasks`)
          .then(res => res.json())
          .catch(() => [])
      );
      
      return Promise.all(taskPromises);
    }
  });

  const isLoading = isLoadingProject || isLoadingRequirements || isLoadingTasks;
  
  // Flatten tasks array
  const allTasks = tasks ? tasks.flat() : [];
  
  // Document templates
  const documentTemplates: DocumentTemplate[] = [
    {
      id: "sow",
      title: "Statement of Work",
      description: "A detailed document outlining project scope, deliverables, timeline, and costs",
      icon: <FileText className="h-8 w-8 text-primary" />,
      requiresTasks: true
    },
    {
      id: "implementation-plan",
      title: "Implementation Plan",
      description: "A comprehensive plan detailing the steps needed to implement the project",
      icon: <Calendar className="h-8 w-8 text-primary" />,
      requiresTasks: true
    },
    {
      id: "requirement-spec",
      title: "Requirements Specification",
      description: "A detailed document describing all functional and non-functional requirements",
      icon: <FileCheck className="h-8 w-8 text-primary" />,
      requiresTasks: false
    },
    {
      id: "user-guide",
      title: "User Guide",
      description: "End user documentation explaining how to use the system features",
      icon: <BookOpen className="h-8 w-8 text-primary" />,
      requiresTasks: false
    },
    {
      id: "training-manual",
      title: "Training Manual",
      description: "A comprehensive guide for training users on the new system",
      icon: <HelpCircle className="h-8 w-8 text-primary" />,
      requiresTasks: true
    }
  ];

  // Calculate estimated totals for SOW
  const calculateTotals = () => {
    if (!allTasks || allTasks.length === 0) {
      return { hours: 0, cost: 0 };
    }

    const totalHours = allTasks.reduce((sum, task) => {
      return sum + (task.estimatedHours || 0);
    }, 0);

    // Assuming an average hourly rate of $150
    const hourlyRate = 150;
    const totalCost = totalHours * hourlyRate;

    return { hours: totalHours, cost: totalCost };
  };

  const totals = calculateTotals();

  // Generate document mutation
  const generateDocumentMutation = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);
      setProgress(0);
      
      // First 50% of progress is for server processing
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev < 50) {
            return prev + 1;
          }
          return prev;
        });
      }, 300);

      try {
        // Make the API request to our new simplified PDF generation endpoint
        const documentData = await (async () => {
          try {
            console.log(`Generating ${selectedDocType} PDF document for project ${projectId}`);
            
            // Use our new simple PDF generator endpoint
            const response = await fetch(`/api/generate-simple-pdf`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify({ 
                projectId: projectId,
                documentType: selectedDocType 
              })
            });
            
            // First check if response is OK
            if (!response.ok) {
              throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }
            
            // Then parse the response as JSON
            const jsonData = await response.json();
            console.log("Response from PDF generator:", jsonData);
            
            if (!jsonData.success) {
              throw new Error(jsonData.error || 'Failed to generate document');
            }
            
            return jsonData;
          } catch (err) {
            console.error('Error in document generation:', err);
            throw new Error(err instanceof Error ? err.message : 'Failed to generate document');
          }
        })();
        
        console.log("Document generation response:", documentData);

        clearInterval(interval);
        
        // Set progress to 80% after server processing
        setProgress(80);
        
        // Ensure we have a valid download URL before setting it
        if (documentData && typeof documentData === 'object' && 'downloadUrl' in documentData) {
          console.log("Setting document download URL:", documentData.downloadUrl);
          setGeneratedDocumentUrl(String(documentData.downloadUrl));
        } else {
          console.error("Missing download URL in response:", JSON.stringify(documentData));
          throw new Error("Document generation failed: Missing download URL in response");
        }
        
        // Complete the progress
        setTimeout(() => {
          setProgress(100);
          setTimeout(() => {
            setIsGenerating(false);
          }, 500); // Small delay to show the complete progress
        }, 500);
        
        return documentData as any;
      } catch (error) {
        clearInterval(interval);
        setIsGenerating(false);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Document generated successfully",
        description: "Your document is ready to download.",
        variant: "default",
      });
    },
    onError: (error: any) => {
      console.error("Error generating document:", error);
      const errorMessage = error?.response?.data?.details || error?.message || "Failed to generate document.";
      console.error("Error details:", errorMessage);
      
      toast({
        title: "Error",
        description: `Failed to generate document: ${errorMessage}. Please try again.`,
        variant: "destructive",
      });
      setIsGenerating(false);
      setProgress(0);
    }
  });

  const downloadDocument = async () => {
    if (generatedDocumentUrl) {
      try {
        console.log('Initiating document download from:', generatedDocumentUrl);
        
        // Direct download via URL - our simple API provides a direct PDF file URL
        window.open(generatedDocumentUrl, '_blank');
        
        // Use a backup method in case direct download fails
        setTimeout(async () => {
          try {
            // Try using the new download-pdf endpoint from our simplified API
            const fileName = generatedDocumentUrl.split('/').pop();
            if (fileName) {
              const directPdfUrl = `/api/download-pdf/${fileName}`;
              console.log('Using backup download method with URL:', directPdfUrl);
              window.open(directPdfUrl, '_blank');
            }
          } catch (err) {
            console.error('Backup download method failed:', err);
            toast({
              title: 'Download Issue',
              description: 'If the PDF didn\'t open automatically, try clicking the download button again.',
              variant: 'default',
            });
          }
        }, 1000); // Slight delay to avoid conflicts
      } catch (error) {
        console.error('Error during document download:', error);
        toast({
          title: 'Download Error',
          description: 'Failed to download the document. Please try again.',
          variant: 'destructive',
        });
      }
    }
  };

  // Reset generated document when changing document type
  useEffect(() => {
    setGeneratedDocumentUrl(null);
  }, [selectedDocType]);

  // Get the current template
  const currentTemplate = documentTemplates.find(t => t.id === selectedDocType);
  
  // Check if we can generate the current document type
  const canGenerate = !!project && !!requirements && 
    (!currentTemplate?.requiresTasks || (allTasks && allTasks.length > 0));

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-60 w-full" />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Document Generator</h2>
          </div>
          
          <Tabs defaultValue="sow" onValueChange={(value) => setSelectedDocType(value as DocumentType)}>
            <TabsList className="grid grid-cols-3 md:grid-cols-5 mb-6">
              <TabsTrigger value="sow">Statement of Work</TabsTrigger>
              <TabsTrigger value="implementation-plan">Implementation Plan</TabsTrigger>
              <TabsTrigger value="requirement-spec">Requirements Spec</TabsTrigger>
              <TabsTrigger value="user-guide">User Guide</TabsTrigger>
              <TabsTrigger value="training-manual">Training Manual</TabsTrigger>
            </TabsList>
            
            {documentTemplates.map((template) => (
              <TabsContent key={template.id} value={template.id}>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {template.icon}
                        <div>
                          <CardTitle>{template.title}</CardTitle>
                          <CardDescription>{template.description}</CardDescription>
                        </div>
                      </div>
                      <div>
                        <Badge variant={template.requiresTasks ? (allTasks?.length ? "default" : "destructive") : "default"}>
                          {template.requiresTasks ? (
                            allTasks?.length ? "Tasks Available" : "Tasks Required"
                          ) : "No Tasks Required"}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {template.id === "sow" && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Card>
                            <CardHeader className="py-3 px-4">
                              <CardTitle className="text-base flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Requirements
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="py-2 px-4">
                              <p className="text-2xl font-bold">{requirements?.length || 0}</p>
                            </CardContent>
                          </Card>
                          
                          <Card>
                            <CardHeader className="py-3 px-4">
                              <CardTitle className="text-base flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                Estimated Hours
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="py-2 px-4">
                              <p className="text-2xl font-bold">{totals.hours}</p>
                            </CardContent>
                          </Card>
                          
                          <Card>
                            <CardHeader className="py-3 px-4">
                              <CardTitle className="text-base flex items-center gap-2">
                                <span className="text-lg">$</span>
                                Estimated Cost
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="py-2 px-4">
                              <p className="text-2xl font-bold">${totals.cost.toLocaleString()}</p>
                            </CardContent>
                          </Card>
                        </div>
                      )}

                      <div className="rounded-md bg-blue-50 p-4">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <CheckCircle className="h-5 w-5 text-blue-400" />
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-blue-800">Automated Document Generation</h3>
                            <div className="mt-2 text-sm text-blue-700">
                              <p>
                                This document generator will create a professional PDF using data from your project's requirements and implementation tasks. The document's content is automatically structured based on industry standards.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {!canGenerate && template.requiresTasks && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Cannot Generate Document</AlertTitle>
                          <AlertDescription>
                            This document type requires implementation tasks to be defined for your requirements.
                            Please create tasks for your requirements before generating this document.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedDocType(template.id)}
                      className="w-full md:w-auto"
                    >
                      {template.id === selectedDocType ? "Selected" : "Select"}
                    </Button>
                    
                    <div className="flex space-x-2">
                      {generatedDocumentUrl && (
                        <Button 
                          variant="outline" 
                          onClick={downloadDocument}
                          className="flex items-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Download PDF
                        </Button>
                      )}
                      
                      <Button 
                        onClick={() => generateDocumentMutation.mutate()}
                        disabled={isGenerating || !canGenerate}
                        className="relative"
                      >
                        {isGenerating ? "Generating..." : "Generate Document"}
                      </Button>
                    </div>
                  </CardFooter>
                  
                  {isGenerating && (
                    <div className="px-6 pb-6">
                      <Progress value={progress} className="h-2" />
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        {progress < 50 && "Processing data and building document..."}
                        {progress >= 50 && progress < 80 && "Creating PDF document..."}
                        {progress >= 80 && progress < 100 && "Finalizing document..."}
                        {progress === 100 && "Document ready!"}
                      </p>
                    </div>
                  )}
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      )}
    </div>
  );
}