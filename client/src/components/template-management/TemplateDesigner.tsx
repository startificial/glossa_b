import React, { useState, useEffect, useCallback, useRef } from 'react';
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
// Using only the Template type, not the direct Designer import
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
  schemas: [[]] as any[][],
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
  const [designerInitialized, setDesignerInitialized] = useState(false);
  
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
  
  // Function to safely destroy the designer instance
  const safelyDestroyDesigner = useCallback(() => {
    if (designer) {
      try {
        // Try to get the template before destroying the designer
        if (typeof designer.getTemplate === 'function') {
          try {
            const currentTemplate = designer.getTemplate();
            if (currentTemplate) {
              // Create a deep copy to avoid reference issues
              const templateCopy = JSON.parse(JSON.stringify(currentTemplate));
              setTemplate(templateCopy as Template);
              console.log("Template saved before destroying designer");
            }
          } catch (error) {
            console.error("Error saving template state on cleanup:", error);
          }
        }
        
        // Then destroy the designer
        try {
          designer.destroy();
          console.log("Designer destroyed successfully");
        } catch (error) {
          console.error("Error destroying designer:", error);
        }
      } catch (error) {
        console.error("Error in safelyDestroyDesigner:", error);
      }
    }
  }, [designer, setTemplate]);

  // Function to initialize the designer
  const initializeDesigner = useCallback(async () => {
    // Only proceed if we have a PDF and a container
    if (!template.basePdf || !designerRef.current) {
      console.log("Cannot initialize designer - missing PDF or container");
      return;
    }
    
    // If we're already initialized, don't recreate
    if (designerInitialized && designer) {
      console.log("Designer already initialized, skipping");
      return;
    }

    try {
      // Clean up any previous instance first
      if (designer) {
        // Try to save state before destroying
        try {
          if (typeof designer.getTemplate === 'function') {
            const currentTemplate = designer.getTemplate();
            if (currentTemplate) {
              setTemplate(JSON.parse(JSON.stringify(currentTemplate)));
            }
          }
        } catch (e) {
          console.log("Could not save template state before reinitializing");
        }
        
        // Now destroy the instance
        try {
          designer.destroy();
          setDesigner(null);
          setDesignerInitialized(false);
          console.log("Cleaned up previous designer instance");
          
          // Short delay to ensure DOM is ready
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (e) {
          console.error("Error destroying previous designer:", e);
          // Continue anyway as we'll create a new instance
        }
      }
      
      // Dynamically import the Designer to avoid conflicts
      const PDFmeUI = await import('@pdfme/ui');
      
      // Create a deep copy of the template to avoid reference issues
      const templateCopy = JSON.parse(JSON.stringify(template));
      
      console.log("Creating new designer instance with PDF length:", 
        templateCopy.basePdf.length);
      
      // Create a properly formatted template object according to pdfme requirements
      const properTemplate = {
        basePdf: templateCopy.basePdf,
        schemas: templateCopy.schemas && Array.isArray(templateCopy.schemas) ? 
                 templateCopy.schemas : [[]],
        sampledata: templateCopy.sampledata && Array.isArray(templateCopy.sampledata) ? 
                    templateCopy.sampledata : [{}]
      };
      
      // Create a new instance with minimal configuration to avoid errors
      const newDesigner = new PDFmeUI.Designer({
        domContainer: designerRef.current,
        template: properTemplate
      });
      
      // Setup save handler
      if (typeof newDesigner.onSaveTemplate === 'function') {
        newDesigner.onSaveTemplate((updatedTemplate: any) => {
          try {
            console.log("Template saved by designer");
            setTemplate(JSON.parse(JSON.stringify(updatedTemplate)));
          } catch (e) {
            console.error("Error saving template from designer:", e);
          }
        });
      }
      
      // Update state
      setDesigner(newDesigner);
      setDesignerInitialized(true);
      console.log("Designer successfully initialized");
      
    } catch (error) {
      console.error("Error initializing designer:", error);
      setDesignerInitialized(false);
      setDesigner(null);
      toast({
        variant: 'destructive',
        title: 'Error initializing PDF editor',
        description: 'There was a problem with the PDF editor. Please try again or use a different PDF.'
      });
    }
  }, [template.basePdf, designer, designerInitialized, designerRef]);
  
  // Initialize designer when template changes or we switch to editor tab
  useEffect(() => {
    // Run when the tab is 'editor', we have a PDF, and we haven't initialized the designer yet
    if (activeTab === 'editor' && template.basePdf && !designerInitialized) {
      console.log("Attempting to initialize designer");
      
      // Short delay to ensure DOM is fully loaded
      setTimeout(() => {
        if (designerRef.current) {
          initializeDesigner();
        } else {
          console.error("Designer container ref is not available");
        }
      }, 500);
    }
    
    // Clean up when the component unmounts
    return () => {
      if (designer && designerInitialized) {
        try {
          console.log("Cleaning up designer");
          if (typeof designer.destroy === 'function') {
            designer.destroy();
          }
          setDesigner(null);
          setDesignerInitialized(false);
        } catch (e) {
          console.error("Error cleaning up designer:", e);
        }
      }
    };
  }, [activeTab, template.basePdf, designerInitialized, initializeDesigner]);
  
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
    
    if (designer && activeTab === 'editor') {
      try {
        // If designer is initialized and we're on the editor tab, get template from it
        if (typeof designer.getTemplate === 'function') {
          currentTemplate = designer.getTemplate();
          schemaData = extractSchemaFromTemplate(currentTemplate);
        } else {
          // If getTemplate is not available, fall back to state template
          schemaData = extractSchemaFromTemplate(template);
        }
      } catch (error: any) {
        console.error("Error getting template from designer:", error);
        // Fall back to state template
        schemaData = extractSchemaFromTemplate(template);
      }
    } else {
      console.log("Designer not active or initialized, using state template");
      // Make sure to extract schema from the state template
      schemaData = extractSchemaFromTemplate(template);
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
      // Ensure we treat schemas as a properly typed array
      const schemas = template.schemas as any[][];
      
      // Process each page of schemas
      schemas.forEach((page: any[], pageIndex: number) => {
        if (Array.isArray(page)) {
          // Process each field in the page
          page.forEach((field: any) => {
            if (field && field.name) {
              // Add the field to our schema with its type and default value
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
      prompt: '',             // For AI-generated type content
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
  
  // Handle file upload with a simpler approach
  // Create a blank page PDF
  const createBlankPdf = async () => {
    try {
      // Dynamically import jspdf
      const { jsPDF } = await import('jspdf');

      // Create a new document with portrait A4 format
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Get the PDF as base64 string
      const base64String = doc.output('datauristring');
      
      // Create a new template with the blank PDF
      const newTemplate = {
        basePdf: base64String,
        schemas: [[]] as any[][],
        sampledata: [{}] as any[],
      };
      
      // Set the template
      setTemplate(newTemplate);
      
      // Clean up existing designer if needed
      if (designer && designerInitialized) {
        try {
          if (typeof designer.destroy === 'function') {
            designer.destroy();
          }
          setDesigner(null);
          setDesignerInitialized(false);
        } catch (error) {
          console.error('Error destroying designer:', error);
        }
      }
      
      // Initialize the designer with the blank PDF
      setTimeout(() => {
        initializeDesigner();
      }, 500);
      
      // Show success message
      toast({
        title: 'Blank page created',
        description: 'A blank page has been created. Switch to the Editor tab to add fields.',
      });
    } catch (error) {
      console.error('Error creating blank PDF:', error);
      toast({
        variant: 'destructive',
        title: 'Error creating blank page',
        description: 'Failed to create a blank page. Please try again.',
      });
    }
  };
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (!file) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select a PDF file.',
      });
      return;
    }
    
    if (!file.type.includes('pdf')) {
      toast({
        variant: 'destructive',
        title: 'Invalid file type',
        description: 'Please select a PDF file.',
      });
      return;
    }
    
    try {
      // Read the PDF file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Convert to base64 string
      let binary = '';
      uint8Array.forEach(byte => {
        binary += String.fromCharCode(byte);
      });
      
      const base64String = window.btoa(binary);
      const basePdf = `data:application/pdf;base64,${base64String}`;
      
      // Create a new template with the PDF according to pdfme structure
      const newTemplate = {
        basePdf: basePdf,
        schemas: [[]] as any[][],
        sampledata: [{}] as any[],
      };
      
      // Set the template
      setTemplate(newTemplate);
      
      // If we're in editor mode, destroy any existing designer
      if (designer && designerInitialized) {
        try {
          console.log("Cleaning up existing designer before loading new PDF");
          if (typeof designer.destroy === 'function') {
            designer.destroy();
          }
          setDesigner(null);
          setDesignerInitialized(false);
        } catch (e) {
          console.error("Error cleaning up designer:", e);
        }
      }
      
      toast({
        title: 'PDF uploaded',
        description: 'The PDF has been uploaded successfully. Switch to the Editor tab to add fields.',
      });
    } catch (error) {
      console.error('Error processing PDF:', error);
      toast({
        variant: 'destructive',
        title: 'Error uploading PDF',
        description: 'Failed to process the PDF file. Please try again with a different file.',
      });
    }
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
        onValueChange={(value) => {
          console.log(`Tab switching from ${activeTab} to ${value}`);
          
          // Only try to save if we're leaving the editor tab
          if (activeTab === 'editor') {
            // Wrap in try/catch for safety
            try {
              // First, check if designer exists and is valid
              if (designer && typeof designer === 'object') {
                try {
                  // Check if getTemplate method exists before calling it
                  if (typeof designer.getTemplate === 'function') {
                    try {
                      // Get the current template
                      const currentTemplate = designer.getTemplate();
                      
                      // Make sure we got a valid template object back
                      if (currentTemplate && typeof currentTemplate === 'object') {
                        // Create a deep copy to avoid reference issues
                        const templateCopy = JSON.parse(JSON.stringify(currentTemplate));
                        
                        // Update the template state
                        setTemplate(templateCopy as Template);
                        console.log("Template state saved during tab switch");
                      }
                    } catch (e) {
                      console.error("Error getting template from designer:", e);
                    }
                  }
                } catch (e) {
                  console.error("Error accessing designer methods:", e);
                }
              }
            } catch (error) {
              console.error("Error during tab switch template saving:", error);
            }
          }
          
          // Update active tab (this needs to happen regardless of whether template saving succeeded)
          setActiveTab(value);
        }}
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
                  <div className="flex space-x-2">
                    <Input 
                      id="pdf-upload" 
                      type="file" 
                      accept=".pdf" 
                      onChange={handleFileUpload} 
                      className="w-3/4"
                    />
                    <Button 
                      onClick={createBlankPdf}
                      variant="outline"
                      className="w-1/4"
                    >
                      Create Blank Page
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Upload an existing PDF or create a blank page to start from scratch</p>
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
                  <div className="space-y-6">
                    <div className="p-4 border rounded-md bg-gray-50">
                      <h3 className="font-medium mb-2">PDF Template Information</h3>
                      <p>Your PDF has been uploaded successfully.</p>
                      <p className="text-sm text-gray-500 mt-2">Size: {template.basePdf ? Math.round((template.basePdf as string).length / 1024) : 0} KB</p>
                    </div>
                    
                    {/* PDF Template Designer Container */}
                    <div className="border rounded-md overflow-hidden">
                      <h3 className="font-medium p-4 border-b">PDF Template Designer</h3>
                      <div 
                        ref={designerRef} 
                        className="h-[600px] w-full"
                      >
                        {/* The PDF Designer component will be mounted here */}
                        {!designerInitialized && template.basePdf && (
                          <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                              <p>Loading PDF designer...</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="p-4 border rounded-md">
                      <h3 className="font-medium mb-4">Template Form Fields</h3>
                      <div className="space-y-4">
                        {template.schemas && 
                         Array.isArray(template.schemas) && 
                         template.schemas.length > 0 && 
                         Array.isArray(template.schemas[0]) && 
                         template.schemas[0].length > 0 ? (
                          (template.schemas[0] as any[]).map((field: any, index: number) => (
                            <div key={index} className="p-3 border rounded-md">
                              <div className="flex justify-between items-center mb-2">
                                <Label className="font-medium">{field.name}</Label>
                                <span className="text-xs bg-gray-100 px-2 py-1 rounded">{field.type || 'text'}</span>
                              </div>
                              <Input
                                type="text"
                                placeholder={`Value for ${field.name}`}
                                defaultValue={field.defaultValue || ''}
                                onChange={(e) => {
                                  // Update field default value
                                  const schemas = template.schemas as any[][];
                                  const newSchemas = [...schemas];
                                  if (newSchemas[0] && newSchemas[0][index]) {
                                    newSchemas[0][index].defaultValue = e.target.value;
                                    setTemplate({
                                      ...template,
                                      schemas: newSchemas
                                    });
                                  }
                                }}
                              />
                            </div>
                          ))
                        ) : (
                          <div className="text-center p-4 border border-dashed rounded-md">
                            <p>No form fields defined yet. Add form fields below.</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="p-4 border rounded-md">
                      <h3 className="font-medium mb-4">Add Field to PDF Template</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="new-field-name">Field Name</Label>
                          <Input
                            id="new-field-name"
                            placeholder="Enter field name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="new-field-type">Field Type</Label>
                          <Select defaultValue="text">
                            <SelectTrigger id="new-field-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="number">Number</SelectItem>
                              <SelectItem value="date">Date</SelectItem>
                              <SelectItem value="qrcode">QR Code</SelectItem>
                              <SelectItem value="image">Image</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label htmlFor="field-formatting">Formatting</Label>
                          <div className="flex gap-2 mt-1">
                            <div className="flex items-center space-x-2">
                              <input 
                                type="checkbox" 
                                id="is-heading" 
                                className="form-checkbox h-4 w-4 text-blue-600" 
                              />
                              <label htmlFor="is-heading" className="text-sm">Heading</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input 
                                type="checkbox" 
                                id="is-numbered" 
                                className="form-checkbox h-4 w-4 text-blue-600" 
                              />
                              <label htmlFor="is-numbered" className="text-sm">Numbered List</label>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-end">
                          <Button 
                            className="w-full"
                            onClick={() => {
                              const fieldNameInput = document.getElementById('new-field-name') as HTMLInputElement;
                              const fieldName = fieldNameInput?.value;
                              
                              if (!fieldName) {
                                toast({
                                  variant: 'destructive',
                                  title: 'Error',
                                  description: 'Please enter a field name.',
                                });
                                return;
                              }
                              
                              // Get the field type from the select
                              const fieldTypeSelect = document.getElementById('new-field-type') as HTMLSelectElement;
                              const fieldType = fieldTypeSelect?.value || 'text';
                              
                              try {
                                // First check if the designer is available
                                if (!designer || !designerInitialized) {
                                  toast({
                                    variant: 'destructive',
                                    title: 'Designer not ready',
                                    description: 'Please wait for the PDF designer to initialize fully.',
                                  });
                                  return;
                                }
                                
                                // Get the current template from the designer
                                const currentTemplate = designer.getTemplate();
                                
                                // Add the new field to the first page schema
                                if (!currentTemplate.schemas[0]) {
                                  currentTemplate.schemas[0] = [];
                                }
                                
                                // Get formatting options
                                const isHeadingCheckbox = document.getElementById('is-heading') as HTMLInputElement;
                                const isNumberedCheckbox = document.getElementById('is-numbered') as HTMLInputElement;
                                const isHeading = isHeadingCheckbox?.checked || false;
                                const isNumbered = isNumberedCheckbox?.checked || false;
                                
                                const newField = {
                                  name: fieldName,
                                  type: fieldType,
                                  position: { x: 0, y: 0 }, // Default position
                                  width: isHeading ? 200 : 100,  // Default width - wider for headings
                                  height: isHeading ? 30 : 20,  // Default height - taller for headings
                                  value: `{{ ${fieldName} }}`, // Template syntax
                                  defaultValue: '',
                                  // Add formatting properties
                                  isHeading,
                                  isNumbered,
                                };
                                
                                // Add the field to the template schema
                                currentTemplate.schemas[0].push(newField);
                                
                                // Update the designer with the new template
                                designer.updateTemplate(currentTemplate);
                                
                                // Update our state
                                setTemplate(JSON.parse(JSON.stringify(currentTemplate)));
                                
                                // Clear the input
                                if (fieldNameInput) {
                                  fieldNameInput.value = '';
                                }
                                
                                toast({
                                  title: 'Field added',
                                  description: `Added field "${fieldName}" to the template. Drag it to position on the PDF.`,
                                });
                              } catch (error: any) {
                                console.error("Error adding field to PDF template:", error);
                                toast({
                                  variant: 'destructive',
                                  title: 'Error adding field',
                                  description: error.message || 'An unknown error occurred.',
                                });
                              }
                            }}
                          >
                            Add to Template
                          </Button>
                        </div>
                      </div>
                      <div className="mt-4 p-3 bg-blue-50 rounded-md text-sm">
                        <p className="font-medium text-blue-700">How to use the PDF template designer:</p>
                        <ol className="list-decimal pl-5 mt-2 text-blue-600 space-y-1">
                          <li>Enter a field name and select its type above</li>
                          <li>Click "Add to Template" to create the field</li>
                          <li>The field will appear in the designer area - drag to position it</li>
                          <li>Resize by dragging the corners of the field</li>
                          <li>Click on a field to edit its properties</li>
                          <li>Fields added here will be available for mapping in the Mappings tab</li>
                        </ol>
                      </div>
                    </div>
                  </div>
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
                {/* Template fields reference */}
                <div className="p-4 bg-slate-50 rounded-md mb-6">
                  <h3 className="font-medium mb-2">Template Fields Available</h3>
                  <div className="space-y-1">
                    {template.schemas && 
                     Array.isArray(template.schemas) && 
                     template.schemas.length > 0 && 
                     Array.isArray(template.schemas[0]) && 
                     template.schemas[0].length > 0 ? (
                      <div className="grid grid-cols-3 gap-2">
                        {(template.schemas[0] as any[]).map((field: any, idx: number) => (
                          <div key={idx} className="text-sm p-2 bg-white border rounded-md flex items-center">
                            <span className="font-medium text-blue-600">{field.name}</span>
                            <span className="ml-2 text-xs bg-slate-100 px-1.5 py-0.5 rounded">{field.type || 'text'}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">No fields defined yet. Go to the Editor tab and add fields to your template first.</p>
                    )}
                  </div>
                </div>
                
                {fieldMappings.map((mapping, index) => (
                  <div key={index} className="border p-4 rounded-md space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`mapping-name-${index}`}>Mapping Name</Label>
                        <Input 
                          id={`mapping-name-${index}`} 
                          value={mapping.name} 
                          onChange={(e) => handleUpdateFieldMapping(index, 'name', e.target.value)} 
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`mapping-type-${index}`}>Data Source Type</Label>
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
                      <Label htmlFor={`mapping-field-key-${index}`}>Template Field Key</Label>
                      <Select
                        value={mapping.fieldKey || ''}
                        onValueChange={(value) => handleUpdateFieldMapping(index, 'fieldKey', value)}
                      >
                        <SelectTrigger id={`mapping-field-key-${index}`}>
                          <SelectValue placeholder="Select field to map to" />
                        </SelectTrigger>
                        <SelectContent>
                          {template.schemas && 
                           Array.isArray(template.schemas) && 
                           template.schemas.length > 0 && 
                           Array.isArray(template.schemas[0]) ? 
                            (template.schemas[0] as any[]).map((field: any, idx: number) => (
                              <SelectItem key={idx} value={field.name}>
                                {field.name} ({field.type || 'text'})
                              </SelectItem>
                            )) : 
                            <SelectItem value="" disabled>No fields available</SelectItem>
                          }
                        </SelectContent>
                      </Select>
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
                    
                    {/* AI-generated content UI */}
                    {mapping.type === 'ai-generated' && (
                      <div className="space-y-4 mt-4 border-t pt-4">
                        <div className="p-3 bg-blue-50 rounded-md">
                          <div className="flex items-start gap-2">
                            <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                            <div>
                              <p className="text-sm text-blue-700 font-medium">AI Generated Content</p>
                              <p className="text-sm text-blue-600 mt-1">
                                This field will be generated using AI based on project data and your custom prompt.
                                You can reference specific data using variable syntax.
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`mapping-prompt-${index}`}>AI Generation Prompt</Label>
                          <Textarea
                            id={`mapping-prompt-${index}`}
                            placeholder="Write a prompt for AI to generate content based on project data..."
                            value={mapping.prompt || ''}
                            onChange={(e) => handleUpdateFieldMapping(index, 'prompt', e.target.value)}
                            rows={4}
                            className="resize-none"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Example: "Summarize the project scope based on the requirements and provide 3 key milestones."
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`mapping-data-sources-${index}`}>Include Data from</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`mapping-include-project-${index}`}
                                checked={mapping.includeProject !== false}
                                onChange={(e) => handleUpdateFieldMapping(index, 'includeProject', e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300"
                              />
                              <Label htmlFor={`mapping-include-project-${index}`}>Project details</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`mapping-include-requirements-${index}`}
                                checked={mapping.includeRequirements !== false}
                                onChange={(e) => handleUpdateFieldMapping(index, 'includeRequirements', e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300"
                              />
                              <Label htmlFor={`mapping-include-requirements-${index}`}>Requirements</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`mapping-include-tasks-${index}`}
                                checked={mapping.includeTasks !== false}
                                onChange={(e) => handleUpdateFieldMapping(index, 'includeTasks', e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300"
                              />
                              <Label htmlFor={`mapping-include-tasks-${index}`}>Implementation tasks</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`mapping-include-customer-${index}`}
                                checked={mapping.includeCustomer !== false}
                                onChange={(e) => handleUpdateFieldMapping(index, 'includeCustomer', e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300"
                              />
                              <Label htmlFor={`mapping-include-customer-${index}`}>Customer data</Label>
                            </div>
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
                    
                    {/* Default value field shown for all mapping types */}
                    
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