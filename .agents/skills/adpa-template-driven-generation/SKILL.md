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
2. [ ] **Define Structure**: Seed the `template_paragraphs` array with at least 3-6 sections.
3. [ ] **Set Standards**: Populate `system_prompt` with the "Golden Rules" for this document (e.g., "Always use the active voice").
4. [ ] **Extraction Focus**: (Optional) Add guidance in the prompt for which entity types are most critical for this template.
5. [ ] **GKG Strategy**: Define the `gkg_context_strategy` to ensure the correct project knowledge is "pumped" into the drafting phase.

---

## Critical Mandates

> [!IMPORTANT]
> **NO HARDCODING**: Never use template IDs or Names inside `documentGenerationService.ts` or `inlineEntityExtractionPrompt.ts`.
> **DATABASE FIRST**: If a template needs to change its "mind" or "style", change its record in the database.
> **PRESERVE ENGINES**: Code changes should only be made to improve the robustness of parsing, rendering, or the generic drafting prompt framework.
