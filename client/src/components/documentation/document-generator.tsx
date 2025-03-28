import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { Project, Requirement, ImplementationTask } from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";
import { FileText, FileCheck, Calendar, Clock, DollarSign, ListChecks, Download } from "lucide-react";

interface DocumentGeneratorProps {
  projectId: number;
}

type DocumentType = "sow" | "implementation-plan" | "requirement-spec";

interface DocumentTemplate {
  id: DocumentType;
  title: string;
  description: string;
  icon: React.ReactNode;
  requiresTasks: boolean;
}

export function DocumentGenerator({ projectId }: DocumentGeneratorProps) {
  const [selectedDocType, setSelectedDocType] = useState<DocumentType>("sow");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);

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

  const generateDocument = () => {
    if (!project || !requirements) return;
    
    setIsGenerating(true);
    
    // In a real application, this would be an API call to generate the document
    setTimeout(() => {
      try {
        let content = "";
        
        switch (selectedDocType) {
          case "sow":
            content = generateSOW(project, requirements, allTasks);
            break;
          case "implementation-plan":
            content = generateImplementationPlan(project, requirements, allTasks);
            break;
          case "requirement-spec":
            content = generateRequirementSpec(project, requirements);
            break;
        }
        
        setGeneratedContent(content);
        setIsGenerating(false);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to generate document. Please try again.",
          variant: "destructive"
        });
        setIsGenerating(false);
      }
    }, 1500);
  };

  const generateSOW = (project: Project, requirements: Requirement[], tasks: ImplementationTask[]) => {
    const { hours, cost } = calculateTotals();
    
    return `# Statement of Work: ${project.name}

## Project Overview
**Client:** [Client Name]
**Project:** ${project.name}
**Type:** ${project.type}
**Date:** ${formatDateTime(new Date())}

## Project Description
${project.description || "No description provided."}

## Project Scope
This Statement of Work (SOW) outlines the software implementation work to be performed for the migration from ${project.sourceSystem || "[Source System]"} to ${project.targetSystem || "[Target System]"}.

### Objectives
- Successfully migrate all functionality from the source system to the target system
- Ensure data integrity throughout the migration process
- Provide a seamless transition for end users

## Requirements Summary
Total Requirements: ${requirements.length}

${requirements.map(req => 
  `### ${req.category.toUpperCase()}: ${req.text}
   - Priority: ${req.priority}
   - Source: ${req.source || "Not specified"}
   ${req.acceptanceCriteria && req.acceptanceCriteria.length > 0 ? 
     `- Acceptance Criteria:\n${req.acceptanceCriteria.map((ac: any) => 
       `     - ${ac.description} (${ac.status})`).join('\n')}` : ''}
  `).join('\n')}

## Implementation Tasks
Total Tasks: ${tasks.length}

${tasks.map(task => 
  `### ${task.title}
   - System: ${task.system}
   - Status: ${task.status}
   - Priority: ${task.priority}
   - Estimated Hours: ${task.estimatedHours || "Not estimated"}
   - Complexity: ${task.complexity || "Not specified"}
   ${task.assignee ? `- Assigned To: ${task.assignee}` : ''}
   
   ${task.description}
  `).join('\n')}

## Timeline & Cost Estimate
- Estimated Total Hours: ${hours} hours
- Estimated Total Cost: $${cost.toLocaleString()}
- Estimated Start Date: [Start Date]
- Estimated Completion Date: [Completion Date]

## Deliverables
1. Full implementation of all requirements
2. Migration of all data from ${project.sourceSystem || "[Source System]"} to ${project.targetSystem || "[Target System]"}
3. Documentation of new system
4. User training materials

## Assumptions
- Client will provide timely access to required systems and information
- Client will provide subject matter expertise as needed
- Any changes to the scope will be addressed through a formal change management process

## Approval
This Statement of Work is agreed upon by:

Client Representative: ______________________  Date: ________

Implementation Team Lead: ___________________  Date: ________
`;
  };

  const generateImplementationPlan = (project: Project, requirements: Requirement[], tasks: ImplementationTask[]) => {
    return `# Implementation Plan: ${project.name}

## Project Information
**Project:** ${project.name}
**Type:** ${project.type}
**Date:** ${formatDateTime(new Date())}

## Overview
This implementation plan outlines the steps required to successfully migrate from ${project.sourceSystem || "[Source System]"} to ${project.targetSystem || "[Target System]"}.

## Implementation Approach
The implementation will follow a phased approach to ensure minimal disruption to business operations.

## Implementation Tasks
${tasks.map((task, index) => 
  `### Phase ${Math.floor(index / 5) + 1} - Task ${index % 5 + 1}: ${task.title}
   - System: ${task.system}
   - Priority: ${task.priority}
   - Status: ${task.status}
   - Estimated Hours: ${task.estimatedHours || "Not estimated"}
   - Complexity: ${task.complexity || "Not specified"}
   ${task.assignee ? `- Assigned To: ${task.assignee}` : ''}
   
   ${task.description}
   
   **Implementation Steps:**
   1. Plan and design the implementation
   2. Develop the solution
   3. Test functionality
   4. Deploy to production
   5. Verify successful implementation
  `).join('\n\n')}

## Testing Strategy
- Unit Testing: Verify each component functions correctly
- Integration Testing: Ensure components work together
- User Acceptance Testing: Confirm the solution meets user needs

## Deployment Plan
1. Prepare deployment package
2. Schedule deployment window
3. Deploy to production environment
4. Verify deployment success
5. Monitor for issues

## Rollback Plan
In case of deployment failure:
1. Identify the issue
2. Revert to previous version
3. Notify stakeholders
4. Address the issue
5. Reschedule deployment

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Data loss during migration | Low | High | Complete backup before migration |
| User resistance | Medium | Medium | Provide thorough training |
| System downtime | Medium | High | Schedule work during off-hours |

## Approval
Implementation Team Lead: ___________________  Date: ________

Project Sponsor: ___________________________  Date: ________
`;
  };

  const generateRequirementSpec = (project: Project, requirements: Requirement[]) => {
    return `# Requirements Specification: ${project.name}

## Project Information
**Project:** ${project.name}
**Type:** ${project.type}
**Date:** ${formatDateTime(new Date())}

## Overview
This document provides a detailed specification of all requirements for the migration from ${project.sourceSystem || "[Source System]"} to ${project.targetSystem || "[Target System]"}.

## System Context
${project.description || "No description provided."}

## Functional Requirements
${requirements.filter(req => req.category.toLowerCase() === 'functional').map(req => 
  `### FR-${req.id}: ${req.text}
   - Priority: ${req.priority}
   - Source: ${req.source || "Not specified"}
   ${req.acceptanceCriteria && req.acceptanceCriteria.length > 0 ? 
     `- Acceptance Criteria:\n${req.acceptanceCriteria.map((ac: any) => 
       `     - ${ac.description} (${ac.status})`).join('\n')}` : ''}
  `).join('\n\n')}

## Non-Functional Requirements
${requirements.filter(req => req.category.toLowerCase() !== 'functional').map(req => 
  `### NFR-${req.id}: ${req.text}
   - Category: ${req.category}
   - Priority: ${req.priority}
   - Source: ${req.source || "Not specified"}
   ${req.acceptanceCriteria && req.acceptanceCriteria.length > 0 ? 
     `- Acceptance Criteria:\n${req.acceptanceCriteria.map((ac: any) => 
       `     - ${ac.description} (${ac.status})`).join('\n')}` : ''}
  `).join('\n\n')}

## Constraints
- Technical Constraints: [List any technical constraints]
- Business Constraints: [List any business constraints]
- Regulatory Constraints: [List any regulatory constraints]

## Assumptions
- [List any assumptions made in the requirements]

## Dependencies
- [List any external dependencies]

## Approval
Business Analyst: ______________________  Date: ________

Project Manager: ______________________  Date: ________

Client Representative: ______________________  Date: ________
`;
  };

  const downloadDocument = () => {
    if (!generatedContent) return;
    
    const blob = new Blob([generatedContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedDocType}-${project?.name.toLowerCase().replace(/\s+/g, "-")}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
            <TabsList className="grid grid-cols-3 mb-6">
              <TabsTrigger value="sow">Statement of Work</TabsTrigger>
              <TabsTrigger value="implementation-plan">Implementation Plan</TabsTrigger>
              <TabsTrigger value="requirement-spec">Requirements Specification</TabsTrigger>
            </TabsList>
            
            {documentTemplates.map((template) => (
              <TabsContent key={template.id} value={template.id}>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {template.icon}
                        <div>
                          <CardTitle>{template.title}</CardTitle>
                          <CardDescription>{template.description}</CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg flex flex-col items-center">
                          <ListChecks className="h-8 w-8 text-primary mb-2" />
                          <div className="text-sm text-gray-500 dark:text-gray-400">Requirements</div>
                          <div className="text-2xl font-semibold">{requirements?.length || 0}</div>
                        </div>
                        
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg flex flex-col items-center">
                          <Clock className="h-8 w-8 text-primary mb-2" />
                          <div className="text-sm text-gray-500 dark:text-gray-400">Est. Hours</div>
                          <div className="text-2xl font-semibold">{totals.hours}</div>
                        </div>
                        
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg flex flex-col items-center">
                          <DollarSign className="h-8 w-8 text-primary mb-2" />
                          <div className="text-sm text-gray-500 dark:text-gray-400">Est. Cost</div>
                          <div className="text-2xl font-semibold">${totals.cost.toLocaleString()}</div>
                        </div>
                      </div>
                      
                      {generatedContent ? (
                        <div className="mt-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-semibold text-gray-900 dark:text-white">Generated Document Preview</div>
                            <Button variant="outline" size="sm" onClick={downloadDocument}>
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg overflow-auto max-h-96 text-sm">
                            <pre className="whitespace-pre-wrap font-mono">{generatedContent}</pre>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-sm text-center">
                          <p className="text-gray-500 dark:text-gray-400">
                            Click the Generate button to create a {template.title.toLowerCase()} document.
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <div className="w-full flex justify-between items-center">
                      <div>
                        {template.requiresTasks && allTasks.length === 0 && (
                          <Badge variant="outline" className="text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-900/20 dark:border-yellow-800">
                            Requires implementation tasks
                          </Badge>
                        )}
                      </div>
                      <Button 
                        onClick={generateDocument} 
                        disabled={isGenerating || (template.requiresTasks && allTasks.length === 0)}
                      >
                        {isGenerating ? 'Generating...' : 'Generate'}
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      )}
    </div>
  );
}