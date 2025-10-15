# Adobe PDF Services Integration

This document provides comprehensive information about the Adobe PDF Services integration in the ADPA Framework.

## Overview

The Adobe PDF Services integration provides premium PDF generation capabilities using Adobe's enterprise-grade PDF processing technology. This integration offers superior quality, advanced features, and reliable performance compared to standard PDF generators.

## Features

### Core Capabilities
- **Premium PDF Generation**: High-quality PDF creation from HTML content
- **Document Conversion**: Convert DOCX files to PDF with high fidelity
- **Format Export**: Export PDFs to DOCX, PPTX, XLSX, RTF, JPEG, PNG
- **OCR Processing**: Optical Character Recognition for scanned documents
- **Compression**: Intelligent compression while maintaining quality
- **Linearization**: Fast web view optimization
- **Security**: Password protection and permission controls

### Quality Improvements
- Superior text rendering and font handling
- Better layout preservation
- Professional-grade output quality
- Consistent results across different content types

## Setup and Configuration

### Prerequisites
1. Adobe PDF Services account
2. Adobe API credentials (Client ID, Client Secret)
3. Node.js environment with the ADPA Framework

### Environment Variables

Add the following variables to your `.env` file:

```bash
# Adobe PDF Services Configuration
ADOBE_PDF_ENABLED=true
ADOBE_CLIENT_ID=your-adobe-client-id
ADOBE_CLIENT_SECRET=your-adobe-client-secret
ADOBE_ORGANIZATION_ID=your-adobe-organization-id
ADOBE_ACCOUNT_ID=your-adobe-account-id
ADOBE_PRIVATE_KEY=your-adobe-private-key
ADOBE_OUTPUT_DIR=./generated-documents/adobe-pdf
ADOBE_TEMP_DIR=./temp/adobe-pdf
```

### Installation

The Adobe PDF Services SDK is automatically installed with the server dependencies:

```bash
cd server
npm install
```

## API Reference

### Authentication

All API endpoints require authentication using JWT tokens:

```javascript
headers: {
  'Authorization': 'Bearer your-jwt-token'
}
```

### Endpoints

#### Get Service Status
```http
GET /api/adobe-pdf/status
```

Returns the current status of Adobe PDF Services.

**Response:**
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "initialized": true,
    "credentialsConfigured": true,
    "connectionTest": true
  }
}
```

#### Generate PDF from HTML
```http
POST /api/adobe-pdf/generate-from-html
```

**Request Body:**
```json
{
  "html": "<html>...</html>",
  "filename": "document.pdf",
  "options": {
    "quality": "high",
    "compress": true,
    "linearize": true,
    "protect": false,
    "documentLanguage": "en-US",
    "includeTaggedPDF": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "filename": "document.pdf",
    "filePath": "/path/to/document.pdf",
    "fileSize": 1024000,
    "metadata": {
      "processingTime": 2500,
      "compressionRatio": 1.2
    },
    "downloadUrl": "/api/adobe-pdf/download/document.pdf"
  }
}
```

#### Convert DOCX to PDF
```http
POST /api/adobe-pdf/convert-docx
```

**Request:** Multipart form data with DOCX file

**Response:**
```json
{
  "success": true,
  "data": {
    "filename": "converted.pdf",
    "filePath": "/path/to/converted.pdf",
    "fileSize": 512000,
    "downloadUrl": "/api/adobe-pdf/download/converted.pdf"
  }
}
```

#### Export PDF to Other Formats
```http
POST /api/adobe-pdf/export/:format
```

**Supported formats:** `docx`, `pptx`, `xlsx`, `rtf`, `jpeg`, `png`

**Request:** Multipart form data with PDF file

#### Perform OCR
```http
POST /api/adobe-pdf/ocr
```

**Request:** Multipart form data with PDF file

#### Generate Sample PDF
```http
POST /api/adobe-pdf/sample
```

Generates a sample PDF demonstrating the integration capabilities.

#### Download File
```http
GET /api/adobe-pdf/download/:filename
```

Downloads a generated file.

#### Test Connection
```http
GET /api/adobe-pdf/test-connection
```

Tests the connection to Adobe PDF Services.

## Usage Examples

### Basic PDF Generation

```javascript
// Generate premium PDF from HTML
const response = await fetch('/api/adobe-pdf/generate-from-html', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-jwt-token'
  },
  body: JSON.stringify({
    html: htmlContent,
    filename: 'premium-document.pdf',
    options: {
      quality: 'high',
      compress: true,
      linearize: true
    }
  })
});

const result = await response.json();
if (result.success) {
  console.log('PDF generated:', result.data.downloadUrl);
}
```

### Document Generator Integration

The Adobe PDF Services integration is automatically available in the Document Generator:

```javascript
// Use Adobe PDF Services in document generation
const generationRequest = {
  template_id: 'your-template-id',
  data: { /* template data */ },
  output_format: 'pdf',
  options: {
    use_adobe_pdf: true,
    adobe_quality: 'high',
    adobe_compress: true,
    adobe_linearize: true,
    document_language: 'en-US'
  }
};

const result = await documentGeneratorService.generateDocument(
  generationRequest,
  user
);
```

### File Upload and Conversion

```javascript
// Convert DOCX to PDF
const formData = new FormData();
formData.append('docx', docxFile);
formData.append('filename', 'converted-document.pdf');

const response = await fetch('/api/adobe-pdf/convert-docx', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your-jwt-token'
  },
  body: formData
});
```

## Configuration Options

### PDF Generation Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `quality` | string | PDF quality: 'low', 'medium', 'high' | 'medium' |
| `compress` | boolean | Enable PDF compression | false |
| `linearize` | boolean | Enable fast web view | false |
| `protect` | boolean | Enable password protection | false |
| `password` | string | Password for protection | - |
| `documentLanguage` | string | Document language (e.g., 'en-US') | 'en-US' |
| `includeTaggedPDF` | boolean | Include accessibility tags | false |

### Permission Options

When `protect` is enabled, you can specify permissions:

```javascript
{
  protect: true,
  password: 'your-password',
  permissions: {
    print: true,
    editContent: false,
    editDocumentAssembly: false,
    editAnnotations: true,
    fillAndSign: true,
    extractForAccessibility: true,
    extract: false
  }
}
```

## Error Handling

The integration includes comprehensive error handling with fallback to Puppeteer:

```javascript
// If Adobe PDF Services fails, the system automatically falls back to Puppeteer
if (options?.use_adobe_pdf) {
  try {
    // Try Adobe PDF Services
    const result = await adobePdfService.generatePremiumPDF(/* ... */);
    if (result.success) {
      return result.filePath;
    }
  } catch (error) {
    logger.warn('Adobe PDF generation failed, falling back to Puppeteer');
  }
}

// Fallback to Puppeteer
return await generateWithPuppeteer(/* ... */);
```

## Monitoring and Logging

The integration includes comprehensive logging:

```javascript
// Service initialization
logger.info('Adobe PDF Services initialized successfully');

// Generation tracking
logger.info('Adobe PDF generation completed', {
  filename,
  fileSize: result.fileSize,
  processingTime: result.metadata?.processingTime,
  compressionRatio: result.metadata?.compressionRatio
});

// Error tracking
logger.error('Adobe PDF generation failed', { error: error.message });
```

## Demo and Testing

### Run the Demo

```bash
cd server
npm run demo:adobe-pdf
```

Or run the demo script directly:

```bash
npx tsx src/demo/adobe-pdf-demo.ts
```

### Generate Sample PDF

```bash
curl -X POST http://localhost:5000/api/adobe-pdf/sample \
  -H "Authorization: Bearer your-jwt-token"
```

## Troubleshooting

### Common Issues

1. **Service Not Enabled**
   - Ensure `ADOBE_PDF_ENABLED=true` in your environment
   - Check that all required credentials are configured

2. **Authentication Errors**
   - Verify your Adobe Client ID and Client Secret
   - Check that your Adobe account has PDF Services enabled

3. **File Not Found Errors**
   - Ensure output directories exist and are writable
   - Check file permissions

4. **Connection Timeouts**
   - Adobe PDF Services may take time for large documents
   - Consider increasing timeout values for large files

### Debug Mode

Enable debug logging:

```bash
LOG_LEVEL=debug npm run dev
```

### Health Check

Check service health:

```bash
curl http://localhost:5000/api/adobe-pdf/status
```

## Performance Considerations

### File Size Limits
- Maximum file size: 50MB (configurable)
- Large files may take longer to process
- Consider compression for large documents

### Processing Time
- Adobe PDF Services processing is typically 2-5 seconds
- Complex documents may take longer
- Fallback to Puppeteer if Adobe services are unavailable

### Caching
- Generated PDFs are cached in the output directory
- Implement cleanup policies for old files
- Consider CDN integration for frequently accessed files

## Security

### API Security
- All endpoints require authentication
- File access is restricted to authorized users
- Path traversal protection is implemented

### Document Security
- Password protection available
- Permission controls for PDF access
- Secure file storage and cleanup

## Integration with ADPA Framework

### Document Templates
- Adobe PDF Services integrates seamlessly with document templates
- Use `use_adobe_pdf: true` in generation options
- Automatic fallback to standard PDF generation

### Workflow Integration
- Compatible with existing document generation workflows
- Supports batch processing
- Integrates with job queues for large-scale operations

## Support and Resources

### Adobe PDF Services Documentation
- [Adobe PDF Services API Documentation](https://developer.adobe.com/document-services/docs/)
- [Adobe PDF Services SDK](https://github.com/adobe/pdfservices-node-sdk)

### ADPA Framework Resources
- Check the main ADPA documentation for general framework usage
- See the Document Generator module documentation for template usage

## License and Usage

This integration uses the Adobe PDF Services SDK, which requires:
- Valid Adobe PDF Services account
- Compliance with Adobe's terms of service
- Appropriate licensing for your use case

Ensure you have the necessary licenses and comply with Adobe's usage policies when using this integration in production environments.