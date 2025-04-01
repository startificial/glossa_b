import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PDFViewer } from './pdf-viewer';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, AlertCircle, Video, Music } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

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

interface VideoReference {
  type: 'video';
  url: string;
  timestamps: {
    startTime: number;
    endTime: number;
    transcript: string;
    relevance?: number;
  }[];
}

interface AudioReference {
  type: 'audio';
  url: string;
  timestamps: {
    startTime: number;
    endTime: number;
    transcript: string;
    relevance?: number;
  }[];
}

type ReferenceType = TextReference | PDFReference | VideoReference | AudioReference;

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
  } = useQuery<ReferenceType[]>({
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
  
  // Find references by type
  const pdfReference = referenceData?.find(ref => ref.type === 'pdf') as PDFReference | undefined;
  const videoReference = referenceData?.find(ref => ref.type === 'video') as VideoReference | undefined;
  const audioReference = referenceData?.find(ref => ref.type === 'audio') as AudioReference | undefined;
  const textReferences = referenceData?.filter(ref => ref.type === 'text') as TextReference[] | undefined;
  
  // Set initial active tab based on available references
  useEffect(() => {
    if (referenceData?.length) {
      if (pdfReference) setActiveTab('pdf');
      else if (videoReference) setActiveTab('video');
      else if (audioReference) setActiveTab('audio');
      else if (textReferences?.length) setActiveTab('text');
    }
  }, [referenceData, pdfReference, videoReference, audioReference, textReferences]);
  
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
              {videoReference && (
                <TabsTrigger value="video" className="flex-1">
                  <Video className="h-4 w-4 mr-2" /> Video Timestamps
                </TabsTrigger>
              )}
              {audioReference && (
                <TabsTrigger value="audio" className="flex-1">
                  <Music className="h-4 w-4 mr-2" /> Audio Timestamps
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
            
            {videoReference && (
              <TabsContent value="video" className="mt-0">
                <div className="space-y-4">
                  <div>
                    <video 
                      controls 
                      className="w-full max-h-[400px] bg-black rounded"
                      src={videoReference.url.startsWith('http') ? videoReference.url : window.location.origin + videoReference.url}
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                  
                  <ScrollArea className="h-[200px] p-4 rounded bg-gray-50">
                    <h3 className="text-sm font-medium mb-2">Referenced Timestamps</h3>
                    {videoReference.timestamps.map((timestamp, index) => (
                      <div key={index} className="mb-4 p-3 border border-gray-200 rounded bg-white">
                        <div className="flex justify-between mb-2">
                          <div className="text-sm text-gray-700">
                            {Math.floor(timestamp.startTime / 60)}:{(timestamp.startTime % 60).toString().padStart(2, '0')} - 
                            {Math.floor(timestamp.endTime / 60)}:{(timestamp.endTime % 60).toString().padStart(2, '0')}
                          </div>
                          {timestamp.relevance && (
                            <div className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                              {Math.round(timestamp.relevance * 100)}% match
                            </div>
                          )}
                        </div>
                        <p className="text-sm whitespace-pre-line mb-2">{timestamp.transcript}</p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="mt-1 text-xs"
                          onClick={() => {
                            const videoElement = document.querySelector('video');
                            if (videoElement) {
                              videoElement.currentTime = timestamp.startTime;
                              videoElement.play();
                            }
                          }}
                        >
                          Jump to Timestamp
                        </Button>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              </TabsContent>
            )}
            
            {audioReference && (
              <TabsContent value="audio" className="mt-0">
                <div className="space-y-4">
                  <div className="bg-gray-100 p-4 rounded">
                    <audio 
                      controls 
                      className="w-full"
                      src={audioReference.url.startsWith('http') ? audioReference.url : window.location.origin + audioReference.url}
                    >
                      Your browser does not support the audio tag.
                    </audio>
                  </div>
                  
                  <ScrollArea className="h-[400px] p-4 rounded bg-gray-50">
                    <h3 className="text-sm font-medium mb-2">Referenced Timestamps</h3>
                    {audioReference.timestamps.map((timestamp, index) => (
                      <div key={index} className="mb-4 p-3 border border-gray-200 rounded bg-white">
                        <div className="flex justify-between mb-2">
                          <div className="text-sm text-gray-700">
                            {Math.floor(timestamp.startTime / 60)}:{(timestamp.startTime % 60).toString().padStart(2, '0')} - 
                            {Math.floor(timestamp.endTime / 60)}:{(timestamp.endTime % 60).toString().padStart(2, '0')}
                          </div>
                          {timestamp.relevance && (
                            <div className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                              {Math.round(timestamp.relevance * 100)}% match
                            </div>
                          )}
                        </div>
                        <p className="text-sm whitespace-pre-line mb-2">{timestamp.transcript}</p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="mt-1 text-xs"
                          onClick={() => {
                            const audioElement = document.querySelector('audio');
                            if (audioElement) {
                              audioElement.currentTime = timestamp.startTime;
                              audioElement.play();
                            }
                          }}
                        >
                          Jump to Timestamp
                        </Button>
                      </div>
                    ))}
                  </ScrollArea>
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