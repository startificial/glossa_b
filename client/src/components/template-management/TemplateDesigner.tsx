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
import { AlertCircle, FileIcon, Database, Search, Info } from 'lucide-react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  
  // Database schema state
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [selectedMappingIndex, setSelectedMappingIndex] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Designer instance ref
  const designerRef = React.useRef<HTMLDivElement>(null);
  const [designer, setDesigner] = useState<any>(null);
  
  // Fetch template data if in edit mode
  const templateQuery = useQuery<DocumentTemplate>({
    queryKey: [`/api/document-templates/${templateId}`],
    enabled: isEditMode
  });
  
  // Fetch database schema
  const dbSchemaQuery = useQuery<{tables: Record<string, {columns: Record<string, {type: string}>}>}>({
    queryKey: ['/api/database-schema'],
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
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
    }
  }, [templateQuery.data]);
  
  // Initialize designer when component mounts, when template.basePdf changes, or when activeTab is 'editor'
  useEffect(() => {
    // Only initialize designer when on 'editor' tab
    if (activeTab !== 'editor') {
      return;
    }
    
    // Clean up old designer instance if it exists
    if (designer) {
      console.log("Destroying old designer instance");
      designer.destroy();
      setDesigner(null);
    }
    
    // Only initialize the designer if we have a PDF and the container is available
    if (designerRef.current && template.basePdf) {
      console.log("Initializing PDF designer with basePdf");
      
      import('@pdfme/ui').then(({ Designer }) => {
        try {
          const designerInstance = new Designer({
            domContainer: designerRef.current!,
            template: template as any, // Cast to any to avoid type issues with pdfme
            options: {
              useVirtualization: true,
              autoSave: true,
            },
          });
          
          designerInstance.onSaveTemplate(updatedTemplate => {
            console.log("Template saved from designer");
            setTemplate(updatedTemplate as Template);
          });
          
          setDesigner(designerInstance);
          console.log("Designer initialized successfully");
        } catch (error: any) {
          console.error("Error initializing designer:", error);
          toast({
            variant: 'destructive',
            title: 'Error initializing designer',
            description: 'There was a problem setting up the template designer. Please try again.',
          });
        }
      });
    }
    
    // Cleanup
    return () => {
      if (designer) {
        designer.destroy();
      }
    };
  }, [designerRef, template.basePdf, activeTab]);
  
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
    
    // Make sure we have a PDF
    if (!template.basePdf) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please upload a PDF file first.',
      });
      return;
    }
    
    // Get the current template - either from designer or use the state
    let currentTemplate = template;
    let schemaData = {};
    
    if (designer) {
      try {
        // If designer is initialized, get template from it
        currentTemplate = designer.getTemplate();
        schemaData = extractSchemaFromTemplate(currentTemplate);
      } catch (error: any) {
        console.error("Error getting template from designer:", error);
        // Fall back to state template
        schemaData = {};
      }
    } else {
      console.log("Designer not initialized, using state template");
    }
    
    // Prepare data for submission
    const submissionData = {
      ...templateData,
      template: currentTemplate,
      schema: schemaData,
    };
    
    console.log("Submitting template:", submissionData);
    
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
      // Add selection mode for handling multiple records
      selectionMode: 'single', // 'single', 'all', or 'custom'
      selectionFilter: '',    // Filter criteria for custom selection
      recordId: null,         // For single record selection
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
  
  // Open column selector dialog
  const openColumnSelector = (index: number) => {
    setSelectedMappingIndex(index);
    setShowColumnSelector(true);
  };
  
  // Close column selector dialog
  const closeColumnSelector = () => {
    setSelectedMappingIndex(null);
    setShowColumnSelector(false);
    setSearchTerm('');
  };
  
  // Handle selecting a table for a field mapping
  const handleSelectTable = (table: string) => {
    if (selectedMappingIndex !== null) {
      handleUpdateFieldMapping(selectedMappingIndex, 'dataSource', table);
      // Clear columnField when table changes
      handleUpdateFieldMapping(selectedMappingIndex, 'columnField', '');
    }
  };
  
  // Handle selecting a column for a field mapping
  const handleSelectColumn = (table: string, column: string) => {
    if (selectedMappingIndex !== null) {
      handleUpdateFieldMapping(selectedMappingIndex, 'dataSource', table);
      handleUpdateFieldMapping(selectedMappingIndex, 'columnField', column);
      closeColumnSelector();
    }
  };
  
  // Filter tables and columns based on search term
  const getFilteredTables = () => {
    if (!dbSchemaQuery.data || !dbSchemaQuery.data.tables) return {};
    
    const { tables } = dbSchemaQuery.data;
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    if (!lowerSearchTerm) return tables;
    
    const filteredTables: Record<string, {columns: Record<string, {type: string}>}> = {};
    
    Object.entries(tables).forEach(([tableName, tableData]) => {
      if (tableName.toLowerCase().includes(lowerSearchTerm)) {
        filteredTables[tableName] = tableData;
        return;
      }
      
      // Check if any columns match
      const matchingColumns: Record<string, {type: string}> = {};
      let hasMatch = false;
      
      Object.entries(tableData.columns).forEach(([columnName, columnData]) => {
        if (columnName.toLowerCase().includes(lowerSearchTerm)) {
          matchingColumns[columnName] = columnData;
          hasMatch = true;
        }
      });
      
      if (hasMatch) {
        filteredTables[tableName] = {
          ...tableData,
          columns: matchingColumns
        };
      }
    });
    
    return filteredTables;
  };
  
  // Save field mappings
  const saveFieldMappings = async () => {
    if (!templateId) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Template must be saved before mappings can be added.',
      });
      return;
    }
    
    try {
      // Remove any field mappings without field keys
      const validMappings = fieldMappings.filter(mapping => mapping.fieldKey?.trim());
      
      if (validMappings.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No valid field mappings to save. Ensure all mappings have field keys.',
        });
        return;
      }
      
      // First delete existing mappings
      const deleteResponse = await fetch(`/api/document-templates/${templateId}/field-mappings`, {
        method: 'DELETE',
      });
      
      if (!deleteResponse.ok) {
        throw new Error('Failed to clear existing field mappings');
      }
      
      // Add mappings one by one
      for (const mapping of validMappings) {
        const mappingData = {
          ...mapping,
          templateId,
        };
        
        const response = await fetch(`/api/document-templates/${templateId}/field-mappings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(mappingData),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to save field mapping "${mapping.name}"`);
        }
      }
      
      toast({
        title: 'Field mappings saved',
        description: `${validMappings.length} field mappings have been saved successfully.`,
      });
      
      // Refresh template data
      queryClient.invalidateQueries({ queryKey: [`/api/document-templates/${templateId}`] });
    } catch (error: any) {
      console.error('Error saving field mappings:', error);
      toast({
        variant: 'destructive',
        title: 'Error saving field mappings',
        description: error.message || 'Unknown error occurred',
      });
    }
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
    
    // Debug logs
    console.log("File selected:", file ? file.name : "No file");
    console.log("Designer initialized:", designer ? "Yes" : "No");
    
    if (!file) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select a PDF file.',
      });
      return;
    }
    
    const reader = new FileReader();
    reader.onload = async () => {
      const basePdf = reader.result;
      console.log("PDF loaded as data URL, length:", basePdf ? (basePdf as string).length : 0);
      
      try {
        // Update the template state first - this will trigger the useEffect to initialize the designer
        setTemplate({
          ...template,
          basePdf,
        });
        
        console.log("Template state updated with new PDF");
        
        toast({
          title: 'PDF uploaded',
          description: 'The PDF has been uploaded successfully.',
        });
      } catch (error: any) {
        console.error("Error updating template:", error);
        toast({
          variant: 'destructive',
          title: 'Error uploading PDF',
          description: error.message || 'Failed to load the PDF. Please try another file.',
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
                          <Label htmlFor={`mapping-source-${index}`}>Database Table</Label>
                          <div className="flex items-center gap-2">
                            <Select 
                              value={mapping.dataSource || ''} 
                              onValueChange={(value) => handleSelectTable(value)}
                            >
                              <SelectTrigger id={`mapping-source-${index}`} className="flex-1">
                                <SelectValue placeholder="Select data source" />
                              </SelectTrigger>
                              <SelectContent>
                                {dbSchemaQuery.data && Object.keys(dbSchemaQuery.data.tables).map((tableName) => (
                                  <SelectItem key={tableName} value={tableName}>
                                    {tableName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              onClick={() => openColumnSelector(index)}
                              title="Select database column"
                            >
                              <Database className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor={`mapping-column-${index}`}>Database Column</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id={`mapping-column-${index}`}
                              value={mapping.columnField || ''}
                              readOnly
                              placeholder="Select a column..."
                              onClick={() => openColumnSelector(index)}
                            />
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                  >
                                    <Info className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Click on the input field or database icon to select a column</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Data selection mode UI for handling multiple records */}
                    {mapping.type === 'database' && (
                      <div className="space-y-4 mt-4 border-t pt-4">
                        <div className="space-y-2">
                          <Label htmlFor={`mapping-selection-mode-${index}`}>Record Selection Mode</Label>
                          <Select 
                            value={mapping.selectionMode || 'single'} 
                            onValueChange={(value) => handleUpdateFieldMapping(index, 'selectionMode', value)}
                          >
                            <SelectTrigger id={`mapping-selection-mode-${index}`}>
                              <SelectValue placeholder="Select how records are selected" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="single">Single Record</SelectItem>
                              <SelectItem value="all">All Records</SelectItem>
                              <SelectItem value="custom">Custom Filter</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {mapping.selectionMode === 'single' && (
                          <div className="space-y-2">
                            <Label htmlFor={`mapping-record-id-${index}`}>Record ID</Label>
                            <Input 
                              id={`mapping-record-id-${index}`} 
                              value={mapping.recordId || ''} 
                              onChange={(e) => handleUpdateFieldMapping(index, 'recordId', e.target.value)} 
                              placeholder="Enter ID of specific record to use" 
                            />
                          </div>
                        )}
                        
                        {mapping.selectionMode === 'custom' && (
                          <div className="space-y-2">
                            <Label htmlFor={`mapping-filter-${index}`}>Filter Expression</Label>
                            <Textarea 
                              id={`mapping-filter-${index}`} 
                              value={mapping.selectionFilter || ''} 
                              onChange={(e) => handleUpdateFieldMapping(index, 'selectionFilter', e.target.value)} 
                              placeholder="Enter filter criteria, e.g. status = 'active'" 
                              rows={2}
                            />
                          </div>
                        )}
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
                  >
                    Save Mappings
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Column Selection Dialog */}
      <Dialog open={showColumnSelector} onOpenChange={setShowColumnSelector}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Select Database Column</DialogTitle>
            <DialogDescription>
              Choose a column from the database to map to this field
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="flex items-center gap-2 mb-4">
              <Search className="h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search tables and columns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>
            
            <div className="max-h-[400px] overflow-y-auto border rounded-md p-2">
              {dbSchemaQuery.isLoading ? (
                <div className="py-4 text-center">Loading database schema...</div>
              ) : dbSchemaQuery.isError ? (
                <div className="py-4 text-center text-red-500">
                  Error loading database schema: {dbSchemaQuery.error.message}
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(getFilteredTables()).map(([tableName, tableData]) => (
                    <div key={tableName} className="space-y-2">
                      <div 
                        className="font-medium text-sm bg-gray-100 p-2 rounded cursor-pointer hover:bg-gray-200"
                        onClick={() => handleSelectTable(tableName)}
                      >
                        {tableName}
                      </div>
                      <div className="pl-4 space-y-1">
                        {Object.keys(tableData.columns).map((columnName) => (
                          <div 
                            key={`${tableName}-${columnName}`}
                            className="text-sm p-1 pl-2 rounded cursor-pointer hover:bg-gray-100 flex items-center justify-between"
                            onClick={() => handleSelectColumn(tableName, columnName)}
                          >
                            <span>{columnName}</span>
                            <span className="text-xs text-gray-500">{tableData.columns[columnName]?.type || 'unknown'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}