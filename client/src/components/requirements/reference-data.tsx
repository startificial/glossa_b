import React from 'react';
import { Requirement, InputData } from '@/lib/types';
import { VideoScenes } from './video-scenes';
import { TextReferences } from './text-references';
import { AudioTimestamps } from './audio-timestamps';
import { FileText, Video, AudioWaveform, FileQuestion } from 'lucide-react';

interface ReferenceDataProps {
  requirement: Requirement;
  inputData?: InputData | null;
}

export function ReferenceData({ requirement, inputData }: ReferenceDataProps) {
  // Early return if no input data or references
  if (!requirement.inputDataId || (!requirement.videoScenes?.length && !requirement.textReferences?.length && !requirement.audioTimestamps?.length)) {
    const icon = getSourceIcon(inputData?.type || '');
    const IconComponent = icon.component;
    
    return (
      <div className="text-center py-6 text-muted-foreground">
        <IconComponent className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No reference data available for this requirement</p>
        <p className="text-sm mt-2">
          {inputData 
            ? `References are automatically detected when a requirement is generated from ${inputData.type} input data.` 
            : 'This requirement may have been created manually or without source references.'}
        </p>
      </div>
    );
  }

  // Determine what references we have
  const hasVideoScenes = requirement.videoScenes && requirement.videoScenes.length > 0;
  const hasTextReferences = requirement.textReferences && requirement.textReferences.length > 0;
  const hasAudioTimestamps = requirement.audioTimestamps && requirement.audioTimestamps.length > 0;

  return (
    <div className="space-y-6">
      {/* Text References */}
      {hasTextReferences && (
        <TextReferences references={requirement.textReferences} />
      )}

      {/* Audio Timestamps */}
      {hasAudioTimestamps && (
        <AudioTimestamps timestamps={requirement.audioTimestamps} />
      )}

      {/* Video Scenes */}
      {hasVideoScenes && (
        <VideoScenes scenes={requirement.videoScenes} />
      )}
      
      {/* Fallback if we have inputDataId but no references */}
      {!hasVideoScenes && !hasTextReferences && !hasAudioTimestamps && (
        <div className="text-center py-6 text-muted-foreground">
          <p>This requirement was generated from source data, but no specific references were extracted.</p>
        </div>
      )}
    </div>
  );
}

function getSourceIcon(type: string) {
  switch (type.toLowerCase()) {
    case 'text':
    case 'pdf':
    case 'doc':
    case 'docx':
      return { 
        component: FileText, 
        label: 'Document' 
      };
    case 'video':
    case 'mp4':
    case 'mov':
      return { 
        component: Video, 
        label: 'Video' 
      };
    case 'audio':
    case 'mp3':
    case 'wav':
      return { 
        component: AudioWaveform,
        label: 'Audio'
      };
    default:
      return { 
        component: FileQuestion, 
        label: 'Source Data' 
      };
  }
}