# Document Generator Module

The Document Generator module provides a comprehensive engine for converting templates combined with data into various document formats including Markdown, PDF, DOCX, and HTML.

## Features

- **Multiple Output Formats**: Support for Markdown, PDF, DOCX, and HTML generation
- **Template Processing**: Handlebars-based template engine with variable substitution
- **Flexible Configuration**: Customizable page sizes, margins, styles, and formatting options
- **Async Generation**: Non-blocking document generation with status tracking
- **File Management**: Automatic cleanup of old generated files
- **Security**: Input validation and sanitization to prevent security vulnerabilities
- **Integration**: Seamless integration with existing template management system

## Supported Output Formats

### Markdown (.md)
- Lightweight markup format
- Optional frontmatter (YAML, JSON, TOML)
- Table of contents generation
- Version control friendly

### PDF (.pdf)
- High-quality document format using Puppeteer
- Customizable page sizes (A4, A3, A5, Letter, Legal, Tabloid)
- Portrait/landscape orientation
- Custom headers and footers
- CSS styling support

### DOCX (.docx)
- Microsoft Word compatible format
- Structured document with proper headings
- Customizable fonts and spacing
- Professional formatting

### HTML (.html)
- Web-ready format
- Custom CSS styling
- Interactive elements support
- Responsive design

## API Endpoints

### Generate Document
```http
POST /api/document-generator/generate
```

**Request Body:**
```json
{
  "template_id": "uuid",
  "data": {
    "variable1": "value1",
    "variable2": "value2"
  },
  "output_format": "pdf|docx|markdown|html",
  "options": {
    "filename": "custom-name.pdf",
    "page_size": "A4",
    "orientation": "portrait",
    "margins": {
      "top": "1in",
      "right": "1in",
      "bottom": "1in",
      "left": "1in"
    },
    "include_header": true,
    "header_template": "<div>Header content</div>",
    "css_styles": "body { font-family: Arial; }"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "generation-uuid",
    "status": "completed",
    "output_format": "pdf",
    "file_path": "/path/to/document.pdf",
    "file_url": "/api/documents/download/document.pdf",
    "file_size": 1024,
    "metadata": {
      "template_name": "Template Name",
      "generated_by": "user-id",
      "generation_time_ms": 1500,
      "variables_used": ["variable1", "variable2"]
    },
    "created_at": "2024-01-01T00:00:00Z",
    "completed_at": "2024-01-01T00:00:01Z"
  }
}
```

### Get Generation Status
```http
GET /api/document-generator/generation/{id}/status
```

### Download Document
```http
GET /api/document-generator/download/{filename}
```

### Get Supported Formats
```http
GET /api/document-generator/formats
```

### Validate Template Data
```http
POST /api/document-generator/validate
```

## Template Processing

The module uses Handlebars as the template engine, supporting:

### Variable Substitution
```handlebars
# {{title}}

Author: {{author}}
Date: {{formatDate created_at "YYYY-MM-DD"}}

{{content}}
```

### Built-in Helpers
- `formatDate`: Format dates
- `uppercase`: Convert to uppercase
- `lowercase`: Convert to lowercase
- `eq`, `ne`, `gt`, `lt`: Comparison operators

### Conditional Logic
```handlebars
{{#if show_toc}}
## Table of Contents
{{/if}}

{{#each items}}
- {{this.name}}
{{/each}}
```

## Configuration

### Environment Variables
```bash
DOCUMENT_OUTPUT_DIR=./generated-documents
DOCUMENT_TEMP_DIR=./temp
```

### Service Configuration
```typescript
const config = {
  output_directory: './generated-documents',
  temp_directory: './temp',
  max_file_size: 50 * 1024 * 1024, // 50MB
  max_generation_time: 300000, // 5 minutes
  cleanup_after_hours: 24,
  pdf_options: {
    format: 'A4',
    orientation: 'portrait',
    margins: { top: '1in', right: '1in', bottom: '1in', left: '1in' }
  }
}
```

## Usage Examples

### Basic Document Generation
```typescript
import { documentGeneratorService } from './modules/documentGenerator'

const request = {
  template_id: 'template-uuid',
  data: {
    title: 'My Document',
    content: 'Document content here'
  },
  output_format: OutputFormat.PDF
}

const result = await documentGeneratorService.generateDocument(request, user)
```

### Custom Options
```typescript
const request = {
  template_id: 'template-uuid',
  data: { title: 'Report', content: 'Report content' },
  output_format: OutputFormat.PDF,
  options: {
    filename: 'monthly-report.pdf',
    page_size: 'Letter',
    orientation: 'landscape',
    include_header: true,
    header_template: '<div style="text-align: center;">Monthly Report</div>'
  }
}
```

## Error Handling

The module provides detailed error information:

```typescript
try {
  const result = await documentGeneratorService.generateDocument(request, user)
} catch (error) {
  if (error.code === 'TEMPLATE_NOT_FOUND') {
    // Handle template not found
  } else if (error.code === 'MISSING_VARIABLES') {
    // Handle missing required variables
  } else if (error.code === 'GENERATION_ERROR') {
    // Handle generation failure
  }
}
```

## Security Considerations

- **Input Validation**: All inputs are validated using Joi schemas
- **Path Traversal Protection**: Filenames are sanitized to prevent directory traversal
- **CSS Sanitization**: CSS inputs are checked for potentially dangerous content
- **File Size Limits**: Generated files are limited to prevent resource exhaustion
- **Timeout Protection**: Generation processes have maximum time limits

## Performance

- **Async Processing**: Non-blocking document generation
- **Caching**: Template and generation status caching
- **Cleanup**: Automatic removal of old generated files
- **Resource Management**: Proper cleanup of Puppeteer instances

## Dependencies

- **handlebars**: Template processing
- **marked**: Markdown parsing
- **puppeteer**: PDF generation
- **docx**: DOCX document creation
- **joi**: Input validation

## Testing

Run tests with:
```bash
npm test -- --testPathPattern=documentGenerator
```

## Integration

The module integrates with:
- **Document Templates Module**: For template retrieval
- **Authentication System**: For user permissions
- **Redis Cache**: For status tracking and caching
- **File System**: For document storage and cleanup