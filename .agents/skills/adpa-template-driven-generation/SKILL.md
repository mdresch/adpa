# ADPA Template-Driven Generation

## Core Principle: Generic Engine, Specific Templates

The ADPA document generation engine (`documentGenerationService.ts`) must remain **template-agnostic**. It is an "Engine" designed to execute a generic two-phase pipeline: **Plan** (Structure) and **Draft** (Content).

Specific knowledge, standards (like INVEST), drafting formats, and extraction priorities must **never** be hardcoded into the TypeScript service. Instead, they must be stored in the `templates` database record.

---

## When to Use This Skill

- When adding a new document template to the system.
- When asked to "harden" or "improve" the quality of a specific document type (e.g., "Make User Stories follow INVEST").
- When modifying how the AI planning phase identifies sections for a specific template.
- When you are tempted to write `if (templateName === '...')` in any core service.

---

## The Feedback Loop Architecture

| Layer | Responsibility | Persistence |
|---|---|---|
| **Engine** | Executes parallel drafting, handles GKG context, and performs global deduplication. | `documentGenerationService.ts` |
| **Strategy** | Defines the section structure (Paragraphs) and specific drafting instructions. | `templates` table (DB) |
| **Logic** | `system_prompt` provides the "Persona" and "Rules" for that specific document. | `templates.system_prompt` |
| **Structure** | `template_paragraphs` define the fixed headings and specific section goals. | `template_paragraphs` (JSONB) |

---

## Procedure for Updating Document Behavior

### Step 1: Analyze the Requirement
Determine if the change is a **Generic Improvement** (benefits all documents) or a **Template Requirement** (specific to one type).

- **Generic**: "Improve the H8 regex to support multiline JSON." -> **Code Change**.
- **Template**: "Ensure Risk Plans include a mitigation strategy." -> **Template Change**.

### Step 2: Update the Template Record
Use a database script or tool to update the `templates` table. 

- **Drafting Standards**: Append specific instructions to `system_prompt`.
- **Extraction Guidance**: Append guidance on how to map content to H8 tags in the `system_prompt`.
- **Structural Changes**: Add or reorder rows in the `template_paragraphs` array to change the agentic planning results.

### Step 3: Verify the Injection
The engine automatically pulls these fields during generation:
- `planDocumentStructure` uses `template_paragraphs`.
- `draftSection` injects `system_prompt` into the `### Template Standards` block.

---

## Checklist for New Templates

1. [ ] **Define Identity**: Set `name`, `framework`, and `category`.
2. [ ] **Define Structure**: Seed the `template_paragraphs` array with at least 3-6 sections. If the subject matter genuinely needs more than ~20 sections, split it into multiple narrower templates instead (see Section-Count Safety Ceiling below) — do not rely on the planner to fit everything into one document.
3. [ ] **Set Standards**: Populate `system_prompt` with the "Golden Rules" for this document (e.g., "Always use the active voice").
4. [ ] **Extraction Focus**: (Optional) Add guidance in the prompt for which entity types are most critical for this template.
5. [ ] **GKG Strategy**: Define the `gkg_context_strategy` to ensure the correct project knowledge is "pumped" into the drafting phase.

---

## Critical Mandates

> [!IMPORTANT]
> **NO HARDCODING**: Never use template IDs or Names inside `documentGenerationService.ts` or `inlineEntityExtractionPrompt.ts`.
> **DATABASE FIRST**: If a template needs to change its "mind" or "style", change its record in the database.
> **PRESERVE ENGINES**: Code changes should only be made to improve the robustness of parsing, rendering, or the generic drafting prompt framework.

---

## Section-Count Safety Ceiling (unstructured templates only)

For templates with **no fixed `template_paragraphs`** (the planner freely decides section count), `planDocumentStructure` in `documentGenerationService.ts` enforces an absolute ceiling — `DOC_GEN_ABSOLUTE_MAX_SECTIONS` (default **20**) — as a last-resort safety backstop, not a content cap:

