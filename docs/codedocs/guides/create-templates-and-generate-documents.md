---
title: "Create Templates And Generate Documents"
description: "Build a reusable template, render it into a document, and download the generated artifact."
---

This guide solves the most common ADPA workflow: standardizing a document shape once and then generating repeatable outputs from project data.

## Problem

You want a repeatable document contract instead of rewriting the same charter or governance pack every time, and you want the final output in a downloadable format.

## Solution

Create a template first, then call the generator with structured data. The template remains reusable, while generation stays a runtime concern.

<Steps>
<Step>
### Create a template

```bash
curl -X POST http://localhost:5000/api/document-templates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Executive Brief",
    "framework": "Custom",
    "category": "Reporting",
    "content": {
      "template": "# {{title}}

## Situation
{{situation}}

## Decision Needed
{{decision}}"
    },
    "variables": [
      { "name": "title", "type": "text", "required": true },
      { "name": "situation", "type": "text", "required": true },
      { "name": "decision", "type": "text", "required": true }
    ]
  }'
```

</Step>
<Step>
### Capture the template ID

The template create response includes a `template.id`. Save it into an environment variable for the next call.

```bash
export TEMPLATE_ID=6c3f6d4e-1a2b-4af9-a5d1-5f5b0d3d4b20
```

</Step>
<Step>
### Generate a PDF

```bash
curl -X POST http://localhost:5000/api/document-generator/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    "template_id": "$TEMPLATE_ID",
    "output_format": "pdf",
    "data": {
      "title": "Quarterly Steering Committee Brief",
      "situation": "Schedule remains green, but release readiness depends on vendor sign-off.",
      "decision": "Approve a one-week contingency window for cutover."
    }
  }"
```

</Step>
<Step>
### Download the rendered file

The response includes `file_url` and `file_path`. The public download route is mounted under the document generator module.

```bash
curl -O "http://localhost:5000/api/document-generator/download/your-generated-file.pdf"
```

</Step>
</Steps>

## Complete Runnable Example

```bash
export BASE_URL=http://localhost:5000
export TOKEN=replace-me

TEMPLATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/document-templates" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Change Request Summary",
    "framework": "Custom",
    "category": "Governance",
    "content": {
      "template": "# {{changeTitle}}

## Reason
{{reason}}

## Impact
{{impact}}"
    },
    "variables": [
      { "name": "changeTitle", "type": "text", "required": true },
      { "name": "reason", "type": "text", "required": true },
      { "name": "impact", "type": "text", "required": true }
    ]
  }')

echo "$TEMPLATE_RESPONSE"

TEMPLATE_ID=$(node -e "const r = JSON.parse(process.argv[1]); console.log(r.template.id)" "$TEMPLATE_RESPONSE")

curl -s -X POST "$BASE_URL/api/document-generator/generate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    "template_id": "$TEMPLATE_ID",
    "output_format": "html",
    "data": {
      "changeTitle": "Cutover window extension",
      "reason": "Vendor certification is one sprint behind.",
      "impact": "Launch date moves by five business days."
    }
  }"
```

This uses `server/src/modules/documentTemplates/routes.ts` and `server/src/modules/documentGenerator/routes.ts`. If the call fails with `MISSING_VARIABLES`, inspect the template’s `variables` array before debugging the renderer.
