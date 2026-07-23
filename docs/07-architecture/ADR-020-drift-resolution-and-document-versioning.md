# ADR 020: Drift Resolution & Document Versioning

## 1. Status
**Proposed (2026-07-23)** — the drift detection, resolution, and versioning pipeline described here is fully implemented; this ADR records the architecture retroactively.

## 2. Context

ADPA detects when a generated or managed document has drifted from its baseline and supports AI-powered resolution, positive-drift change-request creation, and cascading regeneration of dependent documents. The implementation spans three services, a notification integration, and a performance-optimized resolution path. None of this is documented at the ADR level.

Verified against running code:

- **Drift detection**: `driftDetectionService.ts` compares current project entities against the most recent `active` `project` baseline via `baselineService.compareToBaseline`. Produces `DriftDetection` records with types: `scope`, `timeline`, `resource`, `risk`, `compliance`, `quality`, `other`.
- **Severity rules**: configurable thresholds per drift type. Defaults: >10 new entities = critical, >5 = warning; timeline delays >30 days = critical.
- **Resolution**: `driftResolutionService.ts` uses AI (`generateWithFallback`) to produce a resolved document realigned to the baseline. Strategy parameter: `conservative | balanced | permissive`. Results are **cached in Redis** (hash of content + `driftRecordId` + strategy). Resolution previews and diffs are generated asynchronously.
- **Positive drift**: `positiveDriftChangeRequestService.ts` classifies positive drift (efficiency, cost saving, timeline acceleration, innovation), auto-creates opportunity change requests, and triggers IP novelty assessment for innovation drift.
- **Change requests**: can create change requests and approval workflows automatically from drift detections.
- **Auto-creation of Jira issues**: for `critical` drift.
- **Escalation**: auto-triggers escalation via `escalationService.processDriftEscalation`.
- **Notifications**: `driftNotifications.ts` for drift alerts.

## 3. Decision

We adopt a **taxonomy-driven drift pipeline** where every drift is classified by type and severity at detection time, routed to the appropriate resolution path, and coupled to change requests only when the drift represents a real deviation — not for positive drift, which is routed to opportunity capture instead.

### 3.1 Drift Taxonomy

| Type | Trigger | Severity Default |
|---|---|---|
| `scope` | Entity count delta against baseline scope items | >10 new = critical, >5 = warning |
| `timeline` | Milestone date delta against baseline schedule | >30 days = critical, >14 days = warning |
| `resource` | Resource assignment or budget delta | >20% change = critical, >10% = warning |
| `risk` | New risk registration or severity change | Any new high-severity risk = critical |
| `compliance` | Regulatory requirement or control delta | Any compliance delta = critical |
| `quality` | DRACO verdict degradation or QA score drop | Score drop >20% = critical |
| `other` | Uncategorized entity changes | Manual triage required |

Detection methods supported: `automated`, `manual`, `scheduled`, `ml_anomaly`.

Statuses: `open`, `acknowledged`, `accepted`, `reverted`, `resolved`, `false_positive`.

### 3.2 Resolution Strategy

Resolution is AI-powered and strategies are explicit:

- **Conservative**: minimize changes; preserve current document text unless baseline evidence is incontrovertible.
- **Balanced**: preferred default; recalculate the document to match baseline while preserving user-added content where it does not conflict with baseline.
- **Permissive**: maximize alignment with baseline; overwrite current text even where user-added content exists.

Resolution is **cached in Redis** keyed by `(driftRecordId, strategy)`. A cached resolution is returned immediately without an AI call. Cache invalidation occurs when:
1. The drift record's status changes from `open` to `accepted`.
2. The baseline is updated (freshened).

### 3.3 Positive Drift as Opportunity, Not Deviation

Positive drift (improvements that exceed the baseline) is separated from negative drift at detection time:

- **Negative drift** → resolution path (AI realignment) + optional change request.
- **Positive drift** → `positiveDriftChangeRequestService` classifies the type (efficiency, cost, timeline, innovation) and routes to the appropriate workflow:
  - Innovation drift → IP novelty assessment before change request creation.
  - Efficiency / cost / timeline → direct opportunity change request.

This split prevents the system from treating an improvement as a regression.

### 3.4 Cascading Regeneration Trigger

A resolved drift does not automatically cascade to all dependent documents. The coupling is explicit:

