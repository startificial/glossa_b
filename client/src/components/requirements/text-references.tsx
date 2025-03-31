import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { TextReference } from '@/lib/types';

interface TextReferencesProps {
  references?: TextReference[];
}

export function TextReferences({ references }: TextReferencesProps) {
  const [activeReference, setActiveReference] = useState<TextReference | null>(null);

  if (!references || references.length === 0) {
    return null;
  }

  const handleReferenceClick = (reference: TextReference) => {
    setActiveReference(reference);
  };

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-2">Text References</h3>
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              {activeReference ? (
                <div className="w-full">
                  <div className="rounded-md border p-4 bg-muted/20">
                    {activeReference.contextBefore && (
                      <p className="text-muted-foreground mb-2 text-sm">
                        {activeReference.contextBefore}
                      </p>
                    )}
                    <p className="font-medium bg-primary/10 p-2 rounded border-l-4 border-primary">
                      {activeReference.text}
                    </p>
                    {activeReference.contextAfter && (
                      <p className="text-muted-foreground mt-2 text-sm">
                        {activeReference.contextAfter}
                      </p>
                    )}
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    <p>
                      Characters {activeReference.startPosition} - {activeReference.endPosition}
                      {activeReference.relevance !== undefined && 
                        ` (${Math.round(activeReference.relevance * 100)}% relevance)`}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-muted rounded-md p-10">
                  <p className="text-muted-foreground">Select a text reference to view</p>
                </div>
              )}
            </div>
            <div className="lg:col-span-1">
              <h4 className="text-sm font-medium mb-3">Available References</h4>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {references.map((reference) => (
                  <TextReferenceItem 
                    key={reference.id} 
                    reference={reference} 
                    isActive={activeReference?.id === reference.id}
                    onClick={() => handleReferenceClick(reference)}
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

interface TextReferenceItemProps {
  reference: TextReference;
  isActive: boolean;
  onClick: () => void;
}

function TextReferenceItem({ reference, isActive, onClick }: TextReferenceItemProps) {
  const relevancePercentage = reference.relevance ? Math.round(reference.relevance * 100) : 50;
  const previewText = reference.text.length > 100 ? 
    `${reference.text.substring(0, 100)}...` : reference.text;
  
  return (
    <div 
      className={`flex flex-col gap-2 p-2 rounded-md cursor-pointer transition-colors ${
        isActive ? 'bg-primary/10 border-l-4 border-primary' : 'hover:bg-muted border'
      }`}
      onClick={onClick}
    >
      <p className="text-sm font-medium">{previewText}</p>
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