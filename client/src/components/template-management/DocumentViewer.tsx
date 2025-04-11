import React from 'react';
import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { Document } from '@shared/schema';
import { PDFViewer } from '../reference-data/pdf-viewer';
import { Skeleton } from '@/components/ui/skeleton';

export default function DocumentViewer() {
  const params = useParams();
  const documentId = params.id ? parseInt(params.id) : null;
  
  // Fetch document
  const { data: document, isLoading, error } = useQuery<Document>({
    queryKey: [`/api/documents/${documentId}`],
    enabled: !!documentId,
  });
  
  if (isLoading) {
    return <div>Loading document...</div>;
  }
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load the document. {error.message}
        </AlertDescription>
      </Alert>
    );
  }
  
  if (!document) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Document not found.
        </AlertDescription>
      </Alert>
    );
  }
  
  // Handle download
  const handleDownload = () => {
    if (document.pdfPath) {
      // Open the PDF in a new tab
      window.open(document.pdfPath, '_blank');
    }
  };
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {document.name}
          </h1>
          <div className="text-gray-500 mt-1">
            {document.updatedAt && (
              <span>Last updated {formatDistanceToNow(new Date(document.updatedAt), { addSuffix: true })}</span>
            )}
          </div>
        </div>
        
        <Button 
          variant="outline" 
          onClick={handleDownload}
          disabled={!document.pdfPath}
        >
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
      </div>
      
      {document.description && (
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{document.description}</p>
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Document</CardTitle>
        </CardHeader>
        <CardContent className="min-h-[800px]">
          {document.pdfPath ? (
            <PDFViewer 
              url={document.pdfPath}
              onLoad={() => console.log('PDF loaded successfully')}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-[400px] text-gray-500">
              <FileText className="h-20 w-20 mb-4" />
              <p>PDF preview not available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}