- **Auto-enqueue**: when a scope drift is resolved and the scope baseline changes, all documents derived from the affected scope items are enqueued for regeneration (via the `document-regeneration` queue).
- **Manual trigger**: for timeline and resource drifts, the user must confirm regeneration because the blast radius is larger and the documents affected may be read-only references.
- **De-duplication**: the `document-dependency-graph` tracks regeneration state; a document already enqueued for regeneration is not enqueued again for a sibling drift in the same batch.

## 4. Options Considered

### Option A: Immediate AI resolution on every drift detection
| Dimension | Assessment |
|---|---|
| Responsiveness | High |
| Cost | High — every minor drift triggers an AI call |
| Noise | High — false-positive drifts waste tokens |

Rejected: the Redis cache partially mitigates cost, but proactive resolution on every detection would still generate unnecessary AI calls for transient drifts that the user would mark `false_positive` anyway.

### Option B (Recommended): Detection → classification → user confirmation → cached resolution
| Dimension | Assessment |
|---|---|
| Responsiveness | Medium — user confirms before resolution |
| Cost | Low — cache hits skip AI; confirmed resolutions cost tokens |
| Noise | Low — `false_positive` status prevents regeneration |

The current implementation. Detection runs on schedule or on-demand; the user reviews the drift record and chooses to resolve, accept, or mark as false-positive. Once resolved, the result is cached and can be replayed instantly.

### Option C: No AI resolution, manual editing only
| Dimension | Assessment |
|---|---|
| Responsiveness | N/A |
| Cost | Zero |
| Usability | Poor — large scope drifts require hours of manual re-alignment |

Rejected: AI resolution is a core differentiator. Manual-alignment would require teams to re-read baseline and re-edit documents for every drift, which the product's target user base cannot absorb.

## 5. Consequences

### Positive
- **Drift-as-data**: every detection is a persisted record with type, severity, source, and status. Auditing why a document changed is a DB query, not a guess.
- **Redis cache**: repeated resolution requests for the same drift + strategy are instant and free.
- **Positive drift separation**: innovation and efficiency improvements reach opportunity capture instead of being masked as deviations.

### Negative
- **AI call volume**: each resolved drift costs tokens. A project with frequent scope changes and no `false_positive` discipline can generate significant AI spend.
- **Jira/Confluence coupling**: auto-creating Jira issues for critical drift is useful, but it creates a hard dependency on external service availability. If Jira is down, drift notifications queue locally and are never reconciled unless a retry is added.

### Risks
- **Baseline freshness mismatch**: `driftDetectionService` always pulls the most recent `active` baseline, but the resolution generator may not. If the baseline is updated between detection and resolution, the resolved document aligns to a different baseline than the one that triggered the drift. Mitigated by capturing the baseline version on the `DriftDetection` record and refusing to resolve if the baseline has changed.
- **Resolution approval bypass**: the current API allows resolution to be triggered programmatically without a user confirmation step in some paths (verified in `driftResolutionService.ts`). This is acceptable for internal tooling but must be explicitly gated for customer-facing flows.

## 6. Action Items

1. Add baseline version pinning to `DriftDetection` records so resolution rejects resolution if the baseline changed between detection and resolution.
2. Document the drift taxonomy and severity rules in `docs/06-features/DRIFT-TAXONOMY.md`.
3. Add retry logic for Jira issue creation failures (see Negative consequence above).
4. Register Drift Resolution as a governed feature packet in `server/governed-features.manifest.json`.

## 7. References

- `server/src/services/driftDetectionService.ts` — baseline comparison, drift record creation
- `server/src/services/driftResolutionService.ts` — AI-powered resolution, caching, diff preview
- `server/src/services/positiveDriftChangeRequestService.ts` — positive drift classification and opportunity creation
- `server/src/services/driftReplicationIntegration.ts` — replication of positive drift across similar projects
- `server/src/integrations/driftNotifications.ts` — drift alert notifications
- `server/src/services/escalationService.ts` — drift-triggered escalation
- `server/migrations/000_baseline.sql` — `baseline_drift_detection` table schema
- `docs/07-architecture/SEMANTIC_SEARCH_INTEGRATION_SUMMARY.md` — prior work on semantic search (related retrieval)
- [ADR-013: Document Generation Pipeline Architecture](ADR-013-document-generation-pipeline-architecture.md) — document regeneration queue this uses
- [ADR-017: Queue & Background Processing Architecture](ADR-017-queue-and-background-processing-architecture.md) — queue topology for document regeneration and quality audit
