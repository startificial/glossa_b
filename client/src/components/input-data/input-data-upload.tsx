import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatBytes } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, X } from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface InputDataUploadProps {
  projectId: number;
  onUploaded?: () => void;
}

export function InputDataUpload({ projectId, onUploaded }: InputDataUploadProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [contentType, setContentType] = useState<string>("general");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('contentType', contentType);
      
      // Custom implementation using XMLHttpRequest to track progress
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentCompleted = Math.round((event.loaded * 100) / event.total);
            setUploadProgress(percentCompleted);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.response));
            } catch (error) {
              reject(new Error(`Failed to parse response: ${error instanceof Error ? error.message : 'Unknown error'}`));
            }
          } else {
            let errorMessage = `Upload failed with status ${xhr.status}`;
            try {
              const errorResponse = JSON.parse(xhr.response);
              if (errorResponse.message) {
                errorMessage = errorResponse.message;
              }
            } catch (e) {
              // Ignore parsing error, use default message
            }
            reject(new Error(errorMessage));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'));
        });

        xhr.open('POST', `/api/projects/${projectId}/input-data`);
        xhr.send(formData);
      });
    },
    onSuccess: (response) => {
      setSelectedFile(null);
      setUploadProgress(0);
      
      toast({
        title: 'Upload successful',
        description: 'Your file has been uploaded and is being processed.',
      });
      
      // Invalidate the query to refresh the input data list
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/input-data`] });
      
      // Notify parent component that upload is completed
      onUploaded?.();
    },
    onError: (error) => {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setUploading(false);
    },
  });

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0] && !uploading) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && !uploading) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (selectedFile && !uploading) {
      setUploading(true);
      setUploadProgress(0);
      uploadMutation.mutate(selectedFile);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Input Data</CardTitle>
        <CardDescription>
          Upload files to generate requirements. Supported formats: audio, video, text, and transcripts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 space-y-2">
          <Label htmlFor="content-type">Content Type</Label>
          <Select 
            value={contentType} 
            onValueChange={setContentType} 
            disabled={uploading}
          >
            <SelectTrigger id="content-type" className="w-full">
              <SelectValue placeholder="Select content type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="workflow">Workflow Documentation</SelectItem>
              <SelectItem value="user_feedback">User Feedback</SelectItem>
              <SelectItem value="technical_documentation">Technical Documentation</SelectItem>
              <SelectItem value="specifications">Specifications</SelectItem>
              <SelectItem value="general">General</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Selecting the appropriate content type helps generate more accurate requirements.
          </p>
        </div>
      
        <div
          className={`max-w-lg mx-auto flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md cursor-pointer ${
            dragActive
              ? "border-primary bg-primary/5"
              : "border-gray-300 dark:border-gray-600"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => {
            if (!uploading) {
              triggerFileInput();
            }
          }}
        >
          <div className="space-y-3 text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div className="flex justify-center text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium text-primary hover:text-blue-500">
                Upload a file
              </span>
              <p className="pl-1">or drag and drop</p>
              <input
                id="file-upload"
                name="file-upload"
                type="file"
                className="sr-only"
                ref={fileInputRef}
                onChange={handleFileChange}
                disabled={uploading}
                onClick={(e) => e.stopPropagation()} 
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Audio, video, PDF, TXT up to 150MB
            </p>
          </div>
        </div>

        {selectedFile && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="text-sm font-medium">{selectedFile.name}</div>
                <div className="ml-2 text-xs text-gray-500">{formatBytes(selectedFile.size)}</div>
              </div>
              {!uploading && (
                <Button size="icon" variant="ghost" onClick={removeSelectedFile}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {uploading && (
              <div className="mt-2">
                <Progress value={uploadProgress} className="h-2" />
                <div className="mt-1 text-xs text-right text-gray-500">{uploadProgress}%</div>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => onUploaded?.()}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
        >
          {uploading ? "Uploading..." : "Upload File"}
        </Button>
      </CardFooter>
    </Card>
  );
}
