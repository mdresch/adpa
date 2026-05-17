
// This API route was removed because it imported backend-only dependencies.
// Please POST document uploads directly to the backend Express API (e.g., /api/v1/documents/upload).

// See README or integration notes for correct upload endpoint.

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
