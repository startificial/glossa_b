import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AudioTimestamp } from '@/lib/types';
import { Play, Pause } from 'lucide-react';

interface AudioTimestampsProps {
  timestamps?: AudioTimestamp[];
}

export function AudioTimestamps({ timestamps }: AudioTimestampsProps) {
  const [activeTimestamp, setActiveTimestamp] = useState<AudioTimestamp | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  if (!timestamps || timestamps.length === 0) {
    return null;
  }

  const handleTimestampClick = (timestamp: AudioTimestamp) => {
    setActiveTimestamp(timestamp);
    setIsPlaying(false);
    
    // Reset audio player if exists
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-2">Audio Timestamps</h3>
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              {activeTimestamp ? (
                <div className="w-full">
                  <div className="rounded-md border p-4 bg-muted/20">
                    {activeTimestamp.transcript && (
                      <p className="font-medium">
                        "{activeTimestamp.transcript}"
                      </p>
                    )}
                    
                    {activeTimestamp.audioClipPath && (
                      <div className="mt-4">
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="w-10 h-10 p-0 rounded-full"
                            onClick={togglePlay}
                          >
                            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          <audio 
                            ref={audioRef}
                            src={activeTimestamp.audioClipPath}
                            onEnded={handleAudioEnded}
                            className="hidden"
                          />
                          <div className="text-sm">
                            {formatTimestamp(activeTimestamp.startTime)} - {formatTimestamp(activeTimestamp.endTime)}
                            <span className="text-muted-foreground ml-2">
                              ({(activeTimestamp.endTime - activeTimestamp.startTime).toFixed(1)}s)
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    <p>
                      Time range: {formatTimestamp(activeTimestamp.startTime)} - {formatTimestamp(activeTimestamp.endTime)}
                      {activeTimestamp.relevance !== undefined && 
                        ` (${Math.round(activeTimestamp.relevance * 100)}% relevance)`}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-muted rounded-md p-10">
                  <p className="text-muted-foreground">Select an audio timestamp to view</p>
                </div>
              )}
            </div>
            <div className="lg:col-span-1">
              <h4 className="text-sm font-medium mb-3">Available Timestamps</h4>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {timestamps.map((timestamp) => (
                  <AudioTimestampItem 
                    key={timestamp.id} 
                    timestamp={timestamp} 
                    isActive={activeTimestamp?.id === timestamp.id}
                    onClick={() => handleTimestampClick(timestamp)}
                  />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface AudioTimestampItemProps {
  timestamp: AudioTimestamp;
  isActive: boolean;
  onClick: () => void;
}

function AudioTimestampItem({ timestamp, isActive, onClick }: AudioTimestampItemProps) {
  const relevancePercentage = timestamp.relevance ? Math.round(timestamp.relevance * 100) : 50;
  const previewText = timestamp.transcript 
    ? (timestamp.transcript.length > 60 ? `${timestamp.transcript.substring(0, 60)}...` : timestamp.transcript)
    : `Audio at ${formatTimestamp(timestamp.startTime)}`;
  
  return (
    <div 
      className={`flex flex-col gap-2 p-2 rounded-md cursor-pointer transition-colors ${
        isActive ? 'bg-primary/10 border-l-4 border-primary' : 'hover:bg-muted border'
      }`}
      onClick={onClick}
    >
      <p className="text-sm font-medium">{previewText}</p>
      <p className="text-xs text-muted-foreground">
        {formatTimestamp(timestamp.startTime)} - {formatTimestamp(timestamp.endTime)}
      </p>
      <div className="flex items-center gap-1 mt-1">
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary" 
            style={{ width: `${relevancePercentage}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">{relevancePercentage}%</span>
      </div>
    </div>
  );
}

function formatTimestamp(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}