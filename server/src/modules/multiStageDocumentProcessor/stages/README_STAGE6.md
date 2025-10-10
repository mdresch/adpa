# Stage 6: Output Formatting Implementation

## Overview

Stage 6 (Output Formatting) is the final stage in the multi-stage document processor pipeline. It converts documents from their internal Markdown representation to various output formats including PDF, DOCX, HTML, JSON, XML, and plain text.

## Key Components

### 1. OutputFormattingStage

The main stage implementation that orchestrates the format conversion process.

**Location**: `server/src/modules/multiStageDocumentProcessor/stages/outputFormattingStage.ts`

**Key Features**:
- Extracts Markdown content from quality-assessed documents
- Generates primary and secondary formats
- Provides comprehensive document metadata
- Calculates quality scores for format conversion
- Handles delivery options preparation

### 2. MultiFormatOutputEngine

A powerful format conversion engine that handles the actual conversion from Markdown to various formats.

**Location**: `server/src/modules/multiStageDocumentProcessor/engines/multiFormatOutputEngine.ts`

**Supported Formats**:
- **PDF**: High-quality PDF generation using Puppeteer
- **DOCX**: Microsoft Word documents using the `docx` library
- **HTML**: Styled HTML with customizable CSS
- **Markdown**: Cleaned and formatted Markdown
- **JSON**: Structured JSON representation
- **XML**: Well-formed XML documents
- **Text**: Plain text with formatting removed

**Key Features**:
- Singleton pattern for resource efficiency
- Configurable styling and page settings
- Metadata inclusion options
- Quality assessment for each format
- Resource cleanup and management

### 3. DocumentFormatService

A service layer that provides API-level document format conversion capabilities.

**Location**: `server/src/services/documentFormatService.ts`

**Features**:
- Database integration for document storage and retrieval
- Batch conversion support
- Format validation
- Conversion history tracking
- Markdown content storage management

### 4. API Routes

RESTful API endpoints for document format conversion.

**Location**: `server/src/routes/document-formats.ts`

**Endpoints**:
- `POST /api/documents/:id/convert` - Convert document to specified format
- `GET /api/documents/:id/formats` - Get available formats
- `POST /api/documents/batch-convert` - Batch convert multiple documents
- `GET /api/documents/:id/format-history` - Get conversion history
- `PUT /api/documents/:id/markdown` - Update document with Markdown content
- `GET /api/documents/format-options` - Get format conversion options schema

## Database Schema

### Enhanced Documents Table

The documents table has been enhanced with Markdown support:

```sql
-- New columns added
ALTER TABLE documents ADD COLUMN markdown_content TEXT;
ALTER TABLE documents ADD COLUMN format_metadata JSONB DEFAULT '{}';
ALTER TABLE documents ADD COLUMN output_formats JSONB DEFAULT '[]';
```

**Key Features**:
- `markdown_content`: Primary content stored in Markdown format
- `format_metadata`: Conversion settings and history
- `output_formats`: Array of supported output formats
- Automatic triggers to ensure Markdown content exists
- Full-text search indexing on Markdown content

## Usage Examples

### Basic Format Conversion

```typescript
import { MultiFormatOutputEngine } from './engines/multiFormatOutputEngine'

const engine = MultiFormatOutputEngine.getInstance()

// Convert to PDF
const pdfResult = await engine.convertFromMarkdown(
  markdownContent,
  'pdf',
  {
    pageSettings: { orientation: 'portrait', format: 'A4' },
    styling: { fontFamily: 'Arial', fontSize: 12 }
  }
)

// Convert to DOCX
const docxResult = await engine.convertFromMarkdown(
  markdownContent,
  'docx',
  { includeMetadata: true }
)
```

### Using the Document Format Service

```typescript
import { DocumentFormatService } from '../services/documentFormatService'

const formatService = new DocumentFormatService(db)

// Convert a document
const result = await formatService.convertDocument({
  documentId: 'doc-123',
  targetFormat: 'pdf',
  options: {
    pageSettings: { orientation: 'landscape' }
  }
})

// Store document with Markdown
await formatService.storeDocumentWithMarkdown(
  'doc-123',
  '# My Document\n\nContent here...',
  { source: 'user_input' }
)
```

### API Usage

