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

ADPA also has a project-document AI generation path in `server/src/routes/documentGeneration.ts`. This path is intentionally split by request shape:

| Request shape | Runtime path | Response contract |
| --- | --- | --- |
| `templateId` present | `getQueueService().addJob("ai-generate", jobPayload)` | `202 { jobId, async: true, message }` |
| `async: true` | `getQueueService().addJob("ai-generate", jobPayload)` | `202 { jobId, async: true, message }` |
| prompt-only, no template | `documentGenerationService.generateDocument(...)` inside the request | synchronous document response |

Template-based generation must stay asynchronous. The agentic template pipeline can run longer than the frontend proxy timeout, so the route returns a job ID and the UI tracks progress through job events instead of holding the HTTP request open. If the queue cannot accept the job, the route returns `503` with a queue-unavailable message rather than falling back to synchronous generation.

The queued worker path runs through `server/src/services/jobs/AIGenerationJobService.ts`. For template jobs, `AIGenerationJobService.generateContent(...)` lazy-loads `documentGenerationService.generateDocument(...)`; for legacy prompt jobs it uses the context-aware AI path. After content returns, `AIGenerationJobService.createDocument(...)` persists the document, calculates content stats, adds project/source context metadata, and emits job progress events.

### Empty-content guard

`AIGenerationJobService.createDocument(...)` refuses to persist empty generated content:

- it derives `docContent` from `result.content` or the raw result,
- it rejects empty or whitespace-only content,
- it logs `[AI-JOB] Refusing to persist empty document content`,
- it throws `AI_GENERATION_EMPTY_CONTENT`.

This protects the documents table from placeholder records when an upstream provider or generation step returns no usable Markdown. It is not a broad quality gate: very short non-empty output can still be persisted, so operators should use the emergency cleanup path below if a runaway job creates near-blank generated documents.

### Resiliency guards

The governed `document-generation-resiliency` feature packet covers the failure modes that should not regress:

| Guard | Source of truth |
| --- | --- |
| Requeue orphaned processing jobs on queue initialization | `server/src/services/queue/queueClient.ts` |
| Requeue stuck generation jobs even when the global requeue flag is disabled | `server/src/services/stuckJobMonitor.ts` |
| Replace unresolved `{{VARIABLES}}` with `[Not Provided]` before provider calls | `server/src/services/aiService.ts` |
| Treat 429 responses as temporary rate limits with backoff, not provider deactivation | `server/src/services/aiService.ts` |

Run the packet with:

```bash
cd server
npm run test:features -- document-generation-resiliency
npm run verify:governed-features
```

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

Queue an AI-generated project document from a template:

```bash
curl -X POST http://localhost:5000/api/document-generation/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "projectId": "0e65e53f-4f40-46d4-8ea3-2ed43f76565f",
    "name": "Project Charter Draft",
    "templateId": "6c3f6d4e-1a2b-4af9-a5d1-5f5b0d3d4b20",
    "userPrompt": "Generate a concise PMBOK-aligned charter for sponsor review.",
    "provider": "openai",
    "model": "gpt-4o-mini",
    "temperature": 0.7
  }'
```

This route uses camelCase keys (`projectId`, `templateId`, `userPrompt`). The queue payload created by the route uses worker-oriented keys such as `template_id` and `prompt`; clients should not send those worker keys directly.

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

## Operational Runbook: AI Generation Emergency Stop

Use the emergency stop only when active or stuck jobs are consuming backend resources or recent generated blank documents need immediate cleanup. It is intentionally broad and destructive.

### Check status

Users whose token passes `jobs.admin` can inspect the current risk level:

```bash
curl http://localhost:5000/api/jobs/emergency-stop/status \
  -H "Authorization: Bearer $TOKEN"
```

The response includes:

```json
{
  "totalActiveJobs": 4,
  "byStatus": {
    "processing": { "count": 3, "oldest": "2026-06-22T15:40:00.000Z" },
    "stuck": { "count": 1, "oldest": "2026-06-22T15:10:00.000Z" }
  },
  "blankDocuments": 2,
  "dangerLevel": "warning"
}
```

`dangerLevel` is based on non-terminal jobs: more than 10 is `critical`, more than 3 is `warning`, otherwise `ok`.

### Trigger stop

```bash
curl -X POST http://localhost:5000/api/jobs/emergency-stop \
  -H "Authorization: Bearer $TOKEN"
```

The route:

1. marks every `pending`, `processing`, and `stuck` row in `jobs` as `cancelled`;
2. sets `completed_at` and an `error_message` naming the operator;
3. deletes generated documents created in the last 24 hours when `content` is null or trimmed content is shorter than 200 characters and `generation_metadata` is present;
4. emits `job:emergency-stop` over Socket.io;
5. returns killed-job and deleted-document counts grouped by queue.

The Jobs page (`/jobs`) polls `/api/jobs/emergency-stop/status` every 10 seconds for admins and users with `jobs.admin`. When active/stuck jobs exist, it shows a warning or critical banner with a confirmation button that calls the same POST endpoint.

## Common Pitfalls

<Callout type="warn">Required template variables are enforced in `processTemplate(...)`. If a variable is marked `required` and has no default, generation fails with `MISSING_VARIABLES` before any renderer runs. This is a template-contract issue, not a PDF or DOCX bug.</Callout>

<Callout type="warn">The download route is public except for filename guessing resistance. `GET /api/document-generator/download/:filename` is not behind the auth middleware, so you should treat the generated filename as a capability-like secret and avoid exposing predictable names.</Callout>

<Callout type="warn">Generation statistics are currently placeholder values. `getGenerationStats(...)` returns a mock object rather than querying historical data, so do not use that endpoint as an operational analytics source without extending the implementation.</Callout>

<Callout type="warn">Do not use the emergency stop as routine job cleanup. It cancels all non-terminal jobs across queues, not only document-generation jobs, and it permanently deletes recent generated near-blank documents.</Callout>

<Callout type="warn">Do not bypass the queue for template generation. If RabbitMQ or the queue service is unavailable, return the `503` queue-unavailable response and retry later; synchronous template generation can time out and leave users with unrecoverable proxy errors.</Callout>

## Trade-offs

<Accordions>
<Accordion title="Markdown-first processing vs format-specific template authoring">
ADPA’s generator resolves template variables before it commits to a final export format. That keeps the authoring model unified and makes it easier to add new renderers later, because the same logical document can be emitted as Markdown, HTML, PDF, or DOCX. The trade-off is that ultra-specific layout tricks do not belong in the main template; they must be expressed as generation options or renderer logic. If a team wants pixel-perfect per-format authoring, it will gain layout control but lose the platform’s reuse advantage.
</Accordion>
<Accordion title="Adobe PDF path vs built-in PDF path">
The type layer exposes Adobe PDF options because some enterprise outputs need protection, linearization, or higher-fidelity PDF workflows. That gives operators a path to premium features without changing the top-level request contract. The trade-off is operational complexity: Adobe credentials, extra API behavior, and different failure modes enter the generation path. Use the Adobe path for compliance-sensitive output, not for every internal draft.
</Accordion>
</Accordions>
