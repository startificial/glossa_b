import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { VideoScene } from '@/lib/types';

interface VideoScenesProps {
  scenes?: VideoScene[];
}

export function VideoScenes({ scenes }: VideoScenesProps) {
  const [activeScene, setActiveScene] = useState<VideoScene | null>(null);

  if (!scenes || scenes.length === 0) {
    return null;
  }

  const handleSceneClick = (scene: VideoScene) => {
    setActiveScene(scene);
  };

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-2">Video Scenes</h3>
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              {activeScene ? (
                <div className="w-full">
                  <div className="rounded-md overflow-hidden bg-black aspect-video">
                    <video
                      src={activeScene.clipPath}
                      controls
                      className="w-full h-full"
                      poster={activeScene.thumbnailPath}
                    />
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    <p className="font-medium">{activeScene.label}</p>
                    <p>
                      {formatTimestamp(activeScene.startTime)} - {formatTimestamp(activeScene.endTime)} 
                      ({(activeScene.endTime - activeScene.startTime).toFixed(1)}s)
                    </p>
                  </div>
                </div>
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-muted rounded-md aspect-video">
                  <p className="text-muted-foreground">Select a scene to view</p>
                </div>
              )}
            </div>
            <div className="lg:col-span-1">
              <h4 className="text-sm font-medium mb-3">Available Scenes</h4>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {scenes.map((scene) => (
                  <SceneItem 
                    key={scene.id} 
                    scene={scene} 
                    isActive={activeScene?.id === scene.id}
                    onClick={() => handleSceneClick(scene)}
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

interface SceneItemProps {
  scene: VideoScene;
  isActive: boolean;
  onClick: () => void;
}

function SceneItem({ scene, isActive, onClick }: SceneItemProps) {
  const relevancePercentage = scene.relevance ? Math.round(scene.relevance * 100) : 50;
  
  return (
    <div 
      className={`flex gap-3 p-2 rounded-md cursor-pointer transition-colors ${
        isActive ? 'bg-primary/10 border-l-4 border-primary' : 'hover:bg-muted'
      }`}
      onClick={onClick}
    >
      <div className="flex-shrink-0 w-24 h-16 rounded overflow-hidden">
        {scene.thumbnailPath ? (
          <img 
            src={scene.thumbnailPath} 
            alt={scene.label} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
            No Preview
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{scene.label}</p>
        <p className="text-xs text-muted-foreground">
          {formatTimestamp(scene.startTime)} - {formatTimestamp(scene.endTime)}
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
    </div>
  );
}

function formatTimestamp(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}