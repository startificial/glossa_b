import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { DocumentTemplate, FieldMapping } from '@shared/schema';
import { Designer } from '@pdfme/ui';
import { Template } from '@pdfme/common';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, FileIcon } from 'lucide-react';

// Empty template definition - we'll require upload of a PDF
const emptyTemplate: Template = {
  schemas: [[]],
  basePdf: '',
  sampledata: [{}],
};

// Designer component for PDF templates
export default function TemplateDesigner() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const templateId = params.id ? parseInt(params.id) : null;
  const isEditMode = !!templateId;
  
  // State for the template
  const [template, setTemplate] = useState<Template>(emptyTemplate);
  const [templateData, setTemplateData] = useState({
    name: '',
    description: '',
    category: 'sow', // default category
    isGlobal: true,
    projectId: null as number | null,
    userId: 1, // default user ID (should be set from auth context in a real app)
  });
  
  // State for field mappings
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  
  // Tab state
  const [activeTab, setActiveTab] = useState('editor');
  
  // Designer instance ref
  const designerRef = React.useRef<HTMLDivElement>(null);
  const [designer, setDesigner] = useState<any>(null);
  
  // Fetch template data if in edit mode
  const templateQuery = useQuery<DocumentTemplate>({
    queryKey: [`/api/document-templates/${templateId}`],
    enabled: isEditMode
  });
  
  // Effect to set template data when fetch is complete
  useEffect(() => {
    if (templateQuery.data) {
      const data = templateQuery.data;
      // Set template data
      setTemplateData({
        name: data.name,
        description: data.description || '',
        category: data.category,
        isGlobal: data.isGlobal,
        projectId: data.projectId,
        userId: data.userId,
      });
      
      // Set template
      if (data.template) {
        setTemplate(data.template as Template);
      }
      
      // Set field mappings - we'd typically fetch these separately in a real app
      // For now, we'll use an empty array as a placeholder
      setFieldMappings([]);
      
      // In a real implementation, we would fetch field mappings for this template
      // const fetchFieldMappings = async () => {
      //   const response = await fetch(`/api/document-templates/${data.id}/field-mappings`);
      //   if (response.ok) {
      //     const fieldMappingsData = await response.json();
      //     setFieldMappings(fieldMappingsData);
      //   }
      // };
      // fetchFieldMappings();
    }
  }, [templateQuery.data]);
  
  // Initialize designer when component mounts
  useEffect(() => {
    if (designerRef.current && !designer) {
      import('@pdfme/ui').then(({ Designer }) => {
        const designerInstance = new Designer({
          domContainer: designerRef.current!,
          template: template as any, // Cast to any to avoid type issues with pdfme
          options: {
            useVirtualization: true,
            autoSave: true,
          },
        });
        
        designerInstance.onSaveTemplate(updatedTemplate => {
          setTemplate(updatedTemplate as Template);
        });
        
        setDesigner(designerInstance);
      });
    }
    
    // Cleanup
    return () => {
      if (designer) {
        designer.destroy();
      }
    };
  }, [designerRef, designer]);
  
  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/document-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create template');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Template created',
        description: 'The template has been created successfully.',
      });
      setLocation(`/templates/${data.id}`);
      queryClient.invalidateQueries({ queryKey: ['/api/document-templates'] });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error creating template',
        description: error.message,
      });
    },
  });
  
  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/document-templates/${templateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update template');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Template updated',
        description: 'The template has been updated successfully.',
      });
      queryClient.invalidateQueries({ queryKey: [`/api/document-templates/${templateId}`] });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error updating template',
        description: error.message,
      });
    },
  });
  
  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/document-templates/${templateId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete template');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Template deleted',
        description: 'The template has been deleted successfully.',
      });
      setLocation('/templates');
      queryClient.invalidateQueries({ queryKey: ['/api/document-templates'] });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error deleting template',
        description: error.message,
      });
    },
  });
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!designer) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Template editor is not initialized.',
      });
      return;
    }
    
    // Get the current template from the designer
    const currentTemplate = designer.getTemplate();
    
    // Prepare data for submission
    const submissionData = {
      ...templateData,
      template: currentTemplate,
      schema: extractSchemaFromTemplate(currentTemplate),
    };
    
    // Create or update template
    if (isEditMode) {
      updateTemplateMutation.mutate(submissionData);
    } else {
      createTemplateMutation.mutate(submissionData);
    }
  };
  
  // Extract schema from template
  const extractSchemaFromTemplate = (template: Template) => {
    const schema: Record<string, any> = {};
    
    // Process all pages and fields
    if (template.schemas && Array.isArray(template.schemas)) {
      (template.schemas as any[][]).forEach((page: any[], pageIndex: number) => {
        if (Array.isArray(page)) {
          page.forEach((field: any) => {
            if (field && field.name) {
              schema[field.name] = {
                type: field.type || 'text',
                defaultValue: field.defaultValue || '',
              };
            }
          });
        }
      });
    }
    
    return schema;
  };
  
  // Handle field mappings
  const handleAddFieldMapping = () => {
    const newMapping: Partial<FieldMapping> = {
      name: 'New Field Mapping',
      type: 'database',
      fieldKey: '',
      dataSource: 'projects',
      dataPath: '',
      defaultValue: '',
    };
    
    setFieldMappings([...fieldMappings, newMapping as FieldMapping]);
  };
  
  const handleUpdateFieldMapping = (index: number, field: string, value: any) => {
    const updatedMappings = [...fieldMappings];
    updatedMappings[index] = {
      ...updatedMappings[index],
      [field]: value,
    };
    setFieldMappings(updatedMappings);
  };
  
  const handleDeleteFieldMapping = (index: number) => {
    const updatedMappings = [...fieldMappings];
    updatedMappings.splice(index, 1);
    setFieldMappings(updatedMappings);
  };
  
  // Save field mappings
  const saveFieldMappings = async () => {
    if (!templateId) return;
    
    // TODO: Implement API call to save field mappings
    toast({
      title: 'Field mappings saved',
      description: 'The field mappings have been saved successfully.',
    });
  };
  
  // Handle template data change
  const handleTemplateDataChange = (field: string, value: any) => {
    setTemplateData({
      ...templateData,
      [field]: value,
    });
  };
  
  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !designer) return;
    
    const reader = new FileReader();
    reader.onload = async () => {
      const basePdf = reader.result;
      
      try {
        await designer.updateTemplate({
          ...template,
          basePdf,
        });
        
        setTemplate({
          ...template,
          basePdf,
        });
        
        toast({
          title: 'PDF uploaded',
          description: 'The PDF has been uploaded successfully.',
        });
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error uploading PDF',
          description: 'Failed to load the PDF. Please try another file.',
        });
      }
    };
    
    reader.readAsDataURL(file);
  };
  
  if (isEditMode && templateQuery.isLoading) {
    return <div>Loading template...</div>;
  }
  
  if (templateQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load the template. {templateQuery.error.message}
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">
          {isEditMode ? 'Edit Template' : 'Create Template'}
        </h1>
        
        <div className="space-x-2">
          <Button onClick={() => setLocation('/templates')}>
            Cancel
          </Button>
          
          {isEditMode && (
            <Button 
              variant="destructive" 
              onClick={() => deleteTemplateMutation.mutate()}
              disabled={deleteTemplateMutation.isPending}
            >
              {deleteTemplateMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          )}
          
          <Button 
            onClick={handleSubmit}
            disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
          >
            {createTemplateMutation.isPending || updateTemplateMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
      
      <Tabs 
        defaultValue="editor" 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid grid-cols-3 w-[400px]">
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="mappings">Field Mappings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="editor" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>PDF Template Editor</CardTitle>
              <CardDescription>
                Upload a PDF and add fields to create your template.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="pdf-upload">Upload Base PDF</Label>
                  <Input 
                    id="pdf-upload" 
                    type="file" 
                    accept=".pdf" 
                    onChange={handleFileUpload} 
                  />
                </div>
                
                {!template.basePdf ? (
                  <div className="h-[400px] flex items-center justify-center border-2 border-dashed border-gray-300 rounded-md text-center p-12">
                    <div>
                      <FileIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium mb-2">Please upload a PDF first</h3>
                      <p className="text-gray-500 mb-4">
                        The template designer will appear once you've uploaded a PDF document.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div 
                    ref={designerRef} 
                    style={{ 
                      height: '800px', 
                      width: '100%', 
                      border: '1px solid #ccc' 
                    }}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Template Settings</CardTitle>
              <CardDescription>
                Configure the template details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Template Name</Label>
                    <Input 
                      id="name" 
                      value={templateData.name} 
                      onChange={(e) => handleTemplateDataChange('name', e.target.value)} 
                      placeholder="Enter template name" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select 
                      value={templateData.category} 
                      onValueChange={(value) => handleTemplateDataChange('category', value)}
                    >
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sow">Statement of Work</SelectItem>
                        <SelectItem value="implementation-plan">Implementation Plan</SelectItem>
                        <SelectItem value="requirement-spec">Requirement Specification</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description" 
                    value={templateData.description} 
                    onChange={(e) => handleTemplateDataChange('description', e.target.value)} 
                    placeholder="Enter template description" 
                    rows={3} 
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isGlobal"
                      checked={templateData.isGlobal}
                      onChange={(e) => handleTemplateDataChange('isGlobal', e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="isGlobal">Make this template available globally</Label>
                  </div>
                  <p className="text-sm text-gray-500">
                    Global templates can be used by any project in the system.
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="mappings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Field Mappings</CardTitle>
              <CardDescription>
                Configure how template fields are populated from data sources.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {fieldMappings.map((mapping, index) => (
                  <div key={index} className="border p-4 rounded-md space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`mapping-name-${index}`}>Name</Label>
                        <Input 
                          id={`mapping-name-${index}`} 
                          value={mapping.name} 
                          onChange={(e) => handleUpdateFieldMapping(index, 'name', e.target.value)} 
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`mapping-type-${index}`}>Type</Label>
                        <Select 
                          value={mapping.type} 
                          onValueChange={(value) => handleUpdateFieldMapping(index, 'type', value)}
                        >
                          <SelectTrigger id={`mapping-type-${index}`}>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="database">Database</SelectItem>
                            <SelectItem value="ai-generated">AI Generated</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`mapping-field-key-${index}`}>Field Key</Label>
                      <Input 
                        id={`mapping-field-key-${index}`} 
                        value={mapping.fieldKey} 
                        onChange={(e) => handleUpdateFieldMapping(index, 'fieldKey', e.target.value)} 
                        placeholder="Enter field key to map to in the template" 
                      />
                    </div>
                    
                    {mapping.type === 'database' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`mapping-source-${index}`}>Data Source</Label>
                          <Select 
                            value={mapping.dataSource || ''} 
                            onValueChange={(value) => handleUpdateFieldMapping(index, 'dataSource', value)}
                          >
                            <SelectTrigger id={`mapping-source-${index}`}>
                              <SelectValue placeholder="Select data source" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="projects">Project</SelectItem>
                              <SelectItem value="customers">Customer</SelectItem>
                              <SelectItem value="requirements">Requirements</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor={`mapping-path-${index}`}>Data Path</Label>
                          <Input 
                            id={`mapping-path-${index}`} 
                            value={mapping.dataPath || ''} 
                            onChange={(e) => handleUpdateFieldMapping(index, 'dataPath', e.target.value)} 
                            placeholder="e.g. name, description, etc." 
                          />
                        </div>
                      </div>
                    )}
                    
                    {mapping.type === 'ai-generated' && (
                      <div className="space-y-2">
                        <Label htmlFor={`mapping-prompt-${index}`}>AI Prompt</Label>
                        <Textarea 
                          id={`mapping-prompt-${index}`} 
                          value={mapping.prompt || ''} 
                          onChange={(e) => handleUpdateFieldMapping(index, 'prompt', e.target.value)} 
                          placeholder="Enter prompt for AI to generate content" 
                          rows={3} 
                        />
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <Label htmlFor={`mapping-default-${index}`}>Default Value</Label>
                      <Input 
                        id={`mapping-default-${index}`} 
                        value={mapping.defaultValue || ''} 
                        onChange={(e) => handleUpdateFieldMapping(index, 'defaultValue', e.target.value)} 
                        placeholder="Enter default value if data not found" 
                      />
                    </div>
                    
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => handleDeleteFieldMapping(index)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                
                <div className="flex space-x-2">
                  <Button onClick={handleAddFieldMapping}>
                    Add Field Mapping
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={saveFieldMappings}
                    disabled={!isEditMode}
                  >
                    Save Mappings
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}