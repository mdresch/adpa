'use client';

import { useState, useRef } from 'react';
import { Upload, File, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/lib/notify';
import { useAuth } from '@/contexts/AuthContext';

interface UploadedDocument {
  id: string;
  filename: string;
  format: string;
  parsing_confidence: number;
  sections_count: number;
  word_count: number;
  character_count: number;
  status: 'uploading' | 'processing' | 'success' | 'error';
  error?: string;
  progress?: number;
}

interface DocumentUploaderProps {
  projectId: string;
  onUploadComplete?: (document: UploadedDocument) => void;
  maxFiles?: number;
}

const SUPPORTED_FORMATS = ['PDF', 'DOCX', 'XLSX', 'TXT'];
const MAX_FILE_SIZE_MB = 100;

export function DocumentUploader({
  projectId,
  onUploadComplete,
  maxFiles = 5,
}: DocumentUploaderProps) {
  const { token } = useAuth();
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);

    // Validate files
    const validationErrors: string[] = [];
    const validFiles: File[] = [];

    for (const file of fileArray) {
      const validation = validateFile(file);
      if (!validation.valid) {
        validationErrors.push(`${file.name}: ${validation.error}`);
      } else {
        validFiles.push(file);
      }
    }

    if (validationErrors.length > 0) {
      validationErrors.forEach((err) => toast.error(err));
    }

    if (validFiles.length === 0) return;

    // Upload files
    setIsUploading(true);

    for (const file of validFiles) {
      const docId = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const newDoc: UploadedDocument = {
        id: docId,
        filename: file.name,
        format: getFileFormat(file.name),
        parsing_confidence: 0,
        sections_count: 0,
        word_count: 0,
        character_count: 0,
        status: 'uploading',
        progress: 0,
      };

      setDocuments((prev) => [...prev, newDoc]);

      try {
        // Create form data
        const formData = new FormData();
        formData.append('files', file);

        // Upload
        const response = await fetch(
          `/api/documents/upload?projectId=${projectId}`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Upload failed');
        }

        const result = await response.json();

        if (result.success) {
          setDocuments((prev) =>
            prev.map((doc) =>
              doc.id === docId
                ? {
                    ...result.document,
                    id: result.document.id,
                    status: 'processing',
                    progress: 100,
                  }
                : doc
            )
          );

          toast.success(`${file.name} uploaded successfully`);

          // Call callback
          if (onUploadComplete) {
            onUploadComplete({
              ...result.document,
              status: 'processing',
            });
          }

          // Poll for processing completion
          pollProcessingStatus(result.document.id, docId);
        } else {
          throw new Error(result.error || 'Upload failed');
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        setDocuments((prev) =>
          prev.map((doc) =>
            doc.id === docId
              ? { ...doc, status: 'error', error: errorMsg }
              : doc
          )
        );
        toast.error(errorMsg);
      }
    }

    setIsUploading(false);

    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const pollProcessingStatus = async (documentId: string, tempId: string) => {
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes with 5-second intervals

    const poll = async () => {
      try {
        const response = await fetch(
          `/api/documents/upload?documentId=${documentId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) throw new Error('Failed to get status');

        const data = await response.json();
        const status = data.ingestion?.status;

        if (status === 'completed') {
          setDocuments((prev) =>
            prev.map((doc) =>
              doc.id === tempId
                ? { ...doc, status: 'success' }
                : doc
            )
          );
        } else if (status === 'failed') {
          setDocuments((prev) =>
            prev.map((doc) =>
              doc.id === tempId
                ? {
                    ...doc,
                    status: 'error',
                    error: data.ingestion?.error_message || 'Processing failed',
                  }
                : doc
            )
          );
        } else if (attempts < maxAttempts && status !== 'completed') {
          attempts++;
          setTimeout(poll, 5000); // Poll every 5 seconds
        }
      } catch (error) {
        console.error('Failed to poll processing status', error);
      }
    };

    poll();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card
        className={`border-2 border-dashed transition-colors cursor-pointer ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="p-8 text-center">
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-1">Upload Documents</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Drag and drop files here or click to browse
          </p>
          <p className="text-xs text-muted-foreground">
            Supported formats: {SUPPORTED_FORMATS.join(', ')} • Max {MAX_FILE_SIZE_MB}MB per file
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={SUPPORTED_FORMATS.map((f) => `.${f.toLowerCase()}`).join(',')}
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />
        </div>
      </Card>

      {/* Uploaded Documents List */}
      {documents.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold">Uploaded Documents</h3>
          {documents.map((doc) => (
            <DocumentUploadItem key={doc.id} document={doc} />
          ))}
        </div>
      )}

      {/* Info Alert */}
      {documents.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Uploaded documents will be parsed and their content indexed for semantic search and entity extraction.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

interface DocumentUploadItemProps {
  document: UploadedDocument;
}

function DocumentUploadItem({ document }: DocumentUploadItemProps) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 mt-1">
          <File className="h-5 w-5 text-muted-foreground" />
        </div>

        <div className="flex-grow min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-medium truncate">{document.filename}</h4>
            <Badge variant="outline" className="flex-shrink-0">
              {document.format}
            </Badge>

            {document.status === 'success' && (
              <Badge variant="default" className="flex-shrink-0 bg-green-600">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Processed
              </Badge>
            )}
            {document.status === 'error' && (
              <Badge variant="destructive" className="flex-shrink-0">
                Error
              </Badge>
            )}
            {document.status === 'processing' && (
              <Badge variant="secondary" className="flex-shrink-0">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Processing
              </Badge>
            )}
            {document.status === 'uploading' && (
              <Badge variant="secondary" className="flex-shrink-0">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Uploading
              </Badge>
            )}
          </div>

          {document.status === 'uploading' && (
            <div className="mb-3">
              <Progress value={document.progress || 0} className="h-1" />
            </div>
          )}

          {document.status === 'success' && (
            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                Confidence: {(document.parsing_confidence * 100).toFixed(0)}% • Sections: {document.sections_count}
              </p>
              <p>
                {document.word_count.toLocaleString()} words • {document.character_count.toLocaleString()} characters
              </p>
            </div>
          )}

          {document.status === 'error' && document.error && (
            <p className="text-sm text-destructive">{document.error}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return {
      valid: false,
      error: `File exceeds ${MAX_FILE_SIZE_MB}MB limit`,
    };
  }

  const ext = file.name.split('.').pop()?.toLowerCase();
  const supportedExts = ['pdf', 'docx', 'xlsx', 'txt', 'xls', 'csv'];

  if (!ext || !supportedExts.includes(ext)) {
    return {
      valid: false,
      error: `Unsupported format: ${ext}`,
    };
  }

  return { valid: true };
}

function getFileFormat(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const formatMap: Record<string, string> = {
    pdf: 'PDF',
    docx: 'DOCX',
    doc: 'DOCX',
    xlsx: 'XLSX',
    xls: 'XLSX',
    csv: 'XLSX',
    txt: 'TXT',
    text: 'TXT',
  };
  return formatMap[ext || ''] || 'Unknown';
}
