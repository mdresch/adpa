/**
 * Document Upload API
 * Endpoint: POST /api/documents/upload
 * Handles multipart document uploads and initiates parsing pipeline
 */


import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/auth-utils';
import { toast } from '@/lib/notify';

interface UploadResponse {
  success: boolean;
  document?: {
    id: string;
    filename: string;
    format: string;
    parsing_confidence: number;
    sections_count: number;
    word_count: number;
    character_count: number;
  };
  error?: string;
  validation_errors?: string[];
}

// Configuration
const SUPPORTED_FORMATS = ['pdf', 'docx', 'xlsx', 'txt'];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_FILES_PER_REQUEST = 5;

export async function POST(req: NextRequest): Promise<NextResponse<UploadResponse>> {
  // Dynamically import backend dependencies at runtime
  const { documentParserService } = await import('@/server/src/services/documentParserService');
  const { documentIngestionRepository } = await import('@/server/src/services/documentIngestionRepository');
  const { logger } = await import('@/server/src/utils/logger');

  try {
    // Authenticate user
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return unauthorizedResponse();
    }

    // Get project ID from query parameters
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project ID is required',
        },
        { status: 400 }
      );
    }

    // Parse multipart form data
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No files provided',
        },
        { status: 400 }
      );
    }

    if (files.length > MAX_FILES_PER_REQUEST) {
      return NextResponse.json(
        {
          success: false,
          error: `Maximum ${MAX_FILES_PER_REQUEST} files per request`,
        },
        { status: 400 }
      );
    }

    // Validate files
    const validationErrors: string[] = [];
    const filesToProcess: Array<{ file: File; buffer: Buffer }> = [];

    for (const file of files) {
      const fileValidation = await validateFile(file);
      if (!fileValidation.valid) {
        validationErrors.push(`${file.name}: ${fileValidation.error}`);
      } else {
        const buffer = await file.arrayBuffer();
        filesToProcess.push({
          file,
          buffer: Buffer.from(buffer),
        });
      }
    }

    if (filesToProcess.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No valid files to process',
          validation_errors: validationErrors,
        },
        { status: 400 }
      );
    }

    // Process files
    const results: UploadResponse[] = [];

    for (const { file, buffer } of filesToProcess) {
      try {
        // Parse document
        const parsedDoc = await documentParserService.parseDocument(
          buffer,
          file.name
        );

        // Store in database
        const stored = await documentIngestionRepository.storeDocument(
          parsedDoc,
          projectId,
          user.id
        );

        results.push({
          success: true,
          document: {
            id: stored.id,
            filename: stored.filename,
            format: stored.format,
            parsing_confidence: stored.parsing_confidence,
            sections_count: parsedDoc.sections.length,
            word_count: parsedDoc.metadata.word_count,
            character_count: parsedDoc.metadata.character_count,
          },
        });

        logger.info('Document uploaded successfully', {
          documentId: stored.id,
          filename: file.name,
          userId: user.id,
          projectId,
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          success: false,
          error: `Failed to process ${file.name}: ${errorMsg}`,
        });

        logger.error('Document processing failed', {
          filename: file.name,
          userId: user.id,
          projectId,
          error: errorMsg,
        });
      }
    }

    // Return results
    const allSuccess = results.every((r) => r.success);
    const statusCode = allSuccess ? 200 : results.some((r) => r.success) ? 207 : 400;

    // Return first successful result for backward compatibility
    const firstSuccess = results.find((r) => r.success);
    return NextResponse.json(
      firstSuccess || results[0],
      { status: statusCode }
    );
  } catch (error) {
    logger.error('Document upload endpoint error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * Validate uploaded file
 */
async function validateFile(
  file: File
): Promise<{ valid: boolean; error?: string }> {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  // Check file type
  const filename = file.name.toLowerCase();
  const extension = filename.split('.').pop() || '';

  const formatMap: Record<string, string> = {
    pdf: 'pdf',
    docx: 'docx',
    xlsx: 'xlsx',
    xls: 'xlsx',
    csv: 'xlsx',
    txt: 'txt',
    text: 'txt',
  };

  const format = formatMap[extension];
  if (!format) {
    return {
      valid: false,
      error: `Unsupported file format: ${extension}. Supported formats: ${SUPPORTED_FORMATS.join(', ')}`,
    };
  }

  // Check MIME type (basic validation)
  const mimeTypeMap: Record<string, string[]> = {
    pdf: ['application/pdf'],
    docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'],
    txt: ['text/plain', 'text/csv'],
  };

  const expectedMimes = mimeTypeMap[format] || [];
  if (expectedMimes.length > 0 && !expectedMimes.includes(file.type)) {
    logger.warn('Unexpected MIME type', {
      filename: file.name,
      expected: expectedMimes,
      received: file.type,
    });
    // Don't fail on MIME type - many clients send wrong types
  }

  return { valid: true };
}

/**
 * GET endpoint for document upload status
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Get document details
    const document = await documentIngestionRepository.getDocument(documentId);
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Get ingestion status
    const status = await documentIngestionRepository.getIngestionStatus(documentId);

    return NextResponse.json({
      document: {
        id: document.id,
        filename: document.filename,
        format: document.format,
        parsing_confidence: document.parsing_confidence,
        created_at: document.created_at,
      },
      ingestion: status,
    });
  } catch (error) {
    logger.error('Document upload status endpoint error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
