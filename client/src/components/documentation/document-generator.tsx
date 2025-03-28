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
import { FileText, FileCheck, Calendar, Clock, DollarSign, ListChecks, Download, BookOpen, HelpCircle, Lightbulb, FileOutput } from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { jsPDF } from "jspdf";
import { marked } from "marked";

interface DocumentGeneratorProps {
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

type DocumentFormat = "markdown" | "pdf";

export function DocumentGenerator({ projectId }: DocumentGeneratorProps) {
  const [selectedDocType, setSelectedDocType] = useState<DocumentType>("sow");
  const [selectedFormat, setSelectedFormat] = useState<DocumentFormat>("markdown");
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
    },
    {
      id: "feature-guide",
      title: "Feature Guide",
      description: "Detailed explanations of specific features and their usage",
      icon: <Lightbulb className="h-8 w-8 text-primary" />,
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
          case "user-guide":
            content = generateUserGuide(project, requirements);
            break;
          case "training-manual":
            content = generateTrainingManual(project, requirements, allTasks);
            break;
          case "feature-guide":
            content = generateFeatureGuide(project, requirements);
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

  const generateUserGuide = (project: Project, requirements: Requirement[]) => {
    const functionalReqs = requirements.filter(req => req.category.toLowerCase() === 'functional');
    
    return `# User Guide: ${project.name}

## Introduction
This user guide provides detailed information on how to use the ${project.targetSystem || "[Target System]"} for daily operations.

## System Overview
${project.description || "This system provides a comprehensive solution for managing business operations."}

## Getting Started
### System Requirements
- Web browser: Chrome, Firefox, Safari, or Edge (latest versions recommended)
- Internet connection: Broadband recommended
- Screen resolution: Minimum 1280x800

### Logging In
1. Navigate to the system URL in your web browser
2. Enter your username and password
3. Click "Log In"

## Main Features
${functionalReqs.map((req, index) => 
  `### ${index + 1}. ${req.text.split('.')[0] || req.text}
${req.text}

**How to use this feature:**
1. Navigate to the appropriate section in the menu
2. Follow the on-screen instructions
3. Complete all required fields
${req.acceptanceCriteria && req.acceptanceCriteria.length > 0 ? 
  `\n**Success criteria:**\n${req.acceptanceCriteria.map((ac: any) => 
    `- ${ac.description}`).join('\n')}` : ''}
`).join('\n\n')}

## Troubleshooting
### Common Issues and Solutions
- **Issue**: Cannot log in
  - **Solution**: Verify your username and password, then contact your system administrator
- **Issue**: Data not saving
  - **Solution**: Check your internet connection and refresh the page
- **Issue**: Report generation fails
  - **Solution**: Try again after a few minutes or contact support

## Support
For additional assistance, please contact your system administrator or the support team at [support@email.com].

## Glossary
- **Dashboard**: The main overview screen showing key metrics
- **Report**: A generated document containing data analysis
- **Profile**: Your user account settings and preferences

## Version Information
System: ${project.targetSystem || "[Target System]"}
Version: 1.0
Date: ${formatDateTime(new Date())}
`;
  };

  const generateTrainingManual = (project: Project, requirements: Requirement[], tasks: ImplementationTask[]) => {
    return `# Training Manual: ${project.name}

## Introduction
This training manual is designed to help users transition from ${project.sourceSystem || "[Source System]"} to ${project.targetSystem || "[Target System]"}.

## Training Objectives
By the end of this training, users will be able to:
- Navigate the new system interface confidently
- Perform all daily operations in the new system
- Understand key differences between old and new systems
- Troubleshoot common issues

## System Comparison
| Feature | ${project.sourceSystem || "Source System"} | ${project.targetSystem || "Target System"} | Key Differences |
|---------|---------------|-----------------|----------------|
${tasks.slice(0, 5).map(task => 
  `| ${task.title} | Legacy approach | New approach | ${task.description.split('.')[0] || "Enhanced functionality"} |`
).join('\n')}

## Training Modules
${requirements.filter(req => req.category.toLowerCase() === 'functional').map((req, index) => 
  `### Module ${index + 1}: ${req.text.split('.')[0] || req.text}
**Duration**: 30 minutes
**Objective**: Learn how to ${req.text.toLowerCase().startsWith('ability to') ? req.text.substring(11) : req.text.split('.')[0].toLowerCase()}

**Topics Covered**:
1. Overview of the feature
2. Step-by-step hands-on practice
3. Common scenarios and use cases
4. Troubleshooting

**Exercises**:
1. Complete a basic workflow
2. Handle exception scenarios
3. Generate reports/outputs
`).join('\n\n')}

## Transition Timeline
1. **Week 1**: Introduction and basic training
2. **Week 2**: Advanced features and workflows
3. **Week 3**: Practice sessions with real data
4. **Week 4**: Go-live and post-implementation support

## Quick Reference Guides
### Key Shortcuts
- **Ctrl+S / Cmd+S**: Save current record
- **Ctrl+N / Cmd+N**: Create new record
- **Ctrl+F / Cmd+F**: Search within page
- **Esc**: Cancel current operation

### Daily Workflow Checklist
1. Morning: Check dashboard for notifications
2. Process new items in the work queue
3. Generate daily reports
4. Perform data validation checks

## Support Resources
- Online help center: [help.example.com]
- IT Support Desk: [support@example.com] or x1234
- Training Materials: Available on the company intranet

Prepared by: [Training Team]
Date: ${formatDateTime(new Date())}
`;
  };

  const generateFeatureGuide = (project: Project, requirements: Requirement[]) => {
    const functionalReqs = requirements.filter(req => req.category.toLowerCase() === 'functional');
    
    return `# Feature Guide: ${project.name}

## System Overview
${project.targetSystem || "[Target System]"} provides a robust platform for ${project.description || "managing business operations"}.

## Key Features
${functionalReqs.map((req, index) => 
  `### Feature ${index + 1}: ${req.text.split('.')[0] || req.text}
**Description**: ${req.text}

**Business Value**:
- Increases efficiency in daily operations
- Reduces manual effort and potential for errors
- Provides better visibility into business processes

**Usage Scenarios**:
1. **Basic Usage**: Regular day-to-day operations
2. **Advanced Usage**: Complex business scenarios
3. **Reporting**: Data analysis and insights

${req.acceptanceCriteria && req.acceptanceCriteria.length > 0 ? 
  `**Capabilities**:\n${req.acceptanceCriteria.map((ac: any) => 
    `- ${ac.description}`).join('\n')}` : ''}

**Related Features**: Other system capabilities that work with this feature
`).join('\n\n')}

## Feature Comparison
| Feature | Basic | Premium | Enterprise |
|---------|-------|---------|------------|
${functionalReqs.slice(0, 5).map(req => 
  `| ${req.text.split('.')[0] || req.text} | ✓ | ✓ | ✓ |`
).join('\n')}
${functionalReqs.slice(5, 10).map(req => 
  `| ${req.text.split('.')[0] || req.text} | - | ✓ | ✓ |`
).join('\n')}
${functionalReqs.slice(10).map(req => 
  `| ${req.text.split('.')[0] || req.text} | - | - | ✓ |`
).join('\n')}

## Feature Roadmap
### Coming Soon
- Enhanced reporting capabilities
- Mobile application support
- Third-party integrations

### Under Consideration
- AI-powered recommendations
- Advanced analytics dashboard
- Custom workflow builder

## Technical Requirements
- **Browser Compatibility**: Chrome, Firefox, Safari, Edge
- **Internet Connection**: Broadband recommended
- **Screen Resolution**: Minimum 1280x800

Prepared by: Product Team
Last Updated: ${formatDateTime(new Date())}
`;
  };

  const downloadDocument = () => {
    if (!generatedContent || !project) return;
    
    if (selectedFormat === "markdown") {
      // Download as Markdown
      const blob = new Blob([generatedContent], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedDocType}-${project.name.toLowerCase().replace(/\s+/g, "-")}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      // Download as PDF
      try {
        const doc = new jsPDF();
        
        // Convert markdown to HTML
        const html = marked.parse(generatedContent) as string;
        
        // Strip HTML tags for simple text-based PDF
        const plainText = html.replace(/<[^>]*>?/gm, '');
        
        // Split the text into lines
        const lines = plainText.split('\n');
        
        // Add lines to PDF
        let y = 10;
        doc.setFontSize(12);
        
        lines.forEach((line: string) => {
          // Check if line is a heading
          if (line.startsWith('# ')) {
            doc.setFontSize(18);
            doc.setFont("helvetica", 'bold');
            y += 10;
          } else if (line.startsWith('## ')) {
            doc.setFontSize(16);
            doc.setFont("helvetica", 'bold');
            y += 8;
          } else if (line.startsWith('### ')) {
            doc.setFontSize(14);
            doc.setFont("helvetica", 'bold');
            y += 6;
          } else {
            doc.setFontSize(12);
            doc.setFont("helvetica", 'normal');
          }
          
          // Add the line to the PDF, but skip empty lines
          if (line.trim()) {
            // Remove heading markers
            const textLine = line.replace(/^#+\s/, '');
            
            doc.text(textLine, 10, y);
            y += 7;
            
            // Add a new page if we're near the bottom
            if (y > 280) {
              doc.addPage();
              y = 10;
            }
          }
        });
        
        doc.save(`${selectedDocType}-${project.name.toLowerCase().replace(/\s+/g, "-")}.pdf`);
        
        toast({
          title: "Success",
          description: "PDF document has been generated and downloaded.",
        });
      } catch (error) {
        console.error("PDF generation error:", error);
        toast({
          title: "Error",
          description: "Failed to generate PDF. Downloading as Markdown instead.",
          variant: "destructive"
        });
        
        // Fallback to markdown
        const blob = new Blob([generatedContent], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${selectedDocType}-${project.name.toLowerCase().replace(/\s+/g, "-")}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    }
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
            <TabsList className="grid grid-cols-3 md:grid-cols-6 mb-6">
              <TabsTrigger value="sow">Statement of Work</TabsTrigger>
              <TabsTrigger value="implementation-plan">Implementation Plan</TabsTrigger>
              <TabsTrigger value="requirement-spec">Requirements Spec</TabsTrigger>
              <TabsTrigger value="user-guide">User Guide</TabsTrigger>
              <TabsTrigger value="training-manual">Training Manual</TabsTrigger>
              <TabsTrigger value="feature-guide">Feature Guide</TabsTrigger>
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
                            <div className="flex items-center gap-2">
                              <Select value={selectedFormat} onValueChange={(value) => setSelectedFormat(value as DocumentFormat)}>
                                <SelectTrigger className="w-32">
                                  <SelectValue placeholder="Format" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="markdown">Markdown</SelectItem>
                                  <SelectItem value="pdf">PDF</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button variant="outline" size="sm" onClick={downloadDocument}>
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </Button>
                            </div>
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