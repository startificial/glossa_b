import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, FileText, FileAudio, FileVideo } from 'lucide-react';
import { DocumentReference } from './document-reference';
import { InputData } from '@/lib/types';

interface ReferenceDataTabProps {
  requirementId: number;
  projectId: number;
}

export function ReferenceDataTab({ requirementId, projectId }: ReferenceDataTabProps) {
  const [selectedInputData, setSelectedInputData] = useState<number | null>(null);
  
  // Fetch input data sources for this project
  const { 
    data: inputDataList, 
    isLoading,
    error 
  } = useQuery<InputData[]>({
    queryKey: [`/api/projects/${projectId}/input-data`],
  });
  
  // Get the selected input data details
  const selectedData = inputDataList?.find(item => item.id === selectedInputData);
  
  const getInputDataTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'audio':
        return <FileAudio className="h-4 w-4" />;
      case 'video':
        return <FileVideo className="h-4 w-4" />;
      case 'document':
      case 'text':
      case 'pdf':
      default:
        return <FileText className="h-4 w-4" />;
    }
  };
  
  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">Source Materials</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : error || !inputDataList || inputDataList.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              <p>No input data sources available.</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {inputDataList.map((item) => (
                <Button 
                  key={item.id}
                  variant={selectedInputData === item.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedInputData(item.id)}
                  className="flex items-center"
                >
                  {getInputDataTypeIcon(item.type)}
                  <span className="ml-2">{item.name}</span>
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {selectedInputData ? (
        <DocumentReference 
          requirementId={requirementId} 
          inputDataId={selectedInputData} 
        />
      ) : (
        <Card className="shadow-md py-10">
          <div className="text-center text-gray-500 flex flex-col items-center">
            <AlertCircle className="h-10 w-10 mb-2" />
            <p>Select a source material above to view reference data.</p>
          </div>
        </Card>
      )}
    </div>
  );
}