'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { getApiUrl } from '@/lib/api-url';
import { RegistrationDialog } from '@/components/onboarding/RegistrationDialog';
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
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [showIntro, setShowIntro] = useState(false);
  const [showRegistrationDialog, setShowRegistrationDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  // Assessment metadata (simplified - no project database link)
  const [assessmentName, setAssessmentName] = useState('');
  const [clientName, setClientName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [assessmentPurpose, setAssessmentPurpose] = useState('Initial Onboarding');

  // Populate fields from logged-in user when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      // Set contact name from user's name
      if (!clientName && user.name) {
        setClientName(user.name);
      }
      
      // Set contact email from user's email
      if (!contactEmail && user.email) {
        setContactEmail(user.email);
      }
      
      // Set organization name from user's metadata (company_name)
      if (!organizationName && user.metadata) {
        try {
          const metadata = typeof user.metadata === 'string' 
            ? JSON.parse(user.metadata) 
            : user.metadata;
          if (metadata?.company_name) {
            setOrganizationName(metadata.company_name);
          }
        } catch (e) {
          // If parsing fails, ignore
          console.warn('Failed to parse user metadata:', e);
        }
      }
    }
  }, [isAuthenticated, user, clientName, contactEmail, organizationName]);

  // Require authentication - show registration dialog if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      // Show registration dialog instead of redirecting
      setShowRegistrationDialog(true);
    }
  }, [isAuthenticated, authLoading]);

  // Check if first visit (only if authenticated)
  useEffect(() => {
    if (isAuthenticated) {
      const hasSeenIntro = localStorage.getItem('maturity_journey_intro_seen');
      if (!hasSeenIntro) {
        setShowIntro(true);
      }
    }
  }, [isAuthenticated]);

  // Handle file selection - must be defined before useCallback hooks that use it
  const handleFilesSelected = useCallback((selectedFiles: File[]) => {
    const newFiles: UploadedFile[] = selectedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substring(7),
      status: 'pending',
      progress: 0
    }));

    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  // Handle drag events - ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
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
  }, [handleFilesSelected]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFilesSelected(Array.from(e.target.files));
    }
  }, [handleFilesSelected]);

  // Upload files
  const uploadFiles = async () => {
    // Verify authentication first
    if (!isAuthenticated) {
      toast.error('Please log in to upload files');
      router.push('/auth/login?redirect=/onboarding/upload');
      return;
    }

    const token = localStorage.getItem('auth_token');
    if (!token) {
      toast.error('Authentication token missing. Please log in again.');
      router.push('/auth/login?redirect=/onboarding/upload');
      return;
    }

    // Form validation
    if (!assessmentName.trim()) {
      toast.error('Please enter an assessment/project name');
      return;
    }
    
    if (!clientName.trim()) {
      toast.error('Please enter a client name');
      return;
    }
    
    if (files.length === 0) {
      toast.error('Please select at least one file to upload');
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

      // Get authentication token
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Authentication required. Please log in.');
        router.push('/auth/login?redirect=/onboarding/upload');
        return;
      }

      // Upload request with authentication
      const response = await fetch(getApiUrl('/onboarding/upload'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
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
    // Calculate estimated processing time (2-3 minutes per file, minimum 2 minutes)
    const estimatedMinutes = Math.max(2, Math.ceil(files.length * 2.5));
    
    // Show success toast with better formatting
    toast.success(
      `Upload started successfully! ${files.length} document${files.length > 1 ? 's' : ''} ${files.length > 1 ? 'are' : 'is'} being processed.`,
      {
        description: `Estimated processing time: ${estimatedMinutes} minute${estimatedMinutes > 1 ? 's' : ''}. You'll be redirected to track progress.`,
        duration: 5000,
      }
    );
    
    // Redirect to assessments list after a short delay
    setTimeout(() => {
      router.push('/onboarding/assessments');
    }, 2000);
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

  // Check if upload is allowed (authentication + form validation)
  const canUpload = isAuthenticated && assessmentName.trim() && clientName.trim() && files.length > 0;

  const handleIntroComplete = () => {
    setShowIntro(false);
    localStorage.setItem('maturity_journey_intro_seen', 'true');
  };

  // Show loading state while checking authentication (AFTER all hooks)
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p style={{ color: maturityTheme.colors.text.secondary }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Registration Dialog - shown when not authenticated */}
      <RegistrationDialog
        open={showRegistrationDialog && !isAuthenticated}
        onOpenChange={(open) => {
          setShowRegistrationDialog(open);
          // If dialog is closed and user is still not authenticated, redirect to login
          if (!open && !isAuthenticated) {
            router.push('/auth/login?redirect=/onboarding/upload');
          }
        }}
        onSuccess={() => {
          // After successful registration, user will be authenticated
          setShowRegistrationDialog(false);
        }}
      />

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
          {/* Breadcrumb Navigation */}
          <nav className="mb-6" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2 text-sm">
              <li>
                <button
                  onClick={() => router.push('/onboarding')}
                  className="hover:underline"
                  style={{ color: maturityTheme.colors.text.secondary }}
                >
                  Home
                </button>
              </li>
              <li style={{ color: maturityTheme.colors.text.muted }}>/</li>
              <li style={{ color: maturityTheme.colors.text.primary }} className="font-medium">
                Upload Documents
              </li>
            </ol>
          </nav>

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
              <Label htmlFor="assessmentName" style={{ color: maturityTheme.colors.text.primary }}>Assessment/Project Name *</Label>
              <Input
                id="assessmentName"
                placeholder="e.g., ABC Corp PMO Assessment"
                value={assessmentName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAssessmentName(e.target.value)}
                className="font-medium [&::placeholder]:!text-[#8896b8] [&::placeholder]:opacity-70"
                style={{
                  color: maturityTheme.colors.text.primary,
                  backgroundColor: maturityTheme.colors.background.tertiary,
                  borderColor: maturityTheme.colors.border.default,
                }}
              />
              <style jsx>{`
                #assessmentName::placeholder {
                  color: ${maturityTheme.colors.text.muted};
                  opacity: 0.7;
                }
              `}</style>
              <p className="text-xs" style={{ color: maturityTheme.colors.text.muted }}>
                A reference name for this assessment (not linked to existing projects)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientName" style={{ color: maturityTheme.colors.text.primary }}>Client/Contact Name *</Label>
              <Input
                id="clientName"
                placeholder="e.g., John Smith or ABC Corp"
                value={clientName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClientName(e.target.value)}
                className="[&::placeholder]:!text-[#8896b8] [&::placeholder]:opacity-70"
                style={{
                  color: maturityTheme.colors.text.primary,
                  backgroundColor: maturityTheme.colors.background.tertiary,
                  borderColor: maturityTheme.colors.border.default,
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="organization" style={{ color: maturityTheme.colors.text.primary }}>Organization Name</Label>
              <Input
                id="organization"
                placeholder="e.g., ABC Corporation"
                value={organizationName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrganizationName(e.target.value)}
                className="[&::placeholder]:!text-[#8896b8] [&::placeholder]:opacity-70"
                style={{
                  color: maturityTheme.colors.text.primary,
                  backgroundColor: maturityTheme.colors.background.tertiary,
                  borderColor: maturityTheme.colors.border.default,
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" style={{ color: maturityTheme.colors.text.primary }}>Contact Email (optional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="e.g., contact@example.com"
                value={contactEmail}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContactEmail(e.target.value)}
                className="[&::placeholder]:!text-[#8896b8] [&::placeholder]:opacity-70"
                style={{
                  color: maturityTheme.colors.text.primary,
                  backgroundColor: maturityTheme.colors.background.tertiary,
                  borderColor: maturityTheme.colors.border.default,
                }}
              />
              <p className="text-xs" style={{ color: maturityTheme.colors.text.muted }}>
                We'll send your assessment results here
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="purpose" style={{ color: maturityTheme.colors.text.primary }}>Assessment Purpose</Label>
            <Select value={assessmentPurpose} onValueChange={setAssessmentPurpose}>
              <SelectTrigger 
                id="purpose"
                style={{
                  color: maturityTheme.colors.text.primary,
                  backgroundColor: maturityTheme.colors.background.tertiary,
                  borderColor: maturityTheme.colors.border.default,
                }}
              >
                <SelectValue placeholder="Select purpose..." />
              </SelectTrigger>
              <SelectContent
                style={{
                  backgroundColor: maturityTheme.colors.background.elevated,
                  borderColor: maturityTheme.colors.border.default,
                }}
              >
                <SelectItem 
                  value="Initial Onboarding"
                  style={{ color: maturityTheme.colors.text.primary }}
                >
                  Initial Client Onboarding
                </SelectItem>
                <SelectItem 
                  value="Annual Review"
                  style={{ color: maturityTheme.colors.text.primary }}
                >
                  Annual Maturity Review
                </SelectItem>
                <SelectItem 
                  value="Pre-Engagement"
                  style={{ color: maturityTheme.colors.text.primary }}
                >
                  Pre-Engagement Assessment
                </SelectItem>
                <SelectItem 
                  value="Compliance Audit"
                  style={{ color: maturityTheme.colors.text.primary }}
                >
                  Compliance Audit
                </SelectItem>
                <SelectItem 
                  value="Gap Analysis"
                  style={{ color: maturityTheme.colors.text.primary }}
                >
                  Gap Analysis
                </SelectItem>
                <SelectItem 
                  value="Other"
                  style={{ color: maturityTheme.colors.text.primary }}
                >
                  Other
                </SelectItem>
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
              <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: maturityTheme.colors.info.bg, borderColor: maturityTheme.colors.info.border, borderWidth: '1px' }}>
                <p className="text-sm font-medium mb-2" style={{ color: maturityTheme.colors.text.primary }}>
                  <Sparkles className="inline h-4 w-4 mr-1" />
                  Recommended Documents:
                </p>
                <ul className="text-xs space-y-1" style={{ color: maturityTheme.colors.text.secondary }}>
                  <li>• Project Charter, Scope Statement, WBS</li>
                  <li>• Schedule Plans, Risk Registers, Stakeholder Analysis</li>
                  <li>• Communication Plans, Quality Plans, Change Management Docs</li>
                  <li>• Status Reports, Lessons Learned, Project Plans</li>
                </ul>
                <p className="text-xs mt-2 italic" style={{ color: maturityTheme.colors.text.muted }}>
                  The more comprehensive your documentation, the more accurate your maturity assessment will be.
                </p>
              </div>
            </CardHeader>
        <CardContent>
          <div
            className="border-2 border-dashed rounded-lg p-12 text-center transition-colors"
            style={{
              borderColor: isDragging 
                ? maturityTheme.colors.primary[400] 
                : maturityTheme.colors.border.default,
              backgroundColor: isDragging 
                ? `${maturityTheme.colors.primary[500]}15` 
                : 'transparent'
            }}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mx-auto h-12 w-12 mb-4" style={{ color: maturityTheme.colors.text.secondary }} />
            <p className="text-lg font-medium mb-2" style={{ color: maturityTheme.colors.text.primary }}>
              {isDragging ? 'Drop files here' : 'Drag and drop files here'}
            </p>
            <p className="text-sm mb-4" style={{ color: maturityTheme.colors.text.secondary }}>
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
                <div className="text-2xl font-bold" style={{ color: maturityTheme.colors.text.primary }}>{stats.total}</div>
                <div className="text-sm" style={{ color: maturityTheme.colors.text.secondary }}>Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: maturityTheme.colors.warning.text }}>{stats.pending}</div>
                <div className="text-sm" style={{ color: maturityTheme.colors.text.secondary }}>Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: maturityTheme.colors.info.text }}>{stats.processing}</div>
                <div className="text-sm" style={{ color: maturityTheme.colors.text.secondary }}>Processing</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: maturityTheme.colors.success.text }}>{stats.complete}</div>
                <div className="text-sm" style={{ color: maturityTheme.colors.text.secondary }}>Complete</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: maturityTheme.colors.error.text }}>{stats.errors}</div>
                <div className="text-sm" style={{ color: maturityTheme.colors.text.secondary }}>Errors</div>
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
                  title={!canUpload ? 'Please fill in assessment name and client name, and select at least one file' : ''}
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
                      {files.length > 0 && (
                        <span className="ml-2 text-xs opacity-75">
                          ({Math.max(2, Math.ceil(files.length * 2.5))} min est.)
                        </span>
                      )}
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
                      <div className="font-medium" style={{ color: maturityTheme.colors.text.primary }}>{fileObj.file.name}</div>
                      <div className="text-sm" style={{ color: maturityTheme.colors.text.secondary }}>
                        {(fileObj.file.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                      {fileObj.status === 'processing' && (
                        <Progress value={fileObj.progress} className="mt-2" />
                      )}
                      {fileObj.error && (
                        <div className="text-sm mt-1" style={{ color: maturityTheme.colors.error.text }}>{fileObj.error}</div>
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

