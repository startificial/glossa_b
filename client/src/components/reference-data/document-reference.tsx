import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PDFViewer } from './pdf-viewer';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, AlertCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

interface TextReference {
  type: 'text';
  content: string;
  metadata?: {
    location?: string;
    page?: number;
    context?: string;
  };
}

interface PDFReference {
  type: 'pdf';
  url: string;
  highlights?: {
    pageNumber: number;
    text: string;
    color?: string;
  }[];
}

interface DocumentReferenceProps {
  requirementId: number;
  inputDataId: number;
}

export function DocumentReference({ requirementId, inputDataId }: DocumentReferenceProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('pdf');
  
  // Fetch reference data for this requirement
  const { 
    data: referenceData,
    isLoading,
    error
  } = useQuery<(TextReference | PDFReference)[]>({
    queryKey: [`/api/requirements/${requirementId}/references`, inputDataId],
    queryFn: async ({ queryKey }) => {
      const [url, dataId] = queryKey;
      const response = await fetch(`${url}?inputDataId=${dataId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch reference data');
      }
      return response.json();
    }
  });
  
  // Find the first PDF reference if available
  const pdfReference = referenceData?.find(ref => ref.type === 'pdf') as PDFReference | undefined;
  
  // Find text references
  const textReferences = referenceData?.filter(ref => ref.type === 'text') as TextReference[] | undefined;
  
  // Handle errors
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load reference data. Please try again later.",
        variant: "destructive",
      });
    }
  }, [error, toast]);
  
  return (
    <Card className="shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Source References</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        ) : error || !referenceData || referenceData.length === 0 ? (
          <div className="text-center py-10 text-gray-500 flex flex-col items-center">
            <AlertCircle className="h-10 w-10 mb-2" />
            <p>No reference data available for this requirement.</p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full mb-4">
              {pdfReference && (
                <TabsTrigger value="pdf" className="flex-1">
                  <FileText className="h-4 w-4 mr-2" /> PDF Document
                </TabsTrigger>
              )}
              {textReferences && textReferences.length > 0 && (
                <TabsTrigger value="text" className="flex-1">
                  <FileText className="h-4 w-4 mr-2" /> Text Passages
                </TabsTrigger>
              )}
            </TabsList>
            
            {pdfReference && (
              <TabsContent value="pdf" className="mt-0">
                <div className="h-[600px]">
                  <PDFViewer 
                    url={pdfReference.url.startsWith('http') ? pdfReference.url : window.location.origin + pdfReference.url} 
                    highlights={pdfReference.highlights}
                  />
                </div>
              </TabsContent>
            )}
            
            {textReferences && textReferences.length > 0 && (
              <TabsContent value="text" className="mt-0">
                <ScrollArea className="h-[600px] p-4 rounded bg-gray-50">
                  {textReferences.map((reference, index) => (
                    <div key={index} className="mb-6">
                      {reference.metadata?.location && (
                        <div className="text-sm text-gray-500 mb-1">
                          Location: {reference.metadata.location}
                          {reference.metadata.page && ` (Page ${reference.metadata.page})`}
                        </div>
                      )}
                      <div className="p-4 border border-gray-200 rounded bg-white">
                        <p className="text-sm whitespace-pre-line">{reference.content}</p>
                      </div>
                      {reference.metadata?.context && (
                        <div className="mt-2 text-xs text-gray-500">
                          Context: {reference.metadata.context}
                        </div>
                      )}
                    </div>
                  ))}
                </ScrollArea>
              </TabsContent>
            )}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}