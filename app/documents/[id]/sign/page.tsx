'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, FileSignature, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SignatureCaptureDialog } from '@/components/signature/SignatureCaptureDialog';
import { SignatureStatusBadge } from '@/components/signature/SignatureStatusBadge';
import { SignatureFieldPlacer } from '@/components/signature/SignatureFieldPlacer';
import type { SignatureField } from '@/components/signature/SignatureFieldPlacer';
import { apiClient } from '@/lib/api';
import { getApiUrl } from '@/lib/api-url';
import { cn } from '@/lib/utils';

type SignatureRequest = {
  id: string;
  documentId: string;
  status: 'pending' | 'signed' | 'rejected' | 'expired';
  recipientEmail: string;
  recipientName: string;
  signedAt?: string;
  fields: SignatureField[];
};

export default function DocumentSigningPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;

  const [document, setDocument] = useState<any>(null);
  const [signatureRequest, setSignatureRequest] = useState<SignatureRequest | null>(null);
  const [fields, setFields] = useState<SignatureField[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigning, setIsSigning] = useState(false);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [selectedField, setSelectedField] = useState<SignatureField | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false); // Track if we're in a retry loop

  useEffect(() => {
    loadDocumentData();
  }, [documentId]);

  const loadDocumentData = async () => {
    try {
      setIsLoading(true);

      // Load document
      try {
        const documentData = await apiClient.getDocument(documentId);
        setDocument(documentData);
        
        // Generate PDF preview URL using the helper to avoid double /api/api/
        const token = localStorage.getItem('auth_token');
        if (!token) {
          console.warn('No auth token found, PDF preview may fail');
          toast.error('Authentication required. Please log in again.');
          return;
        }
        const pdfUrl = getApiUrl(`/documents/${documentId}/pdf-preview`);
        // Create a blob URL for the PDF preview
        try {
          console.log('Fetching PDF preview from:', pdfUrl);
          const response = await fetch(pdfUrl, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('PDF preview failed:', response.status, errorText);
            throw new Error(`PDF preview failed: ${response.status} ${errorText}`);
          }
          
          const blob = await response.blob();
          if (blob.size === 0) {
            console.error('PDF preview blob is empty');
            throw new Error('PDF preview is empty');
          }
          
          console.log('PDF preview generated successfully, size:', blob.size, 'bytes');
          const blobUrl = URL.createObjectURL(blob);
          setPdfPreviewUrl(blobUrl);
        } catch (pdfError: any) {
          console.error('Failed to generate PDF preview:', pdfError);
          toast.error(`Failed to generate PDF preview: ${pdfError.message || 'Unknown error'}`);
          // Continue without PDF preview - user can still place fields
        }
      } catch (error: any) {
        console.error('Failed to load document:', error);
        if (error?.status === 404 || error?.response?.status === 404) {
          setDocument(null); // Explicitly set to null to show "not found" message
          return;
        }
        throw error; // Re-throw other errors
      }

      // Load signature request
      try {
        const requestResponse = await apiClient.get<{ success?: boolean; data?: any[]; requests?: any[] }>(`/signatures/requests?documentId=${documentId}`);
        const requests = requestResponse.data || (requestResponse as any).requests || [];
        if (requests.length > 0) {
          const request = requests[0];
          setSignatureRequest(request);
          setFields(request.fields || []);
        }
      } catch (error) {
        // No signature request yet, that's okay
        console.log('No signature request found');
      }

          // Load signature fields
          try {
            const fieldsResponse = await apiClient.get<{ success?: boolean; data?: SignatureField[]; fields?: SignatureField[] }>(`/signatures/documents/${documentId}/fields`);
            const fieldsData = fieldsResponse.data || (fieldsResponse as any).fields || [];
            if (fieldsData.length > 0) {
              // Convert backend format to frontend format
              const convertedFields = fieldsData.map((f: any) => ({
                id: f.id,
                x: f.x || f.x_position,
                y: f.y || f.y_position,
                width: f.width || 200,
                height: f.height || 60,
                pageNumber: f.pageNumber || f.page_number,
                fieldType: f.fieldType || f.field_type,
                required: f.required !== false,
                assignedTo: f.assignedTo || f.assigned_to_email,
                value: f.value || null,
              }));
              setFields(convertedFields);
            }
          } catch (error) {
            // No fields yet, that's okay
            console.log('No signature fields found');
          }
    } catch (error: any) {
      console.error('Failed to load document:', error);
      toast.error(error?.message || 'Failed to load document');
      setDocument(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl);
      }
    };
  }, [pdfPreviewUrl]);

  const handleFieldClick = (field: SignatureField) => {
    if (field.fieldType === 'signature' || field.fieldType === 'initial') {
      setSelectedField(field);
      setShowSignatureDialog(true);
    }
  };

  const handleSaveSignature = async (signature: string) => {
    if (!selectedField) return;

    // Only reset retry count if this is a NEW signature attempt (not a retry)
    if (!isRetrying) {
      setRetryCount(0);
    }

    try {
      setIsSigning(true);

      // First, ensure the field exists in the database
      // If field.id doesn't look like a UUID, it's a client-generated ID and needs to be saved first
      const isClientGeneratedId = !selectedField.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      
      let fieldIdToSign = selectedField.id;
      
      if (isClientGeneratedId) {
        // Save fields first to get database IDs
        try {
          const saveResponse = await apiClient.request(`/signatures/documents/${documentId}/fields`, {
            method: 'POST',
            body: JSON.stringify({ fields }),
          });
          
          console.log('Save fields response:', saveResponse);
          
          // Handle different response formats
          let savedFields: any[] = [];
          if (saveResponse.data && Array.isArray(saveResponse.data)) {
            savedFields = saveResponse.data;
          } else if (Array.isArray(saveResponse)) {
            savedFields = saveResponse;
          } else if (saveResponse.success && saveResponse.data && Array.isArray(saveResponse.data)) {
            savedFields = saveResponse.data;
          }
          
          if (savedFields.length === 0) {
            console.warn('No fields returned from save endpoint, response:', saveResponse);
            throw new Error('No fields returned from save endpoint');
          }
          
          // Find the matching field by position (more reliable than ID matching)
          // The backend returns fields with backend format, so we need to check both formats
          const savedField = savedFields.find((f: any) => {
            const pageMatches = (f.pageNumber === selectedField.pageNumber) || (f.page_number === selectedField.pageNumber);
            const xMatches = Math.abs((f.x || f.x_position) - selectedField.x) < 1;
            const yMatches = Math.abs((f.y || f.y_position) - selectedField.y) < 1;
            const typeMatches = (f.fieldType === selectedField.fieldType) || (f.field_type === selectedField.fieldType);
            
            return pageMatches && xMatches && yMatches && typeMatches;
          });
          
          if (savedField && savedField.id) {
            fieldIdToSign = savedField.id;
            
            console.log('Matched field:', { 
              clientId: selectedField.id, 
              databaseId: savedField.id,
              position: { x: selectedField.x, y: selectedField.y },
              page: selectedField.pageNumber
            });
            
            // Update the selectedField and fields state with the database ID
            setSelectedField({ ...selectedField, id: savedField.id });
            setFields(prevFields => 
              prevFields.map(f => 
                f.id === selectedField.id 
                  ? { ...f, id: savedField.id }
                  : f
              )
            );
          } else {
            console.error('Could not find matching field in saved fields:', {
              savedFields,
              selectedField,
            });
            throw new Error('Field was saved but database ID not found in response');
          }
        } catch (saveError: any) {
          console.error('Failed to save fields before signing:', saveError);
          const errorMsg = saveError.response?.data?.error || saveError.message || 'Failed to save field to database';
          toast.error(errorMsg);
          return; // Don't continue if we can't save the field
        }
      }

      // Verify we have a valid UUID before signing
      if (!fieldIdToSign.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        throw new Error('Invalid field ID. Field must be saved to database first.');
      }

      // Now sign the field with the database UUID
      const response = await apiClient.post(`/signatures/fields/${fieldIdToSign}/sign`, {
        signature,
        fieldType: selectedField.fieldType,
      });

      // Update the field with the signature value immediately
      setFields(prevFields => 
        prevFields.map(f => 
          f.id === fieldIdToSign 
            ? { ...f, value: signature }
            : f
        )
      );

      toast.success('Signature saved successfully');
      setShowSignatureDialog(false);
      setSelectedField(null);
      setRetryCount(0); // Reset retry count on success
      setIsRetrying(false); // Reset retry flag on success

      // Reload signature request status
      await loadDocumentData();
    } catch (error: any) {
      console.error('Failed to save signature:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to save signature';
      toast.error(errorMessage);
      
      // If field not found or validation error, try saving fields first
      if (errorMessage.includes('not found') || errorMessage.includes('GUID') || errorMessage.includes('validation') || error.response?.status === 404 || error.response?.status === 400) {
        // Prevent infinite recursion by tracking retry attempts
        const maxRetries = 3;
        const currentRetryCount = retryCount; // Capture current value synchronously
        
        if (currentRetryCount < maxRetries) {
          toast.info(`Saving fields to database first... (Attempt ${currentRetryCount + 1}/${maxRetries})`);
          try {
            setIsRetrying(true); // Mark that we're entering retry mode
            await handleSaveFields();
            // Reload fields to get database IDs
            await loadDocumentData();
            // Increment retry count before scheduling retry
            const newRetryCount = currentRetryCount + 1;
            setRetryCount(newRetryCount);
            
            // Retry signing after a short delay
            setTimeout(async () => {
              if (selectedField) {
                await handleSaveSignature(signature);
              } else {
                setIsSigning(false);
                setIsRetrying(false);
              }
            }, 1000);
            return; // Exit early to prevent setIsSigning(false) in finally block
          } catch (saveError) {
            console.error('Failed to save fields:', saveError);
            toast.error('Failed to save fields. Please try placing the field again.');
            setRetryCount(0); // Reset retry count on failure
            setIsRetrying(false);
            setIsSigning(false);
          }
        } else {
          toast.error('Maximum retry attempts reached. Please try again manually.');
          setRetryCount(0); // Reset retry count
          setIsRetrying(false);
          setIsSigning(false);
        }
      } else {
        // Not a retry-able error, reset retry state
        setIsRetrying(false);
        setIsSigning(false);
      }
    } finally {
      // Only set isSigning to false if we're not retrying
      // Use the captured value from the error handler, not the stale state
      if (!isRetrying && retryCount < 3) {
        setIsSigning(false);
        setIsRetrying(false);
      }
    }
  };

  const handleSaveFields = async () => {
    try {
      await apiClient.request(`/signatures/documents/${documentId}/fields`, {
        method: 'POST',
        body: JSON.stringify({ fields }),
      });

      toast.success('Signature fields saved successfully');
    } catch (error: any) {
      console.error('Failed to save fields:', error);
      toast.error(error.response?.data?.error || 'Failed to save signature fields');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="text-muted-foreground">Loading document...</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Document Not Found</CardTitle>
            <CardDescription>The document you're looking for doesn't exist.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.back()}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if all signature/initial fields have been signed
  const signatureFields = fields.filter(f => f.fieldType === 'signature' || f.fieldType === 'initial');
  const allFieldsSigned = signatureFields.length > 0 && signatureFields.every((field) => {
    // Check if field has a value (signed)
    return field.value && field.value.trim() !== '';
  });

  return (
    <div className="container mx-auto py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{document.title || 'Sign Document'}</h1>
            <p className="text-sm text-muted-foreground">Document ID: {documentId}</p>
          </div>
        </div>

        {signatureRequest && (
          <SignatureStatusBadge status={signatureRequest.status} />
        )}
      </div>

      {/* Signature Request Info */}
      {signatureRequest && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Signature Request</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Recipient</p>
                <p className="text-sm">{signatureRequest.recipientName}</p>
                <p className="text-xs text-muted-foreground">{signatureRequest.recipientEmail}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <SignatureStatusBadge status={signatureRequest.status} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Signature Field Placer */}
      <Card className="flex flex-col" style={{ minHeight: 'calc(100vh - 300px)' }}>
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Sign Document</CardTitle>
              <CardDescription>
                {allFieldsSigned
                  ? 'All signature fields have been completed'
                  : 'Click on signature fields to sign them'}
              </CardDescription>
            </div>
            {fields.length > 0 && (
              <Button onClick={handleSaveFields} variant="outline">
                Save Fields
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <SignatureFieldPlacer
            pdfPreviewUrl={pdfPreviewUrl}
            fields={fields}
            onFieldsChange={setFields}
            onFieldClick={handleFieldClick}
            disabled={signatureRequest?.status === 'signed'}
            className="h-full"
          />
        </CardContent>
      </Card>

      {/* Signature Capture Dialog */}
      <SignatureCaptureDialog
        open={showSignatureDialog}
        onOpenChange={setShowSignatureDialog}
        onSave={handleSaveSignature}
        disabled={isSigning}
        dialogTitle={`Sign ${selectedField?.fieldType === 'initial' ? 'Initial' : 'Signature'} Field`}
        dialogConfirmText="Save Signature"
      />

      {/* Success Message */}
      {allFieldsSigned && (
        <Card className="mt-6 border-green-200 bg-green-50 dark:bg-green-950">
          <CardContent className="flex items-center gap-4 py-6">
            <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            <div>
              <p className="font-medium text-green-900 dark:text-green-100">
                Document Signed Successfully
              </p>
              <p className="text-sm text-green-700 dark:text-green-300">
                All signature fields have been completed.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


