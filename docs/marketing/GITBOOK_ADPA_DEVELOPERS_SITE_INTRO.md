# ADPA Developers Site — Introduction

Welcome to the **ADPA Developers Site**. This is the central place for everyone building, integrating, or extending **ADPA** (Automated Document Processing & Analytics).

## Who This Site Is For

- **Developers** working in the ADPA codebase (frontend, backend, or full stack)
- **Integrators** connecting ADPA to existing tools (Jira, MS Project, Confluence, SharePoint, AI providers)
- **DevOps and platform engineers** deploying and operating ADPA
- **Contributors** who want to understand architecture, conventions, and workflows before making changes

## What You'll Find Here

- **Architecture & stack** — Next.js + Express, PostgreSQL (Supabase), Redis, and how they fit together
- **Setup & runbooks** — Local development, Docker, environment variables, and deployment (Railway, Vercel)
- **APIs & integrations** — REST and real-time (Socket.io, Supabase Realtime), and how to add or use integrations
- **Document pipeline** — How ADPA ingests, normalizes, and generates project documents (Markdown-first, PMBOK-aligned)
- **Standards & contribution** — TypeScript strict mode, validation, testing, and Git expectations

## Design Principles

ADPA is built as a **document-centric, PMBOK-aligned** system. All stored document content is **Markdown** (in PostgreSQL JSONB); PDF and DOCX are produced on demand. The ingestion and normalization layer turns project artifacts (charters, risk registers, etc.) into structured, queryable knowledge that feeds analytics, governance, and downstream tools.

Use this site as your first stop before coding, deploying, or designing integrations. If something you need is missing or unclear, that’s a good candidate for a doc update or a question to the team.

---

*Last updated for GitBook publication. Aligned with ADPA repo docs and AGENTS.md.*
