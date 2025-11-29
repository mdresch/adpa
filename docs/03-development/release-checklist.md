---
title: PMBOK 8 Domain Alignment Release Checklist
status: draft
owner: ai-platform
last-updated: 2025-11-26
---

# PMBOK 8 Domain Alignment Release Checklist

Use this addendum alongside the standard ADPA release checklist whenever the PMBOK 8 domain features are shipped.

## 1. Pre-Deployment
1. **Code & Config**
   - Confirm `docs/06-features/pmbok/pmbok8-alignment.md` reflects the desired feature scope.
   - Ensure environment variables include `PMBOK8_DOMAIN_MODE=true` and Redis/Postgres credentials.
   - Run `pnpm lint && pnpm build` at repo root and `npm run build` inside `server/`.
2. **Database**
   - Backup production DB.
   - Apply migration `server/migrations/350_pmbok8_domain_alignment.sql`.
   - Verify new tables exist: `domain_extraction_runs`, `domain_kpi_snapshots`, `deliverable_acceptance`, `releases`, `ai_provider_usage`.
   - Confirm `documents.domain_metrics` column has been added.

## 2. Deployment
1. **Backend**
   - Deploy `server/` changes.
   - Restart Bull workers so the updated `extract-project-data` processor loads domain routing.
2. **Frontend**
   - Deploy Next.js build so `/ai-analytics` includes domain cards.
   - Clear CDN cache for analytics route if necessary.

## 3. Validation
1. **Domain Extraction Workflow**
   - Trigger `POST /api/project-data-extraction/extract` with `{ domains: ["team","measurement"] }`.
   - Check `domain_extraction_runs` rows transition `pending → completed` and `total_entities` > 0.
   - Inspect `jobs.data` JSON for `domainRunIds`.
2. **Analytics API**
   - Call `GET /api/analytics/domain-extraction?period=30d`.
   - Expect `summary.total_runs` > 0 and `domains.length === 8`.
   - Hit `GET /analytics/pmbok8-domains/:projectId` to ensure project dashboards still function.
3. **Frontend QA**
   - Visit `/ai-analytics` (admin role).
   - Verify the “PMBOK 8 Domain Extraction” section renders domain cards and provider table.
   - Use Refresh button to ensure data reloads without errors.

## 4. Monitoring & Rollback
1. **Monitoring**
   - Watch `domain_extraction_runs` for spikes in `status='failed'`.
   - Track `/api/analytics/domain-extraction` latency in logs (<300 ms expected).
   - Keep an eye on Bull queue depth for `extract-project-data`.
2. **Rollback**
   - Remove `domains` parameter from client requests to fall back to legacy extraction.
   - Flush analytics cache keys (`analytics:domain:*`) if reverting.

## 5. Communication
- Notify PMO stakeholders that AI analytics now surfaces PMBOK 8 domain insights.
- Include API samples + screenshots in release notes.

