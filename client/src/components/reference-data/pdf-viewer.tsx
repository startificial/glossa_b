import { useState, useEffect, useRef } from 'react';
import { Maximize, Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface PDFViewerProps {
  url: string;
  highlights?: {
    pageNumber: number;
    text: string;
    color?: string;
  }[];
  onLoad?: () => void;
}

export function PDFViewer({ url, highlights = [], onLoad }: PDFViewerProps) {
  const { toast } = useToast();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    // Set loading to false after a short delay to allow iframe to initialize
    const timer = setTimeout(() => {
      setIsLoading(false);
      if (onLoad) onLoad();
    }, 1000);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      clearTimeout(timer);
    };
  }, [onLoad]);

  function toggleFullscreen() {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        toast({
          title: "Error",
          description: `Could not enable fullscreen mode: ${err.message}`,
          variant: "destructive",
        });
      });
    } else {
      document.exitFullscreen();
    }
  }

  function downloadPDF() {
    const link = document.createElement('a');
    link.href = url;
    link.download = url.substring(url.lastIndexOf('/') + 1);
    link.click();
  }

  // Construct the search parameter for highlights if any
  const searchParam = highlights && highlights.length > 0 
    ? `&search=${encodeURIComponent(highlights[0].text)}` 
    : '';

  return (
    <div 
      ref={containerRef} 
      className={`flex flex-col ${isFullscreen ? 'fixed inset-0 bg-white z-50 p-4' : 'relative bg-gray-100 rounded-lg p-2'}`}
    >
      <div className="flex flex-wrap items-center justify-between mb-2 bg-white rounded p-2 sticky top-0 z-10 gap-2">
        <div className="flex items-center">
          <FileText className="h-5 w-5 mr-2 text-blue-500" />
          <span className="font-medium text-sm sm:text-base">PDF Document</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button onClick={toggleFullscreen} variant="outline" size="sm" className="h-8 w-8 p-0 sm:h-9 sm:w-9 sm:p-2">
            <Maximize className="h-4 w-4" />
            <span className="sr-only">Fullscreen</span>
          </Button>
          
          <Button onClick={downloadPDF} variant="outline" size="sm" className="h-8 w-8 p-0 sm:h-9 sm:w-9 sm:p-2">
            <Download className="h-4 w-4" />
            <span className="sr-only">Download</span>
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto bg-gray-200 p-4 rounded">
        {isLoading ? (
          <div className="flex justify-center items-center h-[600px]">
            <div className="space-y-4">
              <Skeleton className="h-8 w-40 mx-auto" />
              <Skeleton className="h-[500px] w-[400px]" />
              <Skeleton className="h-8 w-60 mx-auto" />
            </div>
          </div>
        ) : (
          <iframe 
            src={`${url}#toolbar=1&view=FitV&zoom=150${searchParam}`}
            className="w-full h-[400px] sm:h-[500px] md:h-[600px] lg:h-[800px] border-0"
            title="PDF Document Viewer"
          />
        )}
      </div>
    </div>
  );
}