---
title: "Getting Started"
description: "Understand what ADPA does, install the workspace, and run the smallest useful end-to-end flow."
---

ADPA is an enterprise document-processing platform that combines template-driven authoring, context-aware AI generation, external integrations, and multi-format exports behind a Next.js frontend and an Express API.

## The Problem

- Project teams rarely write one document from scratch; they rewrite the same charter, plan, review pack, or governance note with inconsistent structure.
- AI generation without project context produces fluent output that ignores the latest requirements, stakeholders, baseline decisions, and document history.
- Integrations such as Confluence, Jira, SharePoint, and provider-specific model APIs create operational sprawl, duplicated configuration, and inconsistent permissions.
- Exporting the same source content into Markdown, PDF, DOCX, and HTML usually turns formatting into a second pipeline instead of a final rendering choice.

## The Solution

ADPA treats templates, context, AI providers, and export formats as separate but composable building blocks. Templates are stored in the database, context can be injected from project data and document history, AI requests can fail over between providers, and generated output can be rendered into multiple formats from the same processing path.

```ts
const response = await fetch('http://localhost:5000/api/document-generator/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    template_id: '6c3f6d4e-1a2b-4af9-a5d1-5f5b0d3d4b20',
    output_format: 'pdf',
    data: {
      projectName: 'Northwind Modernization',
      sponsor: 'Operations',
      objective: 'Replace spreadsheet-based approvals with a governed workflow.',
    },
  }),
});

const { data } = await response.json();
console.log(data.file_url);
```

The request above follows the public document generator route mounted in `server/src/server.ts` and implemented by `server/src/modules/documentGenerator/routes.ts`, `controller.ts`, and `service.ts`.

## Installation

<Tabs items={["npm", "pnpm", "yarn", "bun"]}>
<Tab value="npm">

```bash
cd /workspace/home/adpa
npm install
cd server
npm install
```

</Tab>
<Tab value="pnpm">

```bash
cd /workspace/home/adpa
pnpm install
cd server
npm install
```

</Tab>
<Tab value="yarn">

```bash
cd /workspace/home/adpa
yarn install
cd server
npm install
```

</Tab>
<Tab value="bun">

```bash
cd /workspace/home/adpa
bun install
cd server
npm install
```

</Tab>
</Tabs>

The workspace expects Node.js 18+, a PostgreSQL-compatible database, and Redis. The source repo also includes frontend and backend environment examples in `.env.local.example` and `server/.env.example`.

## Quick Start

Use the health endpoint first. It verifies that the Express server is running before you spend time debugging authentication, templates, or integrations.

```bash
cd /workspace/home/adpa
cp .env.local.example .env.local
cd server
cp .env.example .env
npm run dev
```

In another terminal:

```bash
curl http://localhost:5000/health
```

Expected output:

```json
{
  "status": "ok"
}
```

After the health check passes, the smallest meaningful ADPA workflow is:

1. Create or retrieve a template through `/api/document-templates`.
2. Submit structured data to `/api/document-generator/generate`.
3. Download the generated artifact from `/api/document-generator/download/:filename`.

## Key Features

- Next.js frontend with `/api/*` rewrites to the Express backend in `next.config.mjs`.
- Template lifecycle management with pagination, cloning, trash, and restore flows.
- Multi-format document generation for Markdown, PDF, DOCX, and HTML.
- Two context systems: a lightweight injector and a newer orchestrator with access-control, freshness, and metrics.
- Multi-provider AI support spanning OpenAI, Google AI, and local Ollama, plus a generic fallback executor.
- Project-scoped OpenUI chat threads that return structured UI payloads over SSE.
- Knowledge-base workflows for storing reusable improvements, reviews, and application outcomes.

<Cards>
  <Card title="Architecture" href="/docs/architecture">How the frontend, API, modules, data stores, and integrations fit together.</Card>
  <Card title="Core Concepts" href="/docs/document-templates">Start with the abstractions that shape every request: templates, context, providers, and knowledge reuse.</Card>
  <Card title="OpenUI Chat" href="/docs/openui-chat">Project-scoped chat routes, storage, auth modes, and operational constraints.</Card>
  <Card title="API Reference" href="/docs/api-reference/document-template-service">Method signatures, route surfaces, constructor options, and source-file pointers.</Card>
</Cards>
