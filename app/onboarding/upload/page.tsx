'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
  Download,
  AlertCircle
} from 'lucide-react';

interface UploadedFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error';
  progress: number;
  error?: string;
  documentId?: string;
}

export default function DocumentUploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [batchId, setBatchId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle drag events
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFilesSelected(droppedFiles);
  }, []);

  // Handle file selection
  const handleFilesSelected = (selectedFiles: File[]) => {
    const newFiles: UploadedFile[] = selectedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substring(7),
      status: 'pending',
      progress: 0
    }));

    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFilesSelected(Array.from(e.target.files));
    }
  };

  // Upload files
  const uploadFiles = async () => {
    setIsUploading(true);

    try {
      const formData = new FormData();
      
      files.forEach((fileObj, index) => {
        formData.append('files', fileObj.file);
      });

      // Add project context
      const projectId = localStorage.getItem('currentProjectId') || 'default';
      formData.append('projectId', projectId);

      // Upload request
      const response = await fetch('/api/upload/batch', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      setBatchId(result.data.batchId);

      // Monitor progress via WebSocket
      monitorUploadProgress(result.data.batchId);

    } catch (error: any) {
      console.error('Upload error:', error);
      setFiles(prev => prev.map(f => ({
        ...f,
        status: 'error',
        error: error.message
      })));
    } finally {
      setIsUploading(false);
    }
  };

  // Monitor upload progress
  const monitorUploadProgress = (batchId: string) => {
    // Connect to WebSocket for real-time progress
    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/upload/progress`);

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'subscribe', batchId }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'file-progress') {
        updateFileProgress(data.filename, data.progress, data.status);
      } else if (data.type === 'batch-complete') {
        ws.close();
        router.push(`/onboarding/assessment/${batchId}`);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      ws.close();
    };
  };

  // Update file progress
  const updateFileProgress = (filename: string, progress: number, status: string) => {
    setFiles(prev => prev.map(f => {
      if (f.file.name === filename) {
        return {
          ...f,
          progress,
          status: status as any
        };
      }
      return f;
    }));
  };

  // Remove file
  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  // Clear all
  const clearAll = () => {
    setFiles([]);
    setBatchId(null);
  };

  // File statistics
  const stats = {
    total: files.length,
    pending: files.filter(f => f.status === 'pending').length,
    processing: files.filter(f => f.status === 'processing' || f.status === 'uploading').length,
    complete: files.filter(f => f.status === 'complete').length,
    errors: files.filter(f => f.status === 'error').length
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Document Upload & Assessment</h1>
        <p className="text-muted-foreground">
          Upload your project documents for AI-powered maturity assessment
        </p>
      </div>

      {/* Upload Area */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Upload Documents</CardTitle>
          <CardDescription>
            Drag and drop files or click to browse. Supports PDF, DOCX, TXT, MD (max 100 files, 10MB each)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-gray-300 hover:border-primary/50'
            }`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium mb-2">
              {isDragging ? 'Drop files here' : 'Drag and drop files here'}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              or click to browse your computer
            </p>
            <Button variant="outline">
              Select Files
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.txt,.md"
              className="hidden"
              onChange={handleFileInputChange}
            />
          </div>

          {/* Statistics */}
          {files.length > 0 && (
            <div className="mt-6 grid grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <div className="text-sm text-muted-foreground">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.processing}</div>
                <div className="text-sm text-muted-foreground">Processing</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.complete}</div>
                <div className="text-sm text-muted-foreground">Complete</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
                <div className="text-sm text-muted-foreground">Errors</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Files ({files.length})</CardTitle>
              <div className="space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAll}
                  disabled={isUploading}
                >
                  Clear All
                </Button>
                <Button
                  onClick={uploadFiles}
                  disabled={isUploading || files.length === 0}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload All
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {files.map((fileObj) => (
                <div
                  key={fileObj.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <FileText className="h-8 w-8 text-blue-500" />
                    <div className="flex-1">
                      <div className="font-medium">{fileObj.file.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {(fileObj.file.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                      {fileObj.status === 'processing' && (
                        <Progress value={fileObj.progress} className="mt-2" />
                      )}
                      {fileObj.error && (
                        <div className="text-sm text-red-600 mt-1">{fileObj.error}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {fileObj.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(fileObj.id)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
                    {fileObj.status === 'processing' && (
                      <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                    )}
                    {fileObj.status === 'complete' && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                    {fileObj.status === 'error' && (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Alert */}
      <Alert className="mt-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Your documents will be converted to Markdown, classified by AI, and assessed for quality.
          This process typically takes 30-60 seconds per document.
        </AlertDescription>
      </Alert>
    </div>
  );
}

