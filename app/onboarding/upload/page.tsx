'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MaturityCard } from '@/components/onboarding/MaturityCard';
import { MaturityJourneyIntro } from '@/components/onboarding/MaturityJourneyIntro';
import { UploadZone } from '@/components/onboarding/UploadZone';
import { maturityTheme } from '@/lib/theme/maturity-portal-theme';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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
  AlertCircle,
  Building,
  Sparkles
} from '@/components/ui/icons-shim';

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
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [showIntro, setShowIntro] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  // Assessment metadata (simplified - no project database link)
  const [assessmentName, setAssessmentName] = useState('');
  const [clientName, setClientName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [assessmentPurpose, setAssessmentPurpose] = useState('Initial Onboarding');

  // Require authentication - redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.error('Please register or log in to access the onboarding assessment');
      router.push('/auth/login?redirect=/onboarding/upload');
    }
  }, [isAuthenticated, authLoading, router]);

  // Check if first visit (only if authenticated)
  useEffect(() => {
    if (isAuthenticated) {
      const hasSeenIntro = localStorage.getItem('maturity_journey_intro_seen');
      if (!hasSeenIntro) {
        setShowIntro(true);
      }
    }
  }, [isAuthenticated]);

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render content if not authenticated
  if (!isAuthenticated) {
    return null;
  }

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
    if (!assessmentName.trim()) {
      alert('Please enter an assessment/project name');
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

      // Add assessment metadata (no project_id needed for potential clients)
      formData.append('assessmentName', assessmentName);
      formData.append('clientName', clientName);
      formData.append('organizationName', organizationName || clientName);
      formData.append('assessmentPurpose', assessmentPurpose);
      if (contactEmail) {
        formData.append('email', contactEmail);
      }

      // Upload request
      const response = await fetch('/api/onboarding/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || errorData.error || `Server error (${response.status})`;
        const errorCode = errorData.error?.code || 'UPLOAD_FAILED';
        
        // Specific error messages based on error code
        let userMessage = 'Upload failed. ';
        
        switch (errorCode) {
          case 'NO_FILES':
            userMessage += 'No files were selected. Please add files before uploading.';
            break;
          case 'FILE_TOO_LARGE':
            userMessage += 'One or more files exceed the 10MB size limit. Please use smaller files.';
            break;
          case 'UNSUPPORTED_FILE_TYPE':
            userMessage += 'Unsupported file type detected. Please use PDF, DOCX, TXT, or MD files only.';
            break;
          case 'MISSING_PROJECT_ID':
            userMessage += 'Assessment name is required. Please fill in the assessment details.';
            break;
          case 'FORBIDDEN':
            userMessage += 'Permission denied. Please contact support.';
            break;
          case 'AUTHENTICATION_REQUIRED':
            userMessage += 'Your session has expired. Please log in again.';
            break;
          default:
            userMessage += errorMessage;
        }
        
        alert(userMessage);
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      if (!result.success || !result.data) {
        throw new Error('Invalid response from server');
      }
      
      setBatchId(result.data.batch_id || result.data.batchId);

      // Monitor progress via WebSocket
      monitorUploadProgress(result.data.batch_id || result.data.batchId);

    } catch (error: any) {
      console.error('Upload error:', error);
      
      // Update UI to show error state
      setFiles(prev => prev.map(f => ({
        ...f,
        status: 'error',
        error: error.message || 'Failed to process file'
      })));
      
      // Show user-friendly error message if not already shown
      if (!error.message?.includes('Permission') && !error.message?.includes('session')) {
        alert(`Unable to start assessment.\n\nError: ${error.message}\n\nPlease check:\n• All required fields are filled\n• Files are valid (PDF, DOCX, TXT, MD)\n• File sizes are under 10MB\n• You're logged in\n\nIf the problem persists, please contact support.`);
      }
    } finally {
      setIsUploading(false);
    }
  };

  // Redirect to assessments after successful upload
  const monitorUploadProgress = (batchId: string) => {
    // Show success message
    alert(`✅ Upload started successfully!\n\n${files.length} documents are being processed.\n\nYou'll be redirected to the Assessments page where you can track progress.\n\nProcessing typically takes 2-3 minutes.\n\nBatch ID: ${batchId.substring(0, 8)}...`);
    
    // Redirect to assessments list immediately
    setTimeout(() => {
      router.push('/onboarding/assessments');
    }, 1500);
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

  const canUpload = assessmentName.trim() && clientName.trim() && files.length > 0;

  const handleIntroComplete = () => {
    setShowIntro(false);
    localStorage.setItem('maturity_journey_intro_seen', 'true');
  };

  return (
    <>
      {/* Educational Journey Modal */}
      {showIntro && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-auto">
            <MaturityJourneyIntro onComplete={handleIntroComplete} />
          </div>
        </div>
      )}

      <div 
        className="min-h-screen"
        style={{ 
          background: `linear-gradient(135deg, ${maturityTheme.colors.background.primary} 0%, ${maturityTheme.colors.background.secondary} 50%, ${maturityTheme.colors.background.tertiary} 100%)`,
        }}
      >
        <div className="container mx-auto p-6 max-w-6xl">
          {/* Hero Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8 text-center"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <Sparkles className="h-8 w-8" style={{ color: maturityTheme.colors.info.text }} />
              <h1 
                className="text-4xl font-bold"
                style={{ color: maturityTheme.colors.text.primary }}
              >
                Client Onboarding Assessment
              </h1>
            </div>
            <p 
              className="text-lg max-w-2xl mx-auto"
              style={{ color: maturityTheme.colors.text.secondary }}
            >
              Upload client documents for AI-powered portfolio maturity assessment. 
              Get instant insights into PM maturity levels, quality scores, and actionable recommendations.
            </p>
            
            <div className="flex gap-3 justify-center mt-6">
              <Button
                variant="outline"
                onClick={() => setShowIntro(true)}
                size="lg"
                className="shadow-lg"
                style={{
                  backgroundColor: maturityTheme.colors.info.bg,
                  borderColor: maturityTheme.colors.info.border,
                  color: maturityTheme.colors.info.text,
                }}
              >
                <Sparkles className="mr-2 h-5 w-5" />
                How It Works
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/onboarding/assessments')}
                size="lg"
                className="shadow-lg"
              >
                <FileText className="mr-2 h-5 w-5" />
                View Assessments
              </Button>
            </div>
          </motion.div>

        {/* Assessment Setup */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <MaturityCard variant="elevated" className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ color: maturityTheme.colors.text.primary }}>
                <Building className="h-5 w-5" />
                Client Assessment Details
              </CardTitle>
              <CardDescription style={{ color: maturityTheme.colors.text.secondary }}>
                For potential clients - no project setup required, just reference information
              </CardDescription>
            </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="assessmentName">Assessment/Project Name *</Label>
              <Input
                id="assessmentName"
                placeholder="e.g., ABC Corp PMO Assessment"
                value={assessmentName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAssessmentName(e.target.value)}
                className="font-medium"
              />
              <p className="text-xs text-muted-foreground">
                A reference name for this assessment (not linked to existing projects)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientName">Client/Contact Name *</Label>
              <Input
                id="clientName"
                placeholder="e.g., John Smith or ABC Corp"
                value={clientName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClientName(e.target.value)}
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrganizationName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Contact Email (optional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="e.g., contact@example.com"
                value={contactEmail}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContactEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                We'll send your assessment results here
              </p>
            </div>
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

          {/* Validation Alert */}
          {(!assessmentName.trim() || !clientName.trim()) && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please enter an assessment name and client name to begin.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
          </MaturityCard>
        </motion.div>

        {/* Upload Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <MaturityCard variant="info" glow className="mb-6">
            <CardHeader>
              <CardTitle style={{ color: maturityTheme.colors.text.primary }}>Upload Documents</CardTitle>
              <CardDescription style={{ color: maturityTheme.colors.text.secondary }}>
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
          </MaturityCard>
        </motion.div>

        {/* File List */}
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <MaturityCard variant="success" hover>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle style={{ color: maturityTheme.colors.text.primary }}>
                    Files ({files.length})
                  </CardTitle>
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
            </MaturityCard>
          </motion.div>
        )}

        {/* Info Alert */}
        <Alert className="mt-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Your documents will be converted to Markdown, classified by AI, and assessed for quality.
          This process typically takes 30-60 seconds per document.
        </AlertDescription>
      </Alert>

      {/* Troubleshooting */}
      {stats.errors > 0 && (
        <Alert className="mt-4" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>{stats.errors} upload{stats.errors > 1 ? 's' : ''} failed.</strong>
            <br /><br />
            <strong>Common issues:</strong>
            <ul className="list-disc ml-4 mt-2">
              <li>Not logged in - <a href="/auth/login" className="underline">Click here to login</a></li>
              <li>Files too large - Maximum 10MB per file</li>
              <li>Wrong file type - Only PDF, DOCX, TXT, MD allowed</li>
              <li>Missing required fields - Check Assessment Name and Client Name are filled</li>
              <li>Server issue - Check browser console (F12) for details</li>
            </ul>
            <br />
            <strong>What to do:</strong>
            <ol className="list-decimal ml-4 mt-2">
              <li>Open browser console (press F12)</li>
              <li>Look for red error messages</li>
              <li>Share the error with support</li>
              <li>Or try refreshing the page and logging in again</li>
            </ol>
          </AlertDescription>
        </Alert>
      )}
        </div>
      </div>
    </>
  );
}

