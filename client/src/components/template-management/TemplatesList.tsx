import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { DocumentTemplate } from '@shared/schema';
import { CalendarIcon, FileIcon, PlusIcon } from 'lucide-react';
import { useLocation } from 'wouter';
import { formatDistanceToNow } from 'date-fns';

export default function TemplatesList() {
  const [, setLocation] = useLocation();
  
  // Fetch templates
  const { data: templates, isLoading, error } = useQuery({
    queryKey: ['/api/document-templates/global'],
  });
  
  // Handle template click
  const handleTemplateClick = (id: number) => {
    setLocation(`/templates/${id}`);
  };
  
  // Create new template
  const handleCreateTemplate = () => {
    setLocation('/templates/new');
  };
  
  // Get template category label
  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'sow': return 'Statement of Work';
      case 'implementation-plan': return 'Implementation Plan';
      case 'requirement-spec': return 'Requirement Specification';
      default: return category;
    }
  };
  
  if (isLoading) {
    return <div>Loading templates...</div>;
  }
  
  if (error) {
    return <div>Error loading templates: {error.message}</div>;
  }
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Document Templates</h1>
        <Button onClick={handleCreateTemplate}>
          <PlusIcon className="mr-2 h-4 w-4" />
          Create Template
        </Button>
      </div>
      
      {templates && templates.length === 0 ? (
        <div className="text-center py-12">
          <FileIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium">No templates yet</h3>
          <p className="mt-1 text-gray-500">
            Get started by creating a new document template.
          </p>
          <div className="mt-6">
            <Button onClick={handleCreateTemplate}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates?.map((template: DocumentTemplate) => (
            <Card 
              key={template.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleTemplateClick(template.id)}
            >
              <CardHeader>
                <CardTitle>{template.name}</CardTitle>
                <div className="text-sm text-gray-500 mt-1">
                  {getCategoryLabel(template.category)}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 line-clamp-3">
                  {template.description || 'No description provided.'}
                </p>
              </CardContent>
              <CardFooter className="flex justify-between">
                <div className="text-xs text-gray-500 flex items-center">
                  <CalendarIcon className="mr-1 h-3 w-3" />
                  {template.updatedAt ? (
                    `Updated ${formatDistanceToNow(new Date(template.updatedAt), { addSuffix: true })}`
                  ) : (
                    'Recently updated'
                  )}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}