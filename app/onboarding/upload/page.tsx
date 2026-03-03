'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from '@/lib/notify';
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
  Sparkles,
  Eye
} from '@/components/ui/icons-shim';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { File, FileText as FileTextIcon, FileCode } from 'lucide-react';

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
  const [files, setFiles] = React.useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [batchId, setBatchId] = React.useState<string | null>(null);
  const [showIntro, setShowIntro] = React.useState(false);
  const [showRegistrationDialog, setShowRegistrationDialog] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [uploadProgress, setUploadProgress] = React.useState<Record<string, number>>({});
  const [isPolling, setIsPolling] = React.useState(false);
  const pollingIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const [previewFile, setPreviewFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [previewText, setPreviewText] = React.useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = React.useState(false);

  // Handle file preview
  const handlePreviewFile = async (file: File) => {
    setIsLoadingPreview(true);
    setPreviewFile(file);

    const ext = file.name.split('.').pop()?.toLowerCase();

    try {
      if (ext === 'pdf') {
        // For PDFs, create object URL
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        setPreviewText(null);
      } else if (ext === 'txt' || ext === 'md' || ext === 'markdown') {
        // For text files, read content
        const text = await file.text();
        setPreviewText(text);
        setPreviewUrl(null);
      } else {
        // For DOCX and others, show file info
        setPreviewText(null);
        setPreviewUrl(null);
      }
    } catch (error) {
      console.error('Failed to preview file:', error);
      toast.error('Failed to preview file');
      setPreviewFile(null);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Cleanup preview URL on unmount
  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Assessment metadata (simplified - no project database link)
  const [assessmentName, setAssessmentName] = React.useState('');
  const [clientName, setClientName] = React.useState('');
  const [organizationName, setOrganizationName] = React.useState('');
  const [contactEmail, setContactEmail] = React.useState('');
  const [assessmentPurpose, setAssessmentPurpose] = React.useState('Initial Onboarding');

  // Load draft from localStorage on mount
  React.useEffect(() => {
    const draftKey = 'assessment_draft';
    try {
      const draft = localStorage.getItem(draftKey);
      if (draft) {
        const parsed = JSON.parse(draft);
        setAssessmentName(parsed.assessmentName || '');
        setClientName(parsed.clientName || '');
        setOrganizationName(parsed.organizationName || '');
        setContactEmail(parsed.contactEmail || '');
        setAssessmentPurpose(parsed.assessmentPurpose || 'Initial Onboarding');

        // Show notification that draft was loaded
        if (parsed.assessmentName || parsed.clientName) {
          toast.info('Draft loaded', {
            description: 'Your previous assessment details have been restored.',
            duration: 3000,
          });
        }
      }
    } catch (e) {
      console.warn('Failed to load draft:', e);
    }
  }, []);

  // Auto-save draft to localStorage
  React.useEffect(() => {
    const draftKey = 'assessment_draft';
    const draft = {
      assessmentName,
      clientName,
      organizationName,
      contactEmail,
      assessmentPurpose,
      lastSaved: new Date().toISOString(),
    };

    // Only save if there's meaningful data
    if (assessmentName || clientName || organizationName) {
      try {
        localStorage.setItem(draftKey, JSON.stringify(draft));
      } catch (e) {
        console.warn('Failed to save draft:', e);
      }
    }
  }, [assessmentName, clientName, organizationName, contactEmail, assessmentPurpose]);

  // Clear draft after successful upload
  const clearDraft = () => {
    try {
      localStorage.removeItem('assessment_draft');
    } catch (e) {
      console.warn('Failed to clear draft:', e);
    }
  };

  // Populate fields from logged-in user when authenticated
  React.useEffect(() => {
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
  React.useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      // Show registration dialog instead of redirecting
      setShowRegistrationDialog(true);
    }
  }, [isAuthenticated, authLoading]);

  // Check if first visit (only if authenticated)
  React.useEffect(() => {
    if (isAuthenticated) {
      const hasSeenIntro = localStorage.getItem('maturity_journey_intro_seen');
      if (!hasSeenIntro) {
        setShowIntro(true);
      }
    }
  }, [isAuthenticated]);

  // Helper functions - must be defined before useCallback hooks
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return FileTextIcon;
      case 'docx':
      case 'doc':
        return FileText;
      case 'txt':
        return FileCode;
      case 'md':
      case 'markdown':
        return FileCode;
      default:
        return File;
    }
  };

  const getFileTypeColor = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return '#ef4444'; // red
      case 'docx':
      case 'doc':
        return '#2563eb'; // blue
      case 'txt':
        return '#10b981'; // green
      case 'md':
      case 'markdown':
        return '#8b5cf6'; // purple
      default:
        return maturityTheme.colors.text.muted;
    }
  };

  const checkFileSize = (file: File): { isValid: boolean; warning?: string } => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const fileSizeMB = file.size / 1024 / 1024;

    if (file.size > maxSize) {
      return {
        isValid: false,
        warning: `File "${file.name}" exceeds 10MB limit (${fileSizeMB.toFixed(2)}MB)`
      };
    }

    if (fileSizeMB > 8) {
      return {
        isValid: true,
        warning: `Large file: ${fileSizeMB.toFixed(2)}MB (limit: 10MB)`
      };
    }

    return { isValid: true };
  };

  // Handle file selection - must be defined before useCallback hooks that use it
  const handleFilesSelected = React.useCallback((selectedFiles: File[]) => {
    const newFiles: UploadedFile[] = [];
    const warnings: string[] = [];

    selectedFiles.forEach(file => {
      const sizeCheck = checkFileSize(file);
      if (!sizeCheck.isValid) {
        warnings.push(sizeCheck.warning || '');
        return;
      }
      if (sizeCheck.warning) {
        warnings.push(sizeCheck.warning);
      }

      newFiles.push({
        file,
        id: Math.random().toString(36).substring(7),
        status: 'pending',
        progress: 0
      });
    });

    if (warnings.length > 0) {
      warnings.forEach(warning => {
        if (warning) {
          toast.warning(warning, { duration: 5000 });
        }
      });
    }

    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles]);
    }

    if (selectedFiles.length > newFiles.length) {
      toast.error(`${selectedFiles.length - newFiles.length} file(s) were rejected due to size limits`);
    }
  }, []);

