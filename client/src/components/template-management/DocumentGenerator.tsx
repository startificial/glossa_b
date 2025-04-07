import React, { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useLocation } from 'wouter';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { DocumentTemplate, Document } from '@shared/schema';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';

// Form schema
const documentFormSchema = z.object({
  name: z.string().min(1, 'Document name is required'),
  description: z.string().optional(),
  templateId: z.number(),
  projectId: z.number(),
  status: z.enum(['draft', 'final', 'archived']).default('draft'),
  data: z.record(z.any()),
});

type DocumentFormValues = z.infer<typeof documentFormSchema>;

export default function DocumentGenerator() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const templateId = params.templateId ? parseInt(params.templateId) : null;
  const projectId = params.projectId ? parseInt(params.projectId) : null;
  
  const [generatedData, setGeneratedData] = useState<Record<string, any>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Form setup
  const form = useForm<DocumentFormValues>({
    resolver: zodResolver(documentFormSchema),
    defaultValues: {
      name: '',
      description: '',
      templateId: templateId || 0,
      projectId: projectId || 0,
      status: 'draft',
      data: {},
    },
  });
  
  // Fetch template
  const templateQuery = useQuery<DocumentTemplate>({
    queryKey: [`/api/document-templates/${templateId}`],
    enabled: !!templateId
  });
  
  // Effect to update form values when template data is loaded
  useEffect(() => {
    if (templateQuery.data) {
      // Update form values
      form.setValue('templateId', templateQuery.data.id);
    }
  }, [templateQuery.data, form]);
  
  // Generate data from template fields
  const generateDataMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/documents/generate-data/${templateId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate document data');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedData(data.data || {});
      form.setValue('data', data.data || {});
      
      toast({
        title: 'Data generated',
        description: 'The document data has been generated successfully.',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error generating data',
        description: error.message,
      });
    },
  });
  
  // Create document mutation
  const createDocumentMutation = useMutation({
    mutationFn: async (data: DocumentFormValues) => {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          userId: 1, // Replace with actual user ID from auth context
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create document');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Document created',
        description: 'The document has been created successfully.',
      });
      
      // Set the preview URL
      if (data.pdfPath) {
        setPreviewUrl(data.pdfPath);
      }
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: [`/api/documents/project/${projectId}`] });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error creating document',
        description: error.message,
      });
    },
  });
  
  // Effect to generate data on component mount
  useEffect(() => {
    if (templateId && projectId) {
      generateDataMutation.mutate();
    }
  }, [templateId, projectId]);
  
  // Handle form submission
  const onSubmit = (values: DocumentFormValues) => {
    // Make sure data is included
    const dataToSubmit = {
      ...values,
      data: generatedData,
    };
    
    createDocumentMutation.mutate(dataToSubmit);
  };
  
  // Handle manual field updates
  const handleFieldUpdate = (key: string, value: any) => {
    setGeneratedData({
      ...generatedData,
      [key]: value,
    });
    
    // Update form data
    const currentData = form.getValues('data');
    form.setValue('data', {
      ...currentData,
      [key]: value,
    });
  };
  
  if (templateQuery.isLoading) {
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
  
  const template = templateQuery.data;
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Generate Document</h1>
        
        <div className="space-x-2">
          <Button 
            variant="outline" 
            onClick={() => setLocation(`/projects/${projectId}`)}
          >
            Cancel
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Document Details</CardTitle>
              <CardDescription>
                Enter the basic information for your document.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Document Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter document name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter document description" 
                            rows={3}
                            {...field} 
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="final">Final</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="pt-4">
                    <Button 
                      type="submit"
                      disabled={createDocumentMutation.isPending}
                      className="w-full"
                    >
                      {createDocumentMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        'Generate Document'
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Document Fields</CardTitle>
              <CardDescription>
                Review and edit the content that will be used in the document.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {template && template.schema && typeof template.schema === 'object' && Object.keys(template.schema as Record<string, any>).length > 0 ? (
                  Object.keys(template.schema as Record<string, any>).map((key) => {
                    const field = (template.schema as Record<string, any>)[key];
                    return (
                      <div key={key} className="space-y-2">
                        <Label htmlFor={`field-${key}`}>
                          {key}
                          {field.type === 'ai-generated' && (
                            <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                              AI Generated
                            </span>
                          )}
                        </Label>
                        
                        {field.type === 'text' || field.type === 'ai-generated' ? (
                          <Textarea
                            id={`field-${key}`}
                            value={generatedData[key] || ''}
                            onChange={(e) => handleFieldUpdate(key, e.target.value)}
                            rows={3}
                          />
                        ) : (
                          <Input
                            id={`field-${key}`}
                            value={generatedData[key] || ''}
                            onChange={(e) => handleFieldUpdate(key, e.target.value)}
                          />
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="py-4 text-center text-gray-500">
                    No fields defined in this template.
                  </div>
                )}
                
                <Button 
                  variant="outline"
                  onClick={() => generateDataMutation.mutate()}
                  disabled={generateDataMutation.isPending}
                  className="w-full mt-4"
                >
                  {generateDataMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Regenerate Field Data'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                Preview of the generated document.
              </CardDescription>
            </CardHeader>
            <CardContent className="min-h-[600px] flex items-center justify-center">
              {previewUrl ? (
                <iframe 
                  src={previewUrl} 
                  className="w-full h-[700px] border-0"
                  title="Document Preview"
                />
              ) : (
                <div className="text-center p-12 border-2 border-dashed border-gray-300 rounded-md w-full h-full flex flex-col items-center justify-center">
                  <p className="text-gray-500 mb-4">
                    Document preview will appear here after generation.
                  </p>
                  <Button 
                    onClick={form.handleSubmit(onSubmit)}
                    disabled={createDocumentMutation.isPending}
                  >
                    {createDocumentMutation.isPending ? 'Generating...' : 'Generate Now'}
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