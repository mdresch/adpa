'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
  Download,
  AlertCircle,
  Plus,
  Building2,
  Briefcase
} from 'lucide-react';

interface UploadedFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error';
  progress: number;
  error?: string;
  documentId?: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
}

export default function DocumentUploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [batchId, setBatchId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Assessment metadata
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [clientName, setClientName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [assessmentPurpose, setAssessmentPurpose] = useState('');
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  
  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []);
  
  const loadProjects = async () => {
    try {
      const response = await fetch('/api/projects', {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setProjects(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };
  
  const createNewProject = async () => {
    if (!newProjectName.trim()) return;
    
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjectName,
          description: newProjectDescription
        }),
        credentials: 'include'
      });
      
      const data = await response.json();
      if (data.success) {
        setProjects(prev => [...prev, data.data]);
        setSelectedProject(data.data.id);
        setShowNewProjectForm(false);
        setNewProjectName('');
        setNewProjectDescription('');
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Failed to create project');
    }
  };

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
    // Validation
    if (!selectedProject) {
      alert('Please select or create a project first');
      return;
    }
    
    if (!clientName.trim()) {
      alert('Please enter a client name');
      return;
    }
    
    if (files.length === 0) {
      alert('Please select files to upload');
      return;
    }
    
    setIsUploading(true);

    try {
      const formData = new FormData();
      
      files.forEach((fileObj, index) => {
        formData.append('files', fileObj.file);
      });

      // Add project and assessment metadata
      formData.append('projectId', selectedProject);
      formData.append('clientName', clientName);
      formData.append('organizationName', organizationName || clientName);
      formData.append('assessmentPurpose', assessmentPurpose || 'Portfolio Maturity Assessment');

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

  const canUpload = selectedProject && clientName.trim() && files.length > 0;

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Client Onboarding Assessment</h1>
        <p className="text-muted-foreground">
          Upload client documents for AI-powered portfolio maturity assessment
        </p>
      </div>

      {/* Assessment Setup */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Assessment Details
          </CardTitle>
          <CardDescription>
            Provide client and project information for this assessment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Project Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project">Select Project *</Label>
              {!showNewProjectForm ? (
                <div className="flex gap-2">
                  <Select value={selectedProject} onValueChange={setSelectedProject}>
                    <SelectTrigger id="project">
                      <SelectValue placeholder="Choose a project..." />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowNewProjectForm(true)}
                    title="Create new project"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 p-4 border rounded-lg">
                  <Input
                    placeholder="New project name"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                  />
                  <Textarea
                    placeholder="Project description (optional)"
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button onClick={createNewProject} size="sm">
                      Create Project
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowNewProjectForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientName">Client/Contact Name *</Label>
              <Input
                id="clientName"
                placeholder="e.g., John Smith or ABC Corp"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="organization">Organization Name</Label>
              <Input
                id="organization"
                placeholder="e.g., ABC Corporation"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="purpose">Assessment Purpose</Label>
              <Select value={assessmentPurpose} onValueChange={setAssessmentPurpose}>
                <SelectTrigger id="purpose">
                  <SelectValue placeholder="Select purpose..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Initial Onboarding">Initial Client Onboarding</SelectItem>
                  <SelectItem value="Annual Review">Annual Maturity Review</SelectItem>
                  <SelectItem value="Pre-Engagement">Pre-Engagement Assessment</SelectItem>
                  <SelectItem value="Compliance Audit">Compliance Audit</SelectItem>
                  <SelectItem value="Gap Analysis">Gap Analysis</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Validation Alert */}
          {(!selectedProject || !clientName.trim()) && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please select a project and enter a client name before uploading documents.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

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
                  disabled={isUploading || !canUpload}
                  title={!canUpload ? 'Select project and enter client name first' : ''}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Start Assessment
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

