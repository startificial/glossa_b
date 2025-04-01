import { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { TextHighlight } from './text-highlight';

// Set pdf.js worker source
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

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
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Create an array of highlight objects grouped by page
  const highlightsByPage = highlights.reduce<Record<number, typeof highlights>>((acc, highlight) => {
    const page = highlight.pageNumber || 1;
    if (!acc[page]) {
      acc[page] = [];
    }
    acc[page].push(highlight);
    return acc;
  }, {});

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Jump to the page with highlights if provided
  useEffect(() => {
    if (highlights && highlights.length > 0) {
      // Find the first highlight and navigate to that page
      const firstHighlightPage = highlights[0].pageNumber || 1;
      setPageNumber(firstHighlightPage);
    }
  }, [highlights]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setIsLoading(false);
    if (onLoad) onLoad();
  }

  function changePage(offset: number) {
    if (numPages) {
      setPageNumber(prevPageNumber => {
        const newPageNumber = prevPageNumber + offset;
        return Math.max(1, Math.min(numPages, newPageNumber));
      });
    }
  }

  function previousPage() {
    changePage(-1);
  }

  function nextPage() {
    changePage(1);
  }

  function zoomIn() {
    setScale(prevScale => Math.min(prevScale + 0.2, 3));
  }

  function zoomOut() {
    setScale(prevScale => Math.max(prevScale - 0.2, 0.5));
  }

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

  return (
    <div 
      ref={containerRef} 
      className={`flex flex-col ${isFullscreen ? 'fixed inset-0 bg-white z-50 p-4' : 'relative bg-gray-100 rounded-lg p-2'}`}
    >
      <div className="flex items-center justify-between mb-2 bg-white rounded p-2 sticky top-0 z-10">
        <div className="flex items-center space-x-2">
          <Button 
            onClick={previousPage} 
            disabled={pageNumber <= 1} 
            variant="outline" 
            size="sm"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center">
            <Input
              className="w-14 h-8 text-center"
              value={pageNumber}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (numPages && !isNaN(value) && value >= 1 && value <= numPages) {
                  setPageNumber(value);
                }
              }}
            />
            <span className="mx-1 text-sm">of {numPages}</span>
          </div>
          
          <Button 
            onClick={nextPage} 
            disabled={numPages !== null && pageNumber >= numPages} 
            variant="outline" 
            size="sm"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button onClick={zoomOut} variant="outline" size="sm">
            <ZoomOut className="h-4 w-4" />
          </Button>
          
          <div className="w-24">
            <Slider
              value={[scale * 100]}
              min={50}
              max={300}
              step={10}
              onValueChange={(value) => setScale(value[0] / 100)}
            />
          </div>
          
          <Button onClick={zoomIn} variant="outline" size="sm">
            <ZoomIn className="h-4 w-4" />
          </Button>
          
          <Button onClick={toggleFullscreen} variant="outline" size="sm">
            <Maximize className="h-4 w-4" />
          </Button>
          
          <Button onClick={downloadPDF} variant="outline" size="sm">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto bg-gray-200 p-4 rounded">
        {isLoading && (
          <div className="flex justify-center items-center h-[600px]">
            <div className="space-y-4">
              <Skeleton className="h-8 w-40 mx-auto" />
              <Skeleton className="h-[500px] w-[400px]" />
              <Skeleton className="h-8 w-60 mx-auto" />
            </div>
          </div>
        )}
        
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={(error: Error) => {
            console.error("Error loading PDF:", error);
            setIsLoading(false);
            toast({
              title: "Error",
              description: "Failed to load PDF document. Please try again later.",
              variant: "destructive",
            });
          }}
          className="flex justify-center"
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            rotate={rotation}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            className="relative"
          >
            {/* Show highlights for current page */}
            {highlightsByPage[pageNumber]?.map((highlight, index) => (
              <TextHighlight
                key={index}
                text={highlight.text}
                color={highlight.color || "rgba(255, 255, 0, 0.4)"}
              />
            ))}
          </Page>
        </Document>
      </div>
    </div>
  );
}