```bash
# Convert document to PDF
curl -X POST /api/documents/123/convert \
  -H "Content-Type: application/json" \
  -d '{"format": "pdf", "options": {"pageSettings": {"orientation": "portrait"}}}'

# Get available formats
curl /api/documents/123/formats

# Update document with Markdown
curl -X PUT /api/documents/123/markdown \
  -H "Content-Type: application/json" \
  -d '{"content": "# My Document\n\nContent here..."}'
```

## Configuration Options

### Format Conversion Options

```typescript
interface FormatConversionOptions {
  includeMetadata?: boolean
  styling?: {
    fontFamily?: string
    fontSize?: number
    lineHeight?: number
    margins?: {
      top?: number
      bottom?: number
      left?: number
      right?: number
    }
  }
  pageSettings?: {
    orientation?: 'portrait' | 'landscape'
    format?: 'A4' | 'Letter' | 'Legal'
  }
}
```

### Output Configuration

```typescript
interface OutputConfig {
  primary_format: string
  secondary_formats: string[]
  include_metadata?: boolean
  styling?: any
  page_settings?: any
  delivery_options?: DeliveryOption[]
}
```

## Quality Assessment

The stage includes comprehensive quality assessment:

- **Format Quality**: Validates format-specific requirements
- **Content Integrity**: Ensures content is properly converted
- **Metadata Completeness**: Checks for required metadata fields
- **Delivery Options**: Validates delivery configurations

Quality scores are calculated based on:
- Primary format quality (40% weight)
- Secondary formats quality (30% weight)
- Metadata completeness (20% weight)
- Delivery options quality (10% weight)

## Error Handling

The implementation includes robust error handling:

- **Format Validation**: Validates supported formats before conversion
- **Graceful Degradation**: Continues processing if secondary formats fail
- **Resource Cleanup**: Ensures proper cleanup of browser instances
- **Detailed Logging**: Comprehensive logging for debugging

## Performance Considerations

- **Singleton Pattern**: MultiFormatOutputEngine uses singleton for resource efficiency
- **Browser Reuse**: Puppeteer browser instances are reused for PDF generation
- **Lazy Loading**: Resources are loaded only when needed
- **Memory Management**: Proper cleanup prevents memory leaks

## Testing

Comprehensive test suites are provided:

- **Unit Tests**: `outputFormattingStage.test.ts`
- **Engine Tests**: `multiFormatOutputEngine.test.ts`
- **Example Usage**: `multi-format-output-example.ts`

Run tests with:
```bash
npm test -- --testPathPattern=outputFormattingStage
npm test -- --testPathPattern=multiFormatOutputEngine
```

## Dependencies

### Required Libraries

- `marked`: Markdown to HTML conversion
- `docx`: DOCX document generation
- `puppeteer`: PDF generation via HTML
- `jspdf`: Alternative PDF generation (fallback)

### Installation

```bash
npm install marked docx puppeteer jspdf
npm install --save-dev @types/marked
```

## Migration

To enable the new format conversion features:

1. Run the database migration:
```bash
npm run migrate
```

2. Update existing documents:
```sql
SELECT extract_markdown_from_content();
```

3. Restart the server to load new routes

## Monitoring and Metrics

The stage provides detailed metrics:

- **Processing Time**: Time taken for format conversion
- **Format Generation Count**: Number of formats generated
- **Quality Scores**: Quality assessment results
- **Error Rates**: Conversion failure tracking

## Future Enhancements

Potential improvements for future versions:

1. **Additional Formats**: Support for PowerPoint, Excel, etc.
2. **Template-based Styling**: Custom styling templates
3. **Batch Optimization**: Improved batch processing performance
4. **Caching**: Format conversion result caching
5. **Streaming**: Large document streaming support

## Troubleshooting

### Common Issues

1. **PDF Generation Fails**
   - Ensure Puppeteer is properly installed
   - Check browser dependencies on the system

2. **DOCX Generation Issues**
   - Verify `docx` library version compatibility
   - Check for complex formatting requirements

3. **Memory Issues**
   - Ensure proper cleanup is called
   - Monitor browser instance usage

### Debug Mode

Enable debug logging:
```typescript
process.env.LOG_LEVEL = 'debug'
```

## Contributing

When contributing to Stage 6:

1. Follow the existing code patterns
2. Add comprehensive tests for new features
3. Update documentation for API changes
4. Ensure proper error handling
5. Test with various document types and sizes

## License

This implementation is part of the ADPA Framework and follows the project's licensing terms.