- **Sections are never silently truncated.** A plan under the ceiling (e.g. 9 sections) drafts every section the planner identified. Truncating a compliant plan to a fixed count (this code used to hard-cap at 6) silently drops whatever content the plan judged necessary — that is data loss, not a size limit.
- **Exceeding the ceiling aborts generation**, not shrinks it. A plan proposing more than 20 sections means the template's `system_prompt`/goal is asking for more than one reasonable document. The engine throws a structured `TEMPLATE_OVERSIZED_PLAN` error (same convention as `GOVERNANCE_LOCKOUT`) and calls `templateAuditService.createPendingAudit(templateId, 'oversized_plan', version)` so the template surfaces in the Template Health / Audit History dashboard for review.
- **The fix is always a template split**, never a bigger cap or a truncation workaround: create narrower templates that each cover a subset of the sections, generate separate documents, and combine them at export time (DOCX/PDF/Markdown-concatenation) — do not keep stretching one template's plan.
- If you find yourself raising `DOC_GEN_ABSOLUTE_MAX_SECTIONS` to accommodate a specific template, that is a signal the template needs splitting, not that the ceiling is wrong.

---

## Placeholder Draft Documents Are Deduplicated At The Database Level

Before drafting starts, `generateDocument()` pre-inserts a minimal `status='draft'`, empty-content document row so foreign-key-dependent child inserts (entity extraction) have something to point at during parallel section drafting.

**The bug this guards against**: this used to be a plain SELECT-then-INSERT — check for an existing empty draft, then insert a new one if none was found. Under concurrent or broker-redelivered processing of the *same* generation (nodemon restart mid-flight, RabbitMQ redelivery, the 15-minute `ai-generate` timeout racing an in-flight attempt — see `adpa-doc-gen-queue`), multiple attempts each ran the SELECT before any of them had committed their INSERT, each saw "no existing draft," and each minted its own placeholder. Observed live: **9 duplicate document rows for one logical generation request.**

**The fix**: a partial unique index — `idx_documents_one_empty_draft_per_template` (migration `431_add_documents_one_empty_draft_per_template_index.sql`) — on `(project_id, template_id)` `WHERE status = 'draft' AND (content IS NULL OR content = '')`. At most one empty draft may exist per project+template combination, full stop, enforced by Postgres itself:

```sql
INSERT INTO documents (id, project_id, name, content, template_id, status, created_by, version, semantic_version)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
ON CONFLICT (project_id, template_id) WHERE status = 'draft' AND (content IS NULL OR content = '')
DO NOTHING
RETURNING id
```

If `RETURNING id` comes back empty, a conflict occurred — another attempt already holds the empty draft for this project+template. The code then `SELECT`s that existing row and reuses its id instead of proceeding with its own orphaned uuid. This closes the race at the database layer rather than trying to make the application-level check atomic (which is what failed before).

**Once real content is written**, the row no longer matches the partial index (`content` is no longer empty), so the constraint stops applying — a project can have many *completed* documents from the same template, only ever one *pending empty draft* at a time.

Contract tests: `documentGenerationService.templateParagraphs.test.ts` → `placeholder draft document deduplication` — covers both the no-conflict (fresh insert) and conflict (reuse existing) paths.

---

## Governed feature packet (`doc-gen`)

This skill is registered with `adpa-doc-gen-queue` under manifest id `doc-gen` (`server/governed-features.manifest.json`). Template-paragraph handling, job-resumption, the section-count safety ceiling, and placeholder-draft deduplication are covered by `documentGenerationService.templateParagraphs.test.ts`.

```powershell
cd server
npm run test:features -- doc-gen
npm run verify:governed-features
```

When adding template-engine tests, extend `testPathPattern: documentGenerationService` files — no new `package.json` script required. See `adpa-governed-feature-loop` for manifest registration.
