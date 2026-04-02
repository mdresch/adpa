# ADR 004: DRACO AI Governance Framework

## 1. Executive Brief
DRACO (Document Reasoning and Assessment Compliance Orchestra) is the primary governance layer for the ADPA framework. It transitions AI document generation from a "passive assistant" model to an "accountable automated process." By using a multi-agent Review Board, DRACO provides independent validation of evidence, governance, and logical resilience, ensuring that publication is a deliberate, auditable act.

## 2. Status
**Accepted / Operationalized (2026-04-02)**

## 3. Context
As ADPA generates an increasing volume of enterprise-grade documentation, the risk of "AI Drift" (hallucinations, shared training priors, and silent compliance gaps) grows. A monolithic "judge" model is insufficient because it shares the same blind spots as the generator. We needed a system that:
-   Provides **independent** role-based critique.
-   Detects **epistemic risk** (e.g., high convergence among models).
-   Enforces **governance gates** (Blocking Mode) without creating user friction.
-   Maintains **human accountability** through mandatory overrides.

## 4. Decision
We have implemented the DRACO Board with the following architectural constraints:

### 4.1 Multi-Agent Orchestration
We use three distinct board roles:
-   **Evidence Validator**: Grounding and factual integrity.
-   **Governance Evaluator**: Compliance and risk management.
-   **Counterfactual Challenger**: Adversarial logic and assumption testing.

### 4.2 Resilience & Proof-of-Life
To prevent provider latency from impacting UX, we use a two-stage signal:
-   **30s Warning**: Informs the user the board is slow.
-   **90s Timeout**: Falls back to a conservative score (60) to maintain system flow.
-   **SSE Progress**: Provides real-time "heartbeat" to prevent perceived system crashes.

### 4.3 Human Override Protocol
AI is never the final arbiter. In Blocking Mode (REJECT), a human must provide a justification to bypass the block. This justification is permanently logged and linked to the document record.

## 5. Consequences

### Positive
-   **Auditability**: Every publication has either an AI "PASS" or a documented human justification.
-   **Trust**: Real-time progress timers reduce user abandonment.
-   **Quality**: Template prompt improvements are automatically suggested based on board findings.

### Negative
-   **Cost**: Running 3-4 parallel LLM calls increases per-document cost.
-   **Complexity**: Requires multiple API providers to maintain independence signals.

## 6. References
-   Implementation: [dracoService.ts](file:///f:/Source/Repos/adpa/server/src/services/dracoService.ts)
-   UI: [DracoReviewPanel.tsx](file:///f:/Source/Repos/adpa/components/DracoReviewPanel.tsx)
-   Schema: [draco_reviews](file:///f:/Source/Repos/adpa/server/migrations/003_add_draco_review_schema.sql)
