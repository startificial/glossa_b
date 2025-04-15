/**
 * Simple PDF Test Component
 * 
 * This component provides a basic UI for testing the new PDF generation
 * functionality without complex integration.
 */
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export function PdfTest() {
  const [projectId, setProjectId] = useState<string>('');
  const [documentType, setDocumentType] = useState<string>('sow');
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGeneratePdf = async () => {
    try {
      setIsGenerating(true);
      setPdfUrl(null);
      
      console.log(`Generating PDF with projectId=${projectId}, documentType=${documentType}`);
      
      const response = await fetch('/api/generate-simple-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          projectId: parseInt(projectId),
          documentType
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('PDF generation failed:', errorText);
        toast({
          title: 'PDF Generation Failed',
          description: `Status: ${response.status} - ${errorText}`,
          variant: 'destructive'
        });
        return;
      }
      
      const data = await response.json();
      console.log('PDF generation response:', data);
      
      if (data.success && data.downloadUrl) {
        setPdfUrl(data.downloadUrl);
        toast({
          title: 'PDF Generated Successfully',
          description: 'Your document is ready for download',
          variant: 'default'
        });
      } else {
        toast({
          title: 'PDF Generation Failed',
          description: data.error || 'Unknown error occurred',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'PDF Generation Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="w-[550px] mx-auto my-8">
      <CardHeader>
        <CardTitle>Simple PDF Generator</CardTitle>
        <CardDescription>
          Generate a PDF document for any project
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="project-id">Project ID</Label>
          <input
            id="project-id"
            type="number"
            placeholder="Enter project ID"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full p-2 border rounded-md"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="document-type">Document Type</Label>
          <Select 
            value={documentType} 
            onValueChange={setDocumentType}
          >
            <SelectTrigger id="document-type" className="w-full">
              <SelectValue placeholder="Select document type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sow">Statement of Work</SelectItem>
              <SelectItem value="implementation-plan">Implementation Plan</SelectItem>
              <SelectItem value="requirement-list">Requirements List</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
        <Button 
          onClick={handleGeneratePdf} 
          disabled={!projectId || isGenerating}
          className="w-full"
        >
          {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isGenerating ? 'Generating PDF...' : 'Generate PDF'}
        </Button>
        
        {pdfUrl && (
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => window.open(pdfUrl, '_blank')}
          >
            Download PDF
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}