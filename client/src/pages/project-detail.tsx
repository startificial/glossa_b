import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ProjectHeader } from "@/components/projects/project-header";
import { MetricsCard } from "@/components/dashboard/metrics-card";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { PriorityRequirements } from "@/components/dashboard/priority-requirements";
import { RequirementsList } from "@/components/requirements/requirements-list";
import { InputDataList } from "@/components/input-data/input-data-list";
import { InputDataUpload } from "@/components/input-data/input-data-upload";
import { ProjectTasks } from "@/components/projects/project-tasks";
import { DocumentGenerator } from "@/components/documentation/document-generator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Project, InputData } from "@/lib/types";

interface ProjectDetailProps {
  projectId: number;
}

export default function ProjectDetail({ projectId }: ProjectDetailProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [previousTab, setPreviousTab] = useState("dashboard");
  const [showUploadForm, setShowUploadForm] = useState(false);
  
  const { 
    data: project, 
    isLoading, 
    error 
  } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`]
  });
  
  const { data: inputDataList } = useQuery<InputData[]>({
    queryKey: [`/api/projects/${projectId}/input-data`],
  });
  
  // Show error toast if project loading fails
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load project details. Please try again later.",
        variant: "destructive"
      });
    }
  }, [error, toast]);

  // Check for processing requirements when changing tabs
  useEffect(() => {
    if (previousTab === "inputData" && activeTab !== "inputData" && inputDataList) {
      const processingItems = inputDataList.filter(item => item.status === "processing");
      
      if (processingItems.length > 0) {
        toast({
          title: "Requirements being generated",
          description: `${processingItems.length} ${processingItems.length === 1 ? 'file is' : 'files are'} still being processed. Requirements will appear in the Requirements tab when complete.`,
          duration: 5000,
        });
      }
    }
    
    setPreviousTab(activeTab);
  }, [activeTab, previousTab, inputDataList, toast]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const handleAddInputData = () => {
    setActiveTab("inputData");
    setShowUploadForm(true);
  };

  if (isLoading) {
    return (
      <>
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-7 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
            <div className="flex space-x-3">
              <Skeleton className="h-9 w-28" />
              <Skeleton className="h-9 w-36" />
              <Skeleton className="h-9 w-9 rounded" />
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 bg-gray-50 dark:bg-gray-900">
          <div className="space-y-4">
            <Skeleton className="h-10 w-full rounded" />
            <Skeleton className="h-80 w-full rounded" />
          </div>
        </div>
      </>
    );
  }

  if (!project) {
    return (
      <div className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Project Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400">The project you are looking for does not exist or has been deleted.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ProjectHeader 
        projectId={projectId} 
        onAddInputData={handleAddInputData} 
      />
      
      <div className="flex-1 overflow-auto p-4 bg-gray-50 dark:bg-gray-900">
        <Tabs 
          value={activeTab} 
          onValueChange={handleTabChange}
          className="space-y-6"
        >
          <TabsList className="bg-white dark:bg-gray-800 p-1 rounded-md">
            <TabsTrigger value="dashboard" className="py-2">
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="inputData" className="py-2">
              Input Data
            </TabsTrigger>
            <TabsTrigger value="requirements" className="py-2">
              Requirements
            </TabsTrigger>
            <TabsTrigger value="tasks" className="py-2">
              Implementation Tasks
            </TabsTrigger>
            <TabsTrigger value="documentation" className="py-2">
              Documentation
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard" className="space-y-6">
            <MetricsCard projectId={projectId} />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RecentActivity projectId={projectId} />
              <PriorityRequirements projectId={projectId} />
            </div>
          </TabsContent>
          
          <TabsContent value="inputData" className="space-y-6">
            {showUploadForm ? (
              <InputDataUpload 
                projectId={projectId} 
                onUploaded={() => setShowUploadForm(false)}
              />
            ) : (
              <InputDataList projectId={projectId} />
            )}
          </TabsContent>
          
          <TabsContent value="requirements" className="space-y-6">
            <RequirementsList projectId={projectId} />
          </TabsContent>
          
          <TabsContent value="tasks" className="space-y-6">
            <ProjectTasks projectId={projectId} />
          </TabsContent>
          
          <TabsContent value="documentation" className="space-y-6">
            <DocumentGenerator projectId={projectId} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
