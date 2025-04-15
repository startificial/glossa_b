/**
 * Simple Document Test Component
 * This is a test component to debug PDF generation and download
 */
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Download, FileText } from 'lucide-react';

export function SimpleDocumentTest() {
  const [title, setTitle] = useState('Test Document');
  const [content, setContent] = useState('This is a test document content to verify PDF generation works correctly.');
  const [isGenerating, setIsGenerating] = useState(false);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  
  const generateDocument = async () => {
    if (!title || !content) {
      toast({
        title: 'Error',
        description: 'Title and content are required',
        variant: 'destructive'
      });
      return;
    }
    
    setIsGenerating(true);
    
    try {
      console.log('Sending document generation request');
      const response = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          title,
          content,
          documentType: 'test'
        })
      });
      
      console.log('Response status:', response.status);
      console.log('Response content type:', response.headers.get('Content-Type'));
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      
      const contentType = response.headers.get('Content-Type');
      console.log('Response content type:', contentType);
      
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text.substring(0, 200));
        throw new Error('Expected JSON response but got ' + contentType);
      }
      
      const data = await response.json();
      console.log('Document generated:', data);
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to generate document');
      }
      
      setDocumentUrl(data.downloadUrl);
      
      toast({
        title: 'Success',
        description: 'Document generated successfully!'
      });
    } catch (error) {
      console.error('Error generating document:', error);
      toast({
        title: 'Error',
        description: `Failed to generate document: ${error instanceof Error ? error.message : String(error)}`,
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  const downloadDocument = async () => {
    if (!documentUrl) return;
    
    try {
      console.log('Opening document URL:', documentUrl);
      window.open(documentUrl, '_blank');
      
      // Alternative approach with fetch
      setTimeout(async () => {
        try {
          const response = await fetch(`/api/documents/direct/${documentUrl.split('/').pop()}`);
          console.log('Direct download response:', response.status);
          
          if (!response.ok) {
            throw new Error('Failed to download document');
          }
          
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          
          const a = document.createElement('a');
          a.href = url;
          a.download = documentUrl.split('/').pop() || 'document.pdf';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        } catch (error) {
          console.error('Error with backup download method:', error);
        }
      }, 500);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: 'Error',
        description: 'Failed to download document',
        variant: 'destructive'
      });
    }
  };
  
  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="mr-2 h-6 w-6" />
          Document Generator Test
        </CardTitle>
        <CardDescription>
          Test tool for generating and downloading PDF documents
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Document Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter document title"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="content">Document Content</Label>
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter document content"
            rows={6}
          />
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => {
            setTitle('Test Document');
            setContent('This is a test document content to verify PDF generation works correctly.');
            setDocumentUrl(null);
          }}
        >
          Reset
        </Button>
        
        <div className="flex space-x-2">
          {documentUrl && (
            <Button
              variant="outline"
              onClick={downloadDocument}
              className="flex items-center"
            >
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          )}
          
          <Button
            onClick={generateDocument}
            disabled={isGenerating}
          >
            {isGenerating ? 'Generating...' : 'Generate Document'}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}