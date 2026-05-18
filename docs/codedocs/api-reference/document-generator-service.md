---
title: "DocumentGeneratorService"
description: "Reference for document generation methods, request options, output formats, and download endpoints."
---

Import path: `@/modules/documentGenerator`  
Primary source files: `server/src/modules/documentGenerator/index.ts`, `service.ts`, `routes.ts`, `controller.ts`, `types.ts`, `validation.ts`

`DocumentGeneratorService` takes a template plus data and produces a file artifact. The module also exposes public routes under `/api/document-generator`.

## Constructor

```ts
class DocumentGeneratorService {
  constructor(config?: Partial<DocumentGeneratorConfig>)
}
```

The singleton export is:

```ts
export const documentGeneratorService = new DocumentGeneratorService();
```

### `DocumentGeneratorConfig`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `output_directory` | `string` | `process.env.DOCUMENT_OUTPUT_DIR \|\| './generated-documents'` | Final output directory. |
| `temp_directory` | `string` | `process.env.DOCUMENT_TEMP_DIR \|\| './temp'` | Temporary working directory. |
| `max_file_size` | `number` | `52428800` | Maximum output size in bytes. |
| `max_generation_time` | `number` | `300000` | Soft runtime ceiling in milliseconds. |
| `cleanup_after_hours` | `number` | `24` | File cleanup window. |
| `pdf_options` | `PdfGenerationOptions` | built-in defaults | Default PDF renderer options. |
| `docx_options` | `DocxGenerationOptions` | built-in defaults | Default DOCX renderer options. |
| `markdown_options` | `MarkdownGenerationOptions` | built-in defaults | Default Markdown output options. |

## Core Methods

### `generateDocument`

```ts
async generateDocument(
  request: DocumentGenerationRequest,
  user: AuthenticatedUser
): Promise<DocumentGenerationResponse>
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `request` | `DocumentGenerationRequest` | — | Template ID, data payload, output format, and optional generation overrides. |
| `user` | `AuthenticatedUser` | — | Used for template access and metadata. |

Supported `OutputFormat` values are `markdown`, `pdf`, `docx`, and `html`.

### `getGenerationStatus`

```ts
async getGenerationStatus(id: string): Promise<GenerationJob | null>
```

Reads the cached generation record by ID.

### `getGenerationStats`

```ts
async getGenerationStats(user: AuthenticatedUser): Promise<GenerationStats>
```

Returns a placeholder stats object in the current implementation.

### `cleanupOldFiles`

```ts
async cleanupOldFiles(): Promise<void>
```

Removes expired files from the configured output directory.

## Route Surface

```text
GET  /api/document-generator/download/:filename
POST /api/document-generator/generate
GET  /api/document-generator/generation/:id/status
GET  /api/document-generator/generation/stats
GET  /api/document-generator/formats
POST /api/document-generator/validate
```

## Key Types

```ts
interface DocumentGenerationRequest {
  template_id: string;
  data: Record<string, any>;
  output_format: OutputFormat;
  options?: GenerationOptions;
}
```

```ts
interface GenerationOptions {
  filename?: string;
  page_size?: PageSize;
  orientation?: PageOrientation;
  margins?: PageMargins;
  include_toc?: boolean;
  include_header?: boolean;
  include_footer?: boolean;
  header_template?: string;
  footer_template?: string;
  css_styles?: string;
  quality?: number;
  compress?: boolean;
  use_adobe_pdf?: boolean;
  adobe_quality?: 'low' | 'medium' | 'high';
  adobe_compress?: boolean;
  adobe_linearize?: boolean;
  adobe_protect?: boolean;
}
```

## Usage Example

```ts
import { documentGeneratorService, OutputFormat } from '@/modules/documentGenerator';

const result = await documentGeneratorService.generateDocument({
  template_id: template.id,
  output_format: OutputFormat.HTML,
  data: {
    projectName: 'Northwind Modernization',
    objective: 'Automate governance reporting'
  }
}, currentUser);
```

## Combined Pattern

Combine multiple methods when you want a full operational flow:

```ts
const response = await documentGeneratorService.generateDocument(request, currentUser);
const status = await documentGeneratorService.getGenerationStatus(response.id);
```

That pattern is common when a UI wants an immediate generation response plus a normalized status object for later refreshes.
