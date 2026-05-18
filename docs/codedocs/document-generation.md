---
title: "Document Generation"
description: "Follow the path from a validated template request to a generated PDF, DOCX, Markdown, or HTML file."
---

Document generation is the runtime half of ADPA’s template system. It takes a template, merges it with data, renders the content, records generation metadata, and optionally triggers follow-up work such as Confluence publishing and entity extraction.

## What This Concept Is

The core contract is `DocumentGenerationRequest` from `server/src/modules/documentGenerator/types.ts`:

```ts
interface DocumentGenerationRequest {
  template_id: string;
  data: Record<string, any>;
  output_format: OutputFormat;
  options?: GenerationOptions;
}
```

It exists so callers can submit structured data once and choose a rendering format later. That split is why the service can support Markdown, PDF, DOCX, and HTML without changing the main request shape.

## How It Relates To Other Concepts

- It depends on [Document Templates](/docs/document-templates) for the content contract.
- It can be enriched by [Context Injection](/docs/context-injection) before or during AI generation.
- It records template usage, which feeds lifecycle and analytics decisions.
- It can hand results to downstream integrations or extraction jobs after generation succeeds.

## How It Works Internally

The main logic lives in `server/src/modules/documentGenerator/service.ts`.

`DocumentGeneratorService.generateDocument(...)` follows a clear sequence:

1. create a generation ID and job record,
2. resolve template data through `documentTemplateService.getTemplateById`,
3. process the template through Handlebars,
4. branch on `output_format`,
5. stat the generated file,
6. persist metadata and update the job,
7. increment template usage,
8. enqueue post-generation hooks.

The post-generation hooks are a good example of ADPA’s platform shape. Generation is not the end of the request. The service may enqueue Confluence publishing and entity extraction after writing the file, which means downstream systems can react to one generation event without contaminating the core request schema.

Defaults matter here. The service’s `DEFAULT_CONFIG` sets:

- `output_directory` from `DOCUMENT_OUTPUT_DIR` or `./generated-documents`,
- `temp_directory` from `DOCUMENT_TEMP_DIR` or `./temp`,
- a 50 MB max file size,
- a 5 minute max generation time,
- 24 hour cleanup windows,
- default PDF, DOCX, and Markdown renderer settings.

Validation lives in `server/src/modules/documentGenerator/validation.ts`. It rejects bad UUIDs, invalid output formats, unsafe filenames, and malformed CSS-like page settings before the controller invokes the service.

## Basic Usage

Generate a PDF from a template:

```bash
curl -X POST http://localhost:5000/api/document-generator/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "template_id": "6c3f6d4e-1a2b-4af9-a5d1-5f5b0d3d4b20",
    "output_format": "pdf",
    "data": {
      "projectName": "Northwind Modernization",
      "objective": "Automate approval workflows",
      "sponsor": "Operations"
    }
  }'
```

Check generation status later:

```bash
curl http://localhost:5000/api/document-generator/generation/2bce8755-8b2f-4d36-b2ec-7f95e2e29996/status \
  -H "Authorization: Bearer $TOKEN"
```

## Advanced Usage

Request a DOCX with explicit page settings:

```json
{
  "template_id": "6c3f6d4e-1a2b-4af9-a5d1-5f5b0d3d4b20",
  "output_format": "docx",
  "data": {
    "projectName": "Board Reporting Refresh",
    "objective": "Standardize executive status packs"
  },
  "options": {
    "filename": "board-report.docx",
    "page_size": "A4",
    "orientation": "portrait",
    "margins": {
      "top": "1in",
      "right": "1in",
      "bottom": "1in",
      "left": "1in"
    },
    "include_toc": true,
    "quality": 100,
    "compress": false
  }
}
```

For PDF-specific runs, the type also exposes Adobe-oriented options such as `use_adobe_pdf`, `adobe_quality`, `adobe_protect`, and granular `adobe_permissions`.

## Common Pitfalls

<Callout type="warn">Required template variables are enforced in `processTemplate(...)`. If a variable is marked `required` and has no default, generation fails with `MISSING_VARIABLES` before any renderer runs. This is a template-contract issue, not a PDF or DOCX bug.</Callout>

<Callout type="warn">The download route is public except for filename guessing resistance. `GET /api/document-generator/download/:filename` is not behind the auth middleware, so you should treat the generated filename as a capability-like secret and avoid exposing predictable names.</Callout>

<Callout type="warn">Generation statistics are currently placeholder values. `getGenerationStats(...)` returns a mock object rather than querying historical data, so do not use that endpoint as an operational analytics source without extending the implementation.</Callout>

## Trade-offs

<Accordions>
<Accordion title="Markdown-first processing vs format-specific template authoring">
ADPA’s generator resolves template variables before it commits to a final export format. That keeps the authoring model unified and makes it easier to add new renderers later, because the same logical document can be emitted as Markdown, HTML, PDF, or DOCX. The trade-off is that ultra-specific layout tricks do not belong in the main template; they must be expressed as generation options or renderer logic. If a team wants pixel-perfect per-format authoring, it will gain layout control but lose the platform’s reuse advantage.
</Accordion>
<Accordion title="Adobe PDF path vs built-in PDF path">
The type layer exposes Adobe PDF options because some enterprise outputs need protection, linearization, or higher-fidelity PDF workflows. That gives operators a path to premium features without changing the top-level request contract. The trade-off is operational complexity: Adobe credentials, extra API behavior, and different failure modes enter the generation path. Use the Adobe path for compliance-sensitive output, not for every internal draft.
</Accordion>
</Accordions>
