# Document Processing

The document processing subsystem stores canonical document content as Markdown,
then converts that Markdown to download formats when users request exports.

## Documentation

- **[Ingestion](ingest.md)**: How documents enter the system.
- **[Parsing](parse.md)**: OCR, layout analysis, and text extraction.
- **[Classification](classify.md)**: Identifying document types such as invoices or contracts.
- **[Extraction](extract.md)**: Getting structured data such as amounts and dates.

## Current export workflows

The project documents page (`app/projects/[id]/documents/page.tsx`) supports
bulk actions for selected documents. The current dedicated backend export
handlers live in `server/src/modules/documents/` and are mounted both through
the legacy `/api/documents` path and the modular `/api/v1/documents` route map.

| Workflow | Endpoint | Output | Source code |
| --- | --- | --- | --- |
| Single document PDF | `GET /api/documents/:id/export/pdf` | PDF stream | `DocumentsController.exportPdf` |
| Single document DOCX | `GET /api/documents/:id/export/docx` | DOCX stream | `DocumentsController.exportDocx`, `DocxService.generateDocx` |
| Bulk PDF | `POST /api/documents/bulk-export/pdf` | ZIP of per-document PDFs | `DocumentsController.bulkExportPdf` |
| Bulk DOCX | `POST /api/documents/bulk-export/docx` | One combined DOCX file | `DocumentsController.bulkExportDocx`, `buildCombinedDocxExport` |

All routes in `server/src/modules/documents/routes.ts` require
`authenticateToken`. Single-document exports call `checkProjectAccess` before
generating a file. Bulk exports currently rely on route authentication and the
submitted document IDs; bulk DOCX validates every submitted ID as a UUID before
querying the database, while bulk PDF does not yet perform that UUID validation.
Neither bulk export handler performs a per-document project access check in the
current controller implementation.

### Bulk DOCX request

```http
POST /api/documents/bulk-export/docx
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "document_ids": [
    "1f5b7f5a-7a31-4e3b-9c6d-487d3bc6d001",
    "5fca5d51-3314-45a2-9477-7c4d4e0b3102"
  ]
}
```

The response uses:

```http
Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document
Content-Disposition: attachment; filename="combined-project-documents.docx"
```

The combined export preserves the requested document order, inserts each
document as a Markdown section headed by its document name, and separates
sections with a Markdown horizontal rule before DOCX generation.

## Conversion constraints and pitfalls

- Markdown remains the storage format. PDF and DOCX are generated on demand.
- `DocxService` converts Markdown tokens with `marked` and the `docx` package.
  It supports headings, paragraphs, lists, horizontal rules, tables, links,
  inline code, emphasis, and images that can be fetched by URL.
- Unsupported or malformed Markdown tokens are rendered as plain text when
  possible rather than failing the whole export.
- Dedicated bulk export routes currently exist for `pdf` and `docx` only.
  Generic format conversion endpoints are implemented separately in
  `server/src/routes/document-formats.ts`.
- Frontend download filenames come from `Content-Disposition` when present;
  otherwise `lib/documents/bulk-export.ts` falls back to a timestamped
  `documents-export-*` name based on the response content type.

## Verification anchors

- Backend export tests:
  - `server/src/__tests__/modules/documents/bulkDocxExport.test.ts`
  - `server/src/__tests__/unit/docxService.test.ts`
- Frontend filename helper tests:
  - `__tests__/lib/bulkDocumentExport.test.ts`

---

Back: [Feature List](../../feature-list.md)