// Handle drag events - ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
const handleDragEnter = React.useCallback((e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  setIsDragging(true);
}, []);

const handleDragLeave = React.useCallback((e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  setIsDragging(false);
}, []);

const handleDragOver = React.useCallback((e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
}, []);

const handleDrop = React.useCallback((e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  setIsDragging(false);

  const droppedFiles = Array.from(e.dataTransfer.files);
  handleFilesSelected(droppedFiles);
}, [handleFilesSelected]);

const handleFileInputChange = React.useCallback((e) => {
  if (e.target.files) {
    handleFilesSelected(Array.from(e.target.files));
  }
}, [handleFilesSelected]);

// Poll batch status for real-time progress
const pollBatchStatus = async (batchId: string) => {
  if (isPolling) return;
  setIsPolling(true);

  const poll = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(getApiUrl(`/onboarding/upload/${batchId}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const batch = data.data;
          const totalFiles = batch.total_files || files.length;
          const processedFiles = batch.processed_files || 0;
          const overallProgress = totalFiles > 0 ? Math.round((processedFiles / totalFiles) * 100) : 0;

          // Update file progress
          if (batch.files && Array.isArray(batch.files)) {
            const newProgress: Record<string, number> = {};
            batch.files.forEach((file: any) => {
              if (file.status === 'complete' || file.status === 'processed') {
                newProgress[file.name || file.filename] = 100;
              } else if (file.status === 'processing') {
                newProgress[file.name || file.filename] = 50; // Estimate
              } else {
                newProgress[file.name || file.filename] = 0;
              }
            });
            setUploadProgress(newProgress);

            // Update file statuses
            setFiles(prev => prev.map(f => {
              const fileStatus = batch.files?.find((bf: any) =>
                bf.name === f.file.name || bf.filename === f.file.name
              );
              if (fileStatus) {
                return {
                  ...f,
                  status: fileStatus.status === 'complete' ? 'complete' :
                    fileStatus.status === 'processing' ? 'processing' :
                      fileStatus.status === 'failed' ? 'error' : f.status,
                  progress: newProgress[f.file.name] || f.progress,
                  error: fileStatus.error || f.error
                };
              }
              return f;
            }));
          }

          // Stop polling if batch is complete
          if (batch.status === 'completed' || batch.status === 'complete') {
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            setIsPolling(false);
            clearDraft(); // Clear draft after successful upload
          }
        }
      }
    } catch (error) {
      console.error('Failed to poll batch status:', error);
    }
  };

  // Poll immediately, then every 2 seconds
  poll();
  pollingIntervalRef.current = setInterval(poll, 2000);
};

// Cleanup polling on unmount
React.useEffect(() => {
  return () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
  };
}, []);

// Upload files with progress tracking
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
  setUploadProgress({});

  try {
    const formData = new FormData();

    files.forEach((fileObj, index) => {
      formData.append('files', fileObj.file);
      // Initialize progress tracking
      setUploadProgress(prev => ({ ...prev, [fileObj.file.name]: 0 }));
    });

    // Add assessment metadata (no project_id needed for potential clients)
    formData.append('assessmentName', assessmentName);
    formData.append('clientName', clientName);
    formData.append('organizationName', organizationName || clientName);
    formData.append('assessmentPurpose', assessmentPurpose);
    if (contactEmail) {
      formData.append('email', contactEmail);
    }

    // Use XMLHttpRequest for upload progress
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          // Update overall progress (distribute across files)
          const progressPerFile = percentComplete / files.length;
          const newProgress: Record<string, number> = {};
          files.forEach(fileObj => {
            newProgress[fileObj.file.name] = Math.min(progressPerFile, 90); // Cap at 90% until server confirms
          });
          setUploadProgress(newProgress);
        }
      });

      xhr.addEventListener('load', async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);

            if (!result.success || !result.data) {
              throw new Error('Invalid response from server');
            }

            const newBatchId = result.data.batch_id || result.data.batchId;
            setBatchId(newBatchId);

            // Start polling for batch processing progress
            if (newBatchId) {
              pollBatchStatus(newBatchId);
            }

            // Monitor progress via WebSocket
            monitorUploadProgress(newBatchId);
            resolve();
          } catch (error: any) {
            reject(error);
          }
        } else {
          try {
            const errorData = JSON.parse(xhr.responseText);
            const errorMessage = errorData.error?.message || errorData.error || `Server error (${xhr.status})`;
            const errorCode = errorData.error?.code || 'UPLOAD_FAILED';

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

            toast.error(userMessage);
            reject(new Error(errorMessage));
          } catch (e) {
            reject(new Error(`Upload failed: ${xhr.statusText}`));
          }
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload cancelled'));
      });

      xhr.open('POST', getApiUrl('/onboarding/upload'));
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    });

    await uploadPromise;

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
      toast.error('Unable to start assessment', {
        description: `Error: ${error.message}\n\nPlease check:\n• All required fields are filled\n• Files are valid (PDF, DOCX, TXT, MD)\n• File sizes are under 10MB\n• You're logged in\n\nIf the problem persists, please contact support.`,
        duration: 8000,
      });
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
      onOpenChange={(open: boolean) => {
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
                    onChange={(e) => setAssessmentName(e.target.value)}
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
                    onChange={(e) => setClientName(e.target.value)}
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
                    onChange={(e) => setOrganizationName(e.target.value)}
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
                    onChange={(e) => setContactEmail(e.target.value)}
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
                      onClick={() => {
                        clearAll();
                        clearDraft();
                        toast.info('Draft cleared');
                      }}
                      disabled={isUploading}
                      title="Clear all files and draft"
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
                        {(() => {
                          const FileIcon = getFileIcon(fileObj.file.name);
                          const iconColor = getFileTypeColor(fileObj.file.name);
                          return <FileIcon className="h-8 w-8" style={{ color: iconColor }} />;
                        })()}
                        <div className="flex-1">
                          <div className="font-medium" style={{ color: maturityTheme.colors.text.primary }}>{fileObj.file.name}</div>
                          <div className="flex items-center gap-2">
                            <div className="text-sm" style={{ color: maturityTheme.colors.text.secondary }}>
                              {(fileObj.file.size / 1024 / 1024).toFixed(2)} MB
                            </div>
                            {(() => {
                              const sizeCheck = checkFileSize(fileObj.file);
                              if (sizeCheck.warning && !sizeCheck.warning.includes('exceeds')) {
                                return (
                                  <span className="text-xs px-2 py-0.5 rounded" style={{
                                    backgroundColor: maturityTheme.colors.warning.bg,
                                    color: maturityTheme.colors.warning.text
                                  }}>
                                    Large
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                          {(fileObj.status === 'processing' || fileObj.status === 'uploading') && (
                            <div className="mt-2">
                              <Progress
                                value={uploadProgress[fileObj.file.name] || fileObj.progress}
                                className="h-2"
                              />
                              <p className="text-xs mt-1" style={{ color: maturityTheme.colors.text.muted }}>
                                {uploadProgress[fileObj.file.name] || fileObj.progress}% uploaded
                              </p>
                            </div>
                          )}
                          {fileObj.error && (
                            <div className="text-sm mt-1" style={{ color: maturityTheme.colors.error.text }}>{fileObj.error}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {fileObj.status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePreviewFile(fileObj.file)}
                              title="Preview file"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(fileObj.id)}
                              title="Remove file"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
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

        {/* File Preview Dialog */}
        <Dialog open={!!previewFile} onOpenChange={(open: boolean) => {
          if (!open) {
            setPreviewFile(null);
            if (previewUrl) {
              URL.revokeObjectURL(previewUrl);
              setPreviewUrl(null);
            }
            setPreviewText(null);
          }
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle style={{ color: maturityTheme.colors.text.primary }}>
                {previewFile?.name}
              </DialogTitle>
              <DialogDescription style={{ color: maturityTheme.colors.text.secondary }}>
                File Preview • {(previewFile?.size || 0) / 1024 / 1024} MB
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-auto mt-4">
              {isLoadingPreview ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin" style={{ color: maturityTheme.colors.primary[400] }} />
                </div>
              ) : previewUrl ? (
                // PDF Preview
                <iframe
                  src={previewUrl}
                  className="w-full h-[600px] border rounded"
                  style={{ borderColor: maturityTheme.colors.border.default }}
                  title="PDF Preview"
                />
              ) : previewText ? (
                // Text Preview
                <div
                  className="p-4 rounded border font-mono text-sm whitespace-pre-wrap overflow-auto max-h-[600px]"
                  style={{
                    backgroundColor: maturityTheme.colors.background.tertiary,
                    borderColor: maturityTheme.colors.border.default,
                    color: maturityTheme.colors.text.primary
                  }}
                >
                  {previewText}
                </div>
              ) : previewFile ? (
                // File Info (for DOCX and other non-previewable files)
                <div className="space-y-4">
                  <div className="p-4 rounded-lg" style={{ backgroundColor: maturityTheme.colors.background.tertiary }}>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5" style={{ color: maturityTheme.colors.text.secondary }} />
                        <span className="font-medium" style={{ color: maturityTheme.colors.text.primary }}>
                          {previewFile.name}
                        </span>
                      </div>
                      <div className="text-sm space-y-1" style={{ color: maturityTheme.colors.text.secondary }}>
                        <div>Size: {(previewFile.size / 1024 / 1024).toFixed(2)} MB</div>
                        <div>Type: {previewFile.type || 'Unknown'}</div>
                        <div>Last Modified: {new Date(previewFile.lastModified).toLocaleString()}</div>
                      </div>
                      <div className="mt-4 p-3 rounded" style={{ backgroundColor: maturityTheme.colors.info.bg, borderColor: maturityTheme.colors.info.border }}>
                        <p className="text-sm" style={{ color: maturityTheme.colors.text.primary }}>
                          Preview is not available for this file type. The file will be processed after upload.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  </>
);
}

