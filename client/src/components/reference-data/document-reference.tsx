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
  const [activeTab, setActiveTab] = useState<string>('');
  
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
      // Determine which tabs are available
      const hasTextTab = textReferences && textReferences.length > 0;
      const hasPdfTab = pdfReference !== undefined;
      const hasVideoTab = videoReference !== undefined;
      const hasAudioTab = audioReference !== undefined;
      
      // Set active tab in priority order or based on what's available
      if (activeTab === '') {
        // Only set if no tab is already selected (initial load)
        if (hasPdfTab) setActiveTab('pdf');
        else if (hasVideoTab) setActiveTab('video');
        else if (hasAudioTab) setActiveTab('audio');
        else if (hasTextTab) setActiveTab('text');
      } else if (activeTab === 'text' && !hasTextTab) {
        // If text tab was selected but no text references exist, switch to another tab
        if (hasPdfTab) setActiveTab('pdf');
        else if (hasVideoTab) setActiveTab('video');
        else if (hasAudioTab) setActiveTab('audio');
      } else if (activeTab === 'pdf' && !hasPdfTab) {
        // If PDF tab was selected but no PDF reference exists, switch to another tab
        if (hasVideoTab) setActiveTab('video');
        else if (hasAudioTab) setActiveTab('audio');
        else if (hasTextTab) setActiveTab('text');
      } else if (activeTab === 'video' && !hasVideoTab) {
        // If video tab was selected but no video reference exists, switch to another tab
        if (hasPdfTab) setActiveTab('pdf');
        else if (hasAudioTab) setActiveTab('audio');
        else if (hasTextTab) setActiveTab('text');
      } else if (activeTab === 'audio' && !hasAudioTab) {
        // If audio tab was selected but no audio reference exists, switch to another tab
        if (hasPdfTab) setActiveTab('pdf');
        else if (hasVideoTab) setActiveTab('video');
        else if (hasTextTab) setActiveTab('text');
      }
    }
  }, [referenceData, pdfReference, videoReference, audioReference, textReferences, activeTab]);
  
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
  
  // Debug information
  useEffect(() => {
    console.log('Reference Data:', referenceData);
    console.log('Active Tab:', activeTab);
    console.log('Text References:', textReferences ? textReferences.length : 0);
    console.log('PDF Reference:', pdfReference ? 'Yes' : 'No');
    console.log('Video Reference:', videoReference ? 'Yes' : 'No');
    console.log('Audio Reference:', audioReference ? 'Yes' : 'No');
  }, [referenceData, activeTab, textReferences, pdfReference, videoReference, audioReference]);
  
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
          <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue={activeTab} className="w-full">
            <TabsList className="w-full mb-4 flex flex-wrap gap-1">
              {pdfReference && (
                <TabsTrigger value="pdf" className="flex-1 text-xs sm:text-sm">
                  <FileText className="h-4 w-4 mr-1 sm:mr-2" /> 
                  <span className="hidden xs:inline">PDF</span> 
                  <span className="sm:hidden xs:inline">Doc</span>
                  <span className="hidden sm:inline">Document</span>
                </TabsTrigger>
              )}
              {videoReference && (
                <TabsTrigger value="video" className="flex-1 text-xs sm:text-sm">
                  <Video className="h-4 w-4 mr-1 sm:mr-2" /> 
                  <span className="hidden xs:inline">Video</span>
                  <span className="sm:hidden xs:inline">Vid</span>
                  <span className="hidden sm:inline">Timestamps</span>
                </TabsTrigger>
              )}
              {audioReference && (
                <TabsTrigger value="audio" className="flex-1 text-xs sm:text-sm">
                  <Music className="h-4 w-4 mr-1 sm:mr-2" /> 
                  <span className="hidden xs:inline">Audio</span>
                  <span className="sm:hidden xs:inline">Audio</span>
                  <span className="hidden sm:inline">Timestamps</span>
                </TabsTrigger>
              )}
              {textReferences && textReferences.length > 0 && (
                <TabsTrigger value="text" className="flex-1 text-xs sm:text-sm">
                  <FileText className="h-4 w-4 mr-1 sm:mr-2" /> 
                  <span className="hidden xs:inline">Text</span>
                  <span className="sm:hidden xs:inline">Text</span>
                  <span className="hidden sm:inline">Passages</span>
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