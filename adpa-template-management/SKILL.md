---
name: adpa-template-management
description: Management of ADPA document templates, frameworks, and seeding. Use when adding new templates, registering frameworks, or extending template schemas.
---

# ADPA Template Management

## Framework Expansion Workflow
When adding a new framework (e.g., "Construction"), update these files in order:
1. `server/src/middleware/validation.ts`: Add to `framework` enum in `createTemplate`.
2. `server/src/routes/templates.ts`: Update GET/PUT filters.
3. `app/templates/page.tsx`: Update the UI dropdowns.

## API Integration
- **Endpoint**: `POST /api/templates`
- **Required Fields**: `name`, `framework`, `content` (JSON).
- **Handlebars**: Use `{{variable_name}}` in content for dynamic injection.

## Seeding Standard Templates
Edit `server/src/database/seed.ts`. Always use an idempotency check (check if template name exists) before inserting.
```ts
const exists = await db.query("SELECT id FROM templates WHERE name = $1", ["Name"])
if (exists.rows.length === 0) { /* INSERT */ }
```

## Content Schema
Prefer structured sections:
`content: { sections: [ { title, content, required } ] }`
