---
name: adpa-template-lifecycle-pillar6
description: Pillar 6 Template Lifecycle Management. Use when working on template audit triggers, quality regression detection, recommendation generation, system prompt optimization, or template health tracking.
---

# ADPA Template Lifecycle Management (Pillar 6)

## Purpose
Pillar 6 ensures templates are continuously improving assets through automated quality feedback loops, audit triggers, and system prompt optimization.

## Invariants
- Must always: Trigger template audit on create/update/document failure (REQ-005)
- Must always: Detect quality regression and trigger review audit (REQ-006)
- Must always: Generate actionable recommendations from audit findings (REQ-007)
- Must always: Track recommendation application with before/after metrics (REQ-008)
- Must always: Optimize system prompts based on audit findings (REQ-009)
- Must always: Maintain template health dashboard with aggregated metrics (REQ-010)

## Interaction Rules
- Depends on: Pillar 1 (Document Generation) for quality data, Pillar 4 (Compliance) for DRACO audits
- Must not break: Template CRUD operations, document generation pipeline
- Integrates with: `templateAuditService`, `templateImprovementService`, `qualityAuditService`

## Key Files
| File | Role |
|------|------|
| `server/src/modules/documentTemplates/service.ts` | Lifecycle hooks |
| `server/src/services/templateAuditService.ts` | Audit orchestration |
| `server/src/services/templateImprovementService.ts` | Recommendation engine |
| `server/src/__tests__/modules/template-lifecycle/pillar6-invariants.test.ts` | Contract Guards |
| `server/src/modules/template-lifecycle/qualityRegressionDetector.ts` | Regression detection |
| `server/src/modules/template-lifecycle/templateHealthService.ts` | Health dashboard |

## Commands
```powershell
cd server
npm run test:features -- template-lifecycle
```

## Implementation Details

### REQ-005: Template Audit Lifecycle Triggers
- Template create triggers background audit with `trigger_type = 'lifecycle'`
- Template update (core fields changed) triggers background audit with incremented version
- Document quality failure (< 70 score) triggers template audit with `trigger_type = 'document_failure'`
- Audit records include template version, trigger type, and timestamp

### REQ-006: Quality Gate Regression Detection
- If template's average document quality drops > 15% over 30 days, triggers review audit
- Regression detection compares current avg quality vs baseline (first 10 documents)
- Regression audit includes document failure context in prompt
- Regression audit is rate-limited (max 1 per 12 hours per template)

### REQ-007: Recommendation Generation Quality
- Template improvement suggestions generated from audit findings
- Suggestions include: issue_addressed, proposed_change, change_type, section, priority
- Static analysis runs for templates with < 5 generated documents (cold start)
- AI analysis uses preferred provider with fallback logic

### REQ-008: Recommendation Application Tracking
- Approved suggestions track: reviewed_by, reviewed_at, status
- Implemented suggestions update template version
- Rejected suggestions include rejection_reason
- Before/after quality metrics captured for implemented suggestions

### REQ-009: System Prompt Optimization Loop
- Audit findings on system prompt quality generate specific prompt recommendations
- Prompt recommendations are actionable (exact text to add/modify)
- Prompt changes are versioned in template history
- Prompt optimization does not break variable resolution

### REQ-010: Template Quality Dashboard Data
- Template health score aggregates: success rate, avg quality, usage count
- Health score calculated and updated weekly
- Dashboard shows: audit history, improvement suggestions, quality trends
- Critical templates (health < 60) flagged for admin review
