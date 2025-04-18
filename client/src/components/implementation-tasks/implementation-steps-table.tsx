import React, { useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Link as ExternalLink, 
  ExternalLink as ExternalLinkIcon, 
  Plus, 
  Minus, 
  ArrowUp, 
  ArrowDown,
  X,
  GripVertical,
  Trash2 
} from 'lucide-react';
import { ImplementationStep } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface ImplementationStepsTableProps {
  steps: ImplementationStep[];
  isEditing?: boolean;
  onChange?: (steps: ImplementationStep[]) => void;
}

export function ImplementationStepsTable({ 
  steps, 
  isEditing = false, 
  onChange
}: ImplementationStepsTableProps) {
  
  // Initialize state for editing
  const [editableSteps, setEditableSteps] = useState<ImplementationStep[]>(steps || []);
  
  // Handle adding a new step
  const handleAddStep = () => {
    const newStepNumber = editableSteps.length > 0 
      ? Math.max(...editableSteps.map(s => s.stepNumber)) + 1 
      : 1;
    
    const newStep: ImplementationStep = {
      stepNumber: newStepNumber,
      stepDescription: '',
      relevantDocumentationLinks: []
    };
    
    const updatedSteps = [...editableSteps, newStep];
    setEditableSteps(updatedSteps);
    
    if (onChange) {
      onChange(updatedSteps);
    }
  };
  
  // Handle removing a step
  const handleRemoveStep = (stepNumber: number) => {
    const updatedSteps = editableSteps.filter(s => s.stepNumber !== stepNumber);
    
    // Renumber steps to ensure sequential order
    const reorderedSteps = updatedSteps.map((step, index) => ({
      ...step,
      stepNumber: index + 1
    }));
    
    setEditableSteps(reorderedSteps);
    
    if (onChange) {
      onChange(reorderedSteps);
    }
  };
  
  // Handle moving a step up
  const handleMoveStepUp = (stepNumber: number) => {
    const stepIndex = editableSteps.findIndex(s => s.stepNumber === stepNumber);
    if (stepIndex <= 0) return; // Can't move up if it's the first step or not found
    
    // Swap with previous step
    const updatedSteps = [...editableSteps];
    const temp = { ...updatedSteps[stepIndex] };
    updatedSteps[stepIndex] = { ...updatedSteps[stepIndex - 1], stepNumber: stepNumber };
    updatedSteps[stepIndex - 1] = { ...temp, stepNumber: stepNumber - 1 };
    
    setEditableSteps(updatedSteps);
    
    if (onChange) {
      onChange(updatedSteps);
    }
  };
  
  // Handle moving a step down
  const handleMoveStepDown = (stepNumber: number) => {
    const stepIndex = editableSteps.findIndex(s => s.stepNumber === stepNumber);
    if (stepIndex === -1 || stepIndex >= editableSteps.length - 1) return; // Can't move down if it's the last step or not found
    
    // Swap with next step
    const updatedSteps = [...editableSteps];
    const temp = { ...updatedSteps[stepIndex] };
    updatedSteps[stepIndex] = { ...updatedSteps[stepIndex + 1], stepNumber: stepNumber };
    updatedSteps[stepIndex + 1] = { ...temp, stepNumber: stepNumber + 1 };
    
    setEditableSteps(updatedSteps);
    
    if (onChange) {
      onChange(updatedSteps);
    }
  };
  
  // Handle updating a step's description
  const handleUpdateStepDescription = (stepNumber: number, description: string) => {
    const updatedSteps = editableSteps.map(step => 
      step.stepNumber === stepNumber 
        ? { ...step, stepDescription: description } 
        : step
    );
    
    setEditableSteps(updatedSteps);
    
    if (onChange) {
      onChange(updatedSteps);
    }
  };
  
  // Handle adding a documentation link to a step
  const handleAddStepLink = (stepNumber: number) => {
    const updatedSteps = editableSteps.map(step => {
      if (step.stepNumber === stepNumber) {
        const links = [...(step.relevantDocumentationLinks || []), ''];
        return { ...step, relevantDocumentationLinks: links };
      }
      return step;
    });
    
    setEditableSteps(updatedSteps);
    
    if (onChange) {
      onChange(updatedSteps);
    }
  };
  
  // Handle updating a documentation link
  const handleUpdateStepLink = (stepNumber: number, linkIndex: number, linkUrl: string) => {
    const updatedSteps = editableSteps.map(step => {
      if (step.stepNumber === stepNumber && step.relevantDocumentationLinks) {
        const updatedLinks = [...step.relevantDocumentationLinks];
        updatedLinks[linkIndex] = linkUrl;
        return { ...step, relevantDocumentationLinks: updatedLinks };
      }
      return step;
    });
    
    setEditableSteps(updatedSteps);
    
    if (onChange) {
      onChange(updatedSteps);
    }
  };
  
  // Handle removing a documentation link
  const handleRemoveStepLink = (stepNumber: number, linkIndex: number) => {
    const updatedSteps = editableSteps.map(step => {
      if (step.stepNumber === stepNumber && step.relevantDocumentationLinks) {
        const updatedLinks = [...step.relevantDocumentationLinks];
        updatedLinks.splice(linkIndex, 1);
        return { ...step, relevantDocumentationLinks: updatedLinks };
      }
      return step;
    });
    
    setEditableSteps(updatedSteps);
    
    if (onChange) {
      onChange(updatedSteps);
    }
  };
  
  // Update local state when steps prop changes
  React.useEffect(() => {
    setEditableSteps(steps || []);
  }, [steps]);
  
  if ((!steps || steps.length === 0) && !isEditing) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Implementation Steps</CardTitle>
          {isEditing && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleAddStep}
              className="h-8 gap-1"
            >
              <Plus className="h-4 w-4" />
              Add Step
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            No implementation steps available for this task.
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Implementation Steps</CardTitle>
        {isEditing && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleAddStep}
            className="h-8 gap-1"
          >
            <Plus className="h-4 w-4" />
            Add Step
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-6">
            {editableSteps.map((step, index) => (
              <div key={step.stepNumber} className="border rounded-md p-4 relative">
                <div className="absolute right-2 top-2 flex items-center space-x-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6" 
                    onClick={() => handleMoveStepUp(step.stepNumber)}
                    disabled={index === 0}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={() => handleMoveStepDown(step.stepNumber)}
                    disabled={index === editableSteps.length - 1}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-red-500 hover:text-red-700" 
                    onClick={() => handleRemoveStep(step.stepNumber)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="space-y-4 mt-2">
                  <div className="flex items-center">
                    <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center font-medium mr-2">
                      {step.stepNumber}
                    </div>
                    <h4 className="font-medium">Step {step.stepNumber}</h4>
                  </div>
                  
                  <div>
                    <Label htmlFor={`step-description-${step.stepNumber}`}>Description</Label>
                    <Textarea 
                      id={`step-description-${step.stepNumber}`}
                      value={step.stepDescription}
                      onChange={(e) => handleUpdateStepDescription(step.stepNumber, e.target.value)}
                      className="mt-1"
                      rows={2}
                    />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Documentation Links</Label>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-7 text-xs gap-1"
                        onClick={() => handleAddStepLink(step.stepNumber)}
                      >
                        <Plus className="h-3 w-3" />
                        Add Link
                      </Button>
                    </div>
                    
                    {step.relevantDocumentationLinks && step.relevantDocumentationLinks.length > 0 ? (
                      <div className="space-y-2">
                        {step.relevantDocumentationLinks.map((link, linkIndex) => (
                          <div key={linkIndex} className="flex items-center gap-2">
                            <Input 
                              value={link}
                              onChange={(e) => handleUpdateStepLink(step.stepNumber, linkIndex, e.target.value)}
                              placeholder="Enter URL"
                              className="text-sm"
                            />
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 shrink-0 text-red-500 hover:text-red-700" 
                              onClick={() => handleRemoveStepLink(step.stepNumber, linkIndex)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-2 text-muted-foreground text-sm border rounded-md">
                        No documentation links added
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">#</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[200px]">Documentation Links</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {steps.map((step) => (
                <TableRow key={step.stepNumber}>
                  <TableCell className="font-medium">{step.stepNumber}</TableCell>
                  <TableCell>{step.stepDescription}</TableCell>
                  <TableCell>
                    {step.relevantDocumentationLinks && step.relevantDocumentationLinks.length > 0 ? (
                      <div className="space-y-1">
                        {step.relevantDocumentationLinks.map((link, linkIndex) => (
                          <div key={linkIndex} className="flex items-center">
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 hover:underline text-sm flex items-center"
                            >
                              <ExternalLinkIcon className="h-3 w-3 mr-1 flex-shrink-0" />
                              <span className="truncate max-w-[160px]">
                                {link.replace(/^https?:\/\//, '').split('/')[0]}
                              </span>
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">No links available</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}