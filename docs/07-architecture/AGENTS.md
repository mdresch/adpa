# AGENTS.md

Instructions for AI agents working on **ADPA-PROJECT-CHARTER** in this repo.
Keep changes small, focused, and aligned with existing patterns.

## Project context (ADPA)
- Full-stack monorepo: **Next.js (Pages Router)** frontend at repo root,
  **Express + TypeScript** backend in `/server`.
- Document generation is a core feature. **All document content must be stored
  as Markdown** (JSONB in PostgreSQL). Export to PDF/DOCX only on demand.
- Primary database: **Supabase PostgreSQL**. Use parameterized queries,
  UUID primary keys, JSONB for flexible content.
- Real-time: **Supabase Realtime** for DB changes and presence; **Socket.io**
  for complex business events (jobs, AI progress, notifications).

## ADPA-PROJECT-CHARTER focus
- Project charter generation aligns with PMBOK templates and standards.
- Source of truth for templates and generation:
  - `/server/src/modules/documentGenerator/`
  - `/server/src/modules/documentTemplates/`
  - `/server/src/modules/enhancedTemplateProcessor/`
- Useful docs:
  - `/docs/06-features/pmbok/`
  - `/docs/06-features/TEMPLATE_CONTENT_STRUCTURE.md`
  - `/docs/06-features/TEMPLATE_VALIDATION_SAFEGUARDS.md`

## Must-follow engineering rules
- **TypeScript strict mode**. Avoid `any` unless justified.
- **Markdown storage rule** is mandatory for all documents.
- Use Joi/express-validator for input validation; central error handling.
- Prefer existing utilities in `/lib` and `/server/src/utils`.
- Add succinct comments only when logic is not self-explanatory.
- Avoid non-ASCII unless the file already contains it.

## Repo map
- Frontend pages: `/app` (Pages Router), UI in `/components`, hooks in `/hooks`.
- Backend app: `/server/src` (routes, services, modules, middleware).
- Database migrations: `/server/migrations`.
- Documentation: `/docs`.

## Workflow expectations
- Read before you write. Reuse existing patterns and helpers.
- Keep edits tight and minimal; avoid broad refactors unless requested.
- Add/adjust tests when behavior changes.
- Run relevant tests or lint checks before reporting success.
  - Frontend: `npm run test:db-unit`, `npm run test:db-integration`
  - Backend: `cd server && npm test`

## Dependency policy
- When adding dependencies, use the package manager (pnpm in root,
  npm in `/server`) and install the latest stable version.

## Git expectations
- Commit changes with clear messages.
- Do **not** push without explicit user approval.

## If unsure
- Ask a clarifying question or point to the specific file/line that is
  ambiguous. Do not guess on data model or security behavior.
