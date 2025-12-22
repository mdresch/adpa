# Executive Analytics & Dashboards – User Guide

Confluence version: cba-hr.atlassian.net/wiki/spaces/AD/pages/371818511

Status: Draft (v0.1)
Audience: Executives, PMO, Portfolio/Program Managers
Related Epics: WA-73 (Executive Analytics & Dashboards)

---

## Purpose
Provide leadership visibility into progress, compliance, costs, and risks with fast, reliable dashboards.

## What You Can Do
- View executive summary tiles (program health, delivery, compliance, risk)
- Filter by portfolio/program/project, date range, owner
- Drill down to underlying documents and activity
- Export snapshots (PDF/CSV) for reporting

---

## Prerequisites
- Analytics migration applied and tracking active
- Your role grants access to portfolio/program data

---

## Dashboard Overview
- Summary Tiles: Key metrics (active programs, on‑track %, compliance status, risk items)
- Trends: Throughput, cycle time, drift rates, MTTA, AI usage cost
- Breakdowns: By portfolio, owner, severity, template
- Alerts: Exceptions and SLA breaches

Performance Target: P95 < 2 seconds dashboard load

---

## Filters & Drill‑downs
- Filters: Date range, portfolio/program/project, status, severity
- Drill‑down: Click any tile/chart → see detail table → open record (project/document)

---

## Exports
- PDF: One‑click executive snapshot with current filters
- CSV: Detailed tables for offline analysis

---

## Enable Analytics (Admin)
1) Apply migration
- server/migrations/007_analytics_tables.sql
- See: docs/06-features/ANALYTICS_IMPLEMENTATION_STATUS.md (Run Migration)

2) Verify ingestion
- After use, run sample checks:
```
SELECT COUNT(*) FROM api_request_logs WHERE created_at > NOW() - INTERVAL '1 hour';
SELECT COUNT(*) FROM user_activity_logs WHERE created_at > NOW() - INTERVAL '1 hour';
```

3) Connect dashboards
- Frontend to use real endpoints once enabled
- Monitor performance (P95, error rates)

---

## Tips & Best Practices
- Set consistent date ranges across teams to compare like‑for‑like
- Use drill‑downs to validate anomalies (e.g., drift spikes, MTTA breaches)
- Bookmark common filter sets for exec meetings
- Export snapshots before governance reviews

---

## Troubleshooting
- No data visible: Migration not applied or environment variables misconfigured
- Slow load: Check database indexes, query plans; reduce date range; verify caching
- Mismatched numbers: Confirm filters and time zones across teams

---

## KPIs
- Weekly active dashboard users > 20
- P95 load time < 2 seconds

---

## Related Documentation
- Implementation Status: docs/06-features/ANALYTICS_IMPLEMENTATION_STATUS.md
- Architecture: docs/07-architecture/VERCEL_ASYNC_TASK_BREAKDOWN.md, MULTI_STAGE_DOCUMENT_PROCESSOR_IMPLEMENTATION_SUMMARY.md
- Future Endpoints: docs/06-features/PROCESS_FLOW_IMPLEMENTATION_PLAN.md (analytics sections)

---

## Version History
- v0.1 (Draft): Initial executive overview, enablement, and troubleshooting
