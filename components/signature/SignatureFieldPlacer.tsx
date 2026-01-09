'use client';

import { useState, useRef, useEffect } from 'react';
import { FileSignature, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type SignatureField = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
  fieldType: 'signature' | 'initial' | 'date' | 'text' | 'checkbox';
  required?: boolean;
  assignedTo?: string;
  value?: string; // Signature value (base64 image or text)
};

export type SignatureFieldPlacerProps = {
  documentUrl?: string;
  pdfPreviewUrl?: string | null;
  fields: SignatureField[];
  onFieldsChange: (fields: SignatureField[]) => void;
  onFieldClick?: (field: SignatureField) => void;
  className?: string;
  disabled?: boolean;
  totalPages?: number; // Optional: total number of pages in the PDF
};

export const SignatureFieldPlacer = ({
  documentUrl,
  pdfPreviewUrl,
  fields,
  onFieldsChange,
  onFieldClick,
  className,
  disabled = false,
  totalPages = 1,
}: SignatureFieldPlacerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isPlacing, setIsPlacing] = useState(false);
  const [selectedFieldType, setSelectedFieldType] = useState<SignatureField['fieldType']>('signature');
  const [currentPage, setCurrentPage] = useState(1);
  const [detectedPages, setDetectedPages] = useState(totalPages);
  const [draggingField, setDraggingField] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Try to detect PDF page count from iframe
  useEffect(() => {
    if (pdfPreviewUrl && iframeRef.current) {
      try {
        const iframe = iframeRef.current;
        iframe.onload = () => {
          try {
            // Try to access PDF.js API if available
            const iframeWindow = iframe.contentWindow as any;
            if (iframeWindow?.PDFViewerApplication?.pagesCount) {
              setDetectedPages(iframeWindow.PDFViewerApplication.pagesCount);
            }
          } catch (e) {
            // Cross-origin or PDF.js not available, use default
            console.log('Could not detect PDF page count, using default');
          }
        };
      } catch (e) {
        // Cross-origin restrictions
      }
    }
  }, [pdfPreviewUrl]);

  const handleAddField = (event: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || !containerRef.current || !isPlacing) {
      console.log('Field placement blocked:', { disabled, hasContainer: !!containerRef.current, isPlacing });
      return;
    }
    
    // Stop event propagation to prevent iframe interaction
    event.preventDefault();
    event.stopPropagation();

    const rect = containerRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Calculate percentage position relative to container
    const xPercent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const yPercent = Math.max(0, Math.min(100, (y / rect.height) * 100));

    const newField: SignatureField = {
      id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      x: xPercent,
      y: yPercent,
      width: 200,
      height: 60,
      pageNumber: currentPage,
      fieldType: selectedFieldType,
      required: true,
    };

    console.log('Placing field:', { 
      xPercent, 
      yPercent, 
      fieldType: selectedFieldType, 
      pageNumber: currentPage,
      containerRect: { width: rect.width, height: rect.height },
      clickPos: { x, y }
    });
    
    onFieldsChange([...fields, newField]);
    setIsPlacing(false); // Turn off placement mode after placing a field
  };

  const handleDeleteField = (fieldId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    onFieldsChange(fields.filter((f) => f.id !== fieldId));
  };

  const handleFieldClick = (field: SignatureField) => {
    if (onFieldClick) {
      onFieldClick(field);
    }
  };

  const handleMouseDown = (fieldId: string, event: React.MouseEvent) => {
    if (disabled) return;
    event.stopPropagation();
    setDraggingField(fieldId);

    const field = fields.find((f) => f.id === fieldId);
    if (!field || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const fieldX = (field.x / 100) * rect.width;
    const fieldY = (field.y / 100) * rect.height;

    setDragOffset({
      x: event.clientX - fieldX,
      y: event.clientY - fieldY,
    });
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!draggingField || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((event.clientX - dragOffset.x) / rect.width) * 100;
    const y = ((event.clientY - dragOffset.y) / rect.height) * 100;

    onFieldsChange(
      fields.map((field) =>
        field.id === draggingField
          ? { ...field, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }
          : field,
      ),
    );
  };

  const handleMouseUp = () => {
    setDraggingField(null);
  };

  const fieldTypeLabels = {
    signature: 'Signature',
    initial: 'Initial',
    date: 'Date',
    text: 'Text',
    checkbox: 'Checkbox',
  };

  const fieldTypeColors = {
    signature: 'bg-blue-500',
    initial: 'bg-purple-500',
    date: 'bg-green-500',
    text: 'bg-yellow-500',
    checkbox: 'bg-orange-500',
  };

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Toolbar */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-lg">Place Signature Fields</CardTitle>
          <CardDescription>Click on the document to place signature fields</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(['signature', 'initial', 'date', 'text', 'checkbox'] as const).map((type) => (
              <Button
                key={type}
                type="button"
                variant={selectedFieldType === type && isPlacing ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setSelectedFieldType(type);
                  setIsPlacing(true); // Enable placement mode when selecting a field type
                }}
                disabled={disabled}
              >
                <FileSignature className="mr-2 h-4 w-4" />
                {fieldTypeLabels[type]}
              </Button>
            ))}
            {isPlacing && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsPlacing(false)}
              >
                Cancel Placement
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Current Page:</span>
            <Badge variant="secondary">{currentPage}</Badge>
          </div>

          {fields.length > 0 && (
            <div className="rounded-lg border p-2">
              <p className="text-sm font-medium">Placed Fields ({fields.length})</p>
              <div className="mt-2 space-y-1">
                {fields
                  .filter((f) => f.pageNumber === currentPage)
                  .map((field) => (
                    <div
                      key={field.id}
                      className="flex items-center justify-between rounded px-2 py-1 hover:bg-muted"
                    >
                      <span className="text-sm">
                        {fieldTypeLabels[field.fieldType]} {field.required && '(Required)'}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={async (e: React.MouseEvent) => handleDeleteField(field.id, e)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Viewer */}
      <div
        ref={containerRef}
        className={cn(
          'relative flex-1 overflow-hidden border bg-gray-100',
          {
            'cursor-crosshair': isPlacing && !disabled,
            'cursor-move': draggingField !== null,
          },
        )}
        style={{ minHeight: 'calc(100vh - 400px)' }}
      >
        {pdfPreviewUrl ? (
          <>
            <iframe
              ref={iframeRef}
              src={`${pdfPreviewUrl}#page=${currentPage}`}
              className="h-full w-full border-0"
              title="Document Preview"
              style={{ 
                minHeight: 'calc(100vh - 400px)',
                height: '100%',
                zIndex: 1
              }}
            />
            {/* Transparent overlay for placing fields - only active when placing */}
            {!disabled && isPlacing && (
              <div
                className="absolute inset-0 z-10 bg-transparent"
                onClick={handleAddField}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{
                  cursor: 'crosshair',
                  pointerEvents: 'auto'
                }}
              />
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground" style={{ minHeight: 'calc(100vh - 400px)' }}>
            <div className="text-center">
              <FileSignature className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No document preview available</p>
              <p className="text-sm">Generating PDF preview...</p>
            </div>
          </div>
        )}

        {/* Render placed fields */}
        {fields
          .filter((f) => f.pageNumber === currentPage)
          .map((field) => (
            <div
              key={field.id}
              className={cn(
                'absolute border-2 border-dashed cursor-move z-20',
                fieldTypeColors[field.fieldType],
                {
                  'border-solid': field.required,
                  'opacity-50': disabled,
                },
              )}
              style={{
                left: `${field.x}%`,
                top: `${field.y}%`,
                width: `${field.width}px`,
                height: `${field.height}px`,
                pointerEvents: 'auto',
              }}
              onClick={async (e: React.MouseEvent) => {
                e.stopPropagation();
                e.preventDefault();
                if (!field.value) {
                  handleFieldClick(field);
                }
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (!field.value && !disabled) {
                  handleMouseDown(field.id, e);
                }
              }}
            >
              {field.value ? (
                <div className="flex h-full items-center justify-center p-1 bg-white">
                  {field.fieldType === 'signature' || field.fieldType === 'initial' ? (
                    <img 
                      src={field.value} 
                      alt="Signature" 
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-xs">{field.value}</span>
                  )}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center p-1">
                  <span className="text-xs font-medium text-white">
                    {fieldTypeLabels[field.fieldType]}
                  </span>
                </div>
              )}
              {!disabled && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute -right-2 -top-2 h-5 w-5 rounded-full p-0"
                  onClick={async (e: React.MouseEvent) => handleDeleteField(field.id, e)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
      </div>
    </div>
  );
};

