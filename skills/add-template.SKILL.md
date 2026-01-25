# Skill: Add a New Template to the ADPA System

**Scope**: ADPA document templates – creating, seeding, and validating new templates.  
**Use when**: User wants to add a new template, register a template via API/UI/seed, or add a new framework (e.g. Construction, Custom) so it appears in template creation.

---

## When to use this skill

- User says: "add a new template", "create a template", "seed a template", "register a template in ADPA"
- User asks: "how do I add a template?", "where do I add Construction framework?", "how to add templates via seed?"
- Tasks involve: `templates` table, `POST /api/templates`, Create Template UI, `server/src/database/seed.ts`, validation schemas for templates

---

## Ways to add a template

| Method | Use case | Where |
|--------|----------|-------|
| **UI** | One-off or iterative creation by users | `app/templates` → "Create Template" button → form |
| **API** | Automation, integrations, scripts | `POST /api/templates` with `validate(schemas.createTemplate)` |
| **Seed** | Standard/system templates (e.g. Construction L0/L1/L2), dev data | `server/src/database/seed.ts` → `INSERT INTO templates` |

Use **seed** for templates that must exist in every environment (e.g. Construction Digital Twin levels). Use **UI** or **API** for user- or company-specific templates.

---

## 1. Add via UI

1. Go to **Templates** (`/templates`).
2. Click **Create Template**.
3. Fill:
   - **Name** (required, 2–255 chars)
   - **Framework** (required) – must be in the dropdown; see **Adding a new framework** if missing
   - **Category** (optional, e.g. "Digital Twin", "Requirements")
   - **Description** (optional)
   - **System Prompt** (optional), **Template Paragraphs** (optional)
4. **Content** is sent as `{ blocks: [] }` by the simple create form. For richer templates (sections, Handlebars), use the **Template Builder** (`/templates/builder`) or **Edit** after create.
5. Submit → `apiClient.createTemplate(payload)` → `POST /api/templates`.

**UI location**: `app/templates/page.tsx` (Create dialog, framework dropdown, filter dropdown).

---

## 2. Add via API

**Endpoint**: `POST /api/templates`  
**Auth**: `authenticateToken`, `requirePermission("templates.create")`  
**Validation**: `schemas.createTemplate` (see below).

**Request body (required vs optional):**

| Field | Required | Notes |
|-------|----------|-------|
| `name` | ✅ | 2–255 chars |
| `framework` | ✅ | One of: `TOGAF`, `SABSA`, `COBIT`, `ITIL`, `Custom`, `BABOK`, `BABOK v3`, `PMBOK`, `PMBOK 7`, `DMBOK`, `DMBOK 2.0`, `Construction` |
| `content` | ✅ | Object, e.g. `{ sections: [...] }` or `{ blocks: [] }` |
| `description` | ❌ | Max 1000 chars |
| `category` | ❌ | Max 100 chars |
| `variables` | ❌ | Array of `{ name, type, required, default?, options? }`; default `[]` |
| `is_public` | ❌ | Default `false` |
| `template_scope` | ❌ | `standard` \| `company` \| `user`; default `user` |
| `company_id` | ❌ | Required when `template_scope === 'company'` (UUID) |
| `system_prompt` | ❌ | Max 5000 chars |
| `template_paragraphs` | ❌ | Array of `{ section_name, section_type, description, required, order, prompt_guidance? }` |

**Variable types**: `text` | `number` | `date` | `boolean` | `select`. If `type === 'select'`, `options` is required.

**Scope rules:**

- `standard`: only `super_admin`; template becomes `is_read_only`.
- `company`: `company_id` required; user's company used if not provided.
- `user`: default; `company_id` must be `null`.

**Example** (minimal):

```json
{
  "name": "My New Template",
  "framework": "Construction",
  "content": { "sections": [{ "title": "Title", "content": "# {{project_name}}\n\n...", "required": true }] },
  "variables": [
    { "name": "project_name", "type": "text", "required": false, "description": "Project name" }
  ]
}
```

**Implementation**: `server/src/routes/templates.ts` (POST `/`), `lib/api.ts` → `createTemplate()`.

---

## 3. Add via seed

Used for **standard** templates (e.g. Construction L0/L1/L2) that should exist in all environments.

1. **Open** `server/src/database/seed.ts`.
2. **Ensure DB connection**: seed uses `connectDatabase()` and `getDatabasePool()`; do not use a raw `pool` import.
3. **Idempotency**: Check by template `name` (or `id`) before `INSERT` to avoid duplicates on re-run:
   ```ts
   const exists = await db.query("SELECT id FROM templates WHERE name = $1", ["My Template Name"])
   if (exists.rows.length > 0) return // or skip insert
   ```
4. **Insert**:
   ```ts
   await db.query(`
     INSERT INTO templates (id, name, description, framework, category, content, variables, is_public, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
   `, [
     uuidv4(),
     "My Template Name",
     "Short description.",
     "Construction",
     "Digital Twin",
     JSON.stringify({ sections: [ /* ... */ ] }),
     JSON.stringify([{ name: "project_name", type: "text", required: false, description: "Project name" }]),
     true,
     adminId  // use seed admin user UUID from seed
   ])
   ```
5. **Run**: `cd server && npm run seed`.

**Content shape**: Prefer `content: { sections: [ { title, content, required } ] }`. Use Handlebars in `content` (e.g. `{{project_name}}`, `{{external_id_prefix}}`). For Digital Twin templates, use strict YAML blocks (`dt_assets`, `dt_relationships`, `dt_telemetry`) so downstream extraction can parse them.

**Reference**: Construction L0/L1/L2 templates in `seed.ts` (search for `"Construction Digital Twin L0"` etc.) are full examples.

---

## Adding a new framework

If the new template uses a **framework** not yet allowed (e.g. `Construction`), add it in **all** of these places:

| Location | What to do |
|----------|------------|
| `server/src/middleware/validation.ts` | In `schemas.createTemplate`, extend `framework` `.valid(...)` with the new value (e.g. `"Construction"`). |
| `server/src/routes/templates.ts` | GET query validation: ensure `framework` filter allows the new value. PUT validation: add it to `framework` `.valid(...)` if present. |
| `app/templates/page.tsx` | **Create form** framework `<select>`: add `<option value="Construction">Construction</option>`. **Filter** dropdown: add it if you filter by framework. |
| `app/templates/[id]/edit/page.tsx` | Add the new framework to the `frameworks` array used in the edit form. |
| `app/templates/builder/page.tsx` | If the builder uses a framework list, add it there too. |

Otherwise, create/update requests with the new framework will fail validation (400) or the UI will not offer it.

---

## Validation schema (create)

**Source**: `server/src/middleware/validation.ts` → `schemas.createTemplate`.

- `name`: `Joi.string().min(2).max(255).required()`
- `description`: `Joi.string().max(1000).optional()`
- `framework`: `Joi.string().valid("TOGAF", "SABSA", "COBIT", "ITIL", "Custom", "BABOK", "BABOK v3", "PMBOK", "PMBOK 7", "DMBOK", "DMBOK 2.0", "Construction").required()`
- `category`: `Joi.string().max(100).optional()`
- `content`: `Joi.object().required()`
- `variables`: `Joi.array().items(Joi.object({ name, type, required, default?, options? })).default([])`
- `is_public`: `Joi.boolean().default(false)`
- `template_scope`: `Joi.string().valid("standard", "company", "user").default("user")`
- `company_id`: `Joi.string().uuid().allow(null, '').optional()`
- `system_prompt`: `Joi.string().max(5000).optional()`
- `template_paragraphs`: optional array of structured paragraphs.

When adding a new framework, **only** extend the `.valid(...)` list; do not change other rules.

---

## Content and variables

- **Content**: Stored as JSON. Common shape: `{ sections: [ { title, content, required } ] }`. Some code paths use `{ blocks: [] }`. Handlebars (`{{variable_name}}`) in `content` are replaced at document generation.
- **Variables**: Define injectable fields. Use consistent `name` (snake_case). `type`: `text` | `number` | `date` | `boolean` | `select`; for `select`, provide `options`.

---

## Checklist: add a new template

- [ ] Choose method: **UI** | **API** | **Seed**.
- [ ] If new framework: update **validation** + **templates route** + **UI** (Create form, Edit form, filter, builder if used).
- [ ] Ensure `name`, `framework`, `content` satisfy schema; add `variables` if needed.
- [ ] For **seed**: idempotent check by `name`, use `connectDatabase` + `getDatabasePool`, run `npm run seed`.
- [ ] For **API**: call `POST /api/templates` with valid payload; respect `template_scope` and `company_id` when relevant.
- [ ] Verify template appears under `/templates` and, if applicable, in project document creation flows.

---

## Reference

- **Templates API**: `server/src/routes/templates.ts` (GET, POST, PUT, scope promote).
- **Validation**: `server/src/middleware/validation.ts` → `schemas.createTemplate`.
- **Seed**: `server/src/database/seed.ts` (admin user, Construction L0/L1/L2 examples).
- **UI**: `app/templates/page.tsx`, `app/templates/[id]/edit/page.tsx`, `app/templates/builder/page.tsx`.
- **API client**: `lib/api.ts` → `createTemplate`, `updateTemplate`, `getTemplates`.

---

## Invocation

- Use this skill when the user asks how to add a template, register a new template, add a framework for templates, or seed templates.
- When adding Construction or other domain-specific templates, combine with **Digital Twin** skills if the template feeds Digital Twin assets (e.g. L0/L1/L2 YAML extraction).
