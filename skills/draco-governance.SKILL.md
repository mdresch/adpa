# 🛡️ Draco AI Governance (DRACO-v3.x)

Logical Orchestration for Document Reasoning and Assessment Compliance Orchestra (DRACO).

## When to use
- Modifying `documentGenerationService.ts` or the agentic drafting pipeline.
- Updating `inlineEntityParserService.ts` or the H8 tagging protocol.
- Adjusting the **Context Utilization Rate (CUR)** scoring engine or weights.
- Managing the **Policy Library** or high-integrity audit rules.
- Troubleshooting "Syntax Collapse", document truncation, or `PENDING_REVIEW` flags.

## Mandates

### 1. The Hermetic Section Mandate (Phase 1)
Every section draft MUST be treated as a sealed container. 
- Use the `closeUnclosedBlocks` utility during assembly.
- **Goal**: Prevent Section N from "swallowing" Section N+1 due to unclosed code blocks (```) or malformed H8 tags.

### 2. Strict Traceability Protocol (Phase 2)
The H8 protocol (`######## entity_type: {json}`) is the source of truth for the Governance Knowledge Graph (GKG).
- **No Synonyms**: Exact match naming against existing entities is mandatory.
- **No Code Blocks**: H8 tags must be emitted as plain text lines, never wrapped in ```.
- **Null Safety**: All string operations (`trim`, `toLowerCase`) must be guarded with `String(val || '')`.

### 3. Weighted CUR Scoring (Phase 3)
Document completeness is measured via the Context Utilization Rate (CUR).
- **Weights**: 
  - 30%: Stakeholders (Critical)
  - 25%: Technologies, Deliverables, Constraints, Requirements (High)
  - 20%: Activities, Work Items (Medium)
- **Hallucination Penalty**: Deduct 5% from the category score for every H8 entity introduced that has no ancestry in the provided context pool.

### 4. Integrity Sync (Phase 4)
- **Status Flagging**: Hallucinated entities must be inserted into `entity_extractions` with status `PENDING_REVIEW`.
- **Telemetry**: Every final document save MUST log the character count and final CUR score: `[MISSION-DRACO] [SYNC] Saving Document: {count} chars`.

## Procedures

### Adding a New Policy Rule
1. Insert the rule into the `policy_library` table.
2. Define a precise `execution_schema` (Zod-compatible) for the Audit Agent.
3. If the rule is critical, set `control_effectiveness_status = 'BLOCKING'` to trigger a **Governance Lockout** on failure.

### Recalibrating the Patch Agent
If the Patch Agent fails to resolve violations:
1. Increase the `MAX_PATCH_EMBED_CHARS` smart-sampling window (default 100k).
2. Adjust the "Destructive Patch" threshold (default: skip if replace < 30% of search length).
3. Review `llm_insights` snapshots to identify if the LLM is truncating the JSON patch array.

### Debugging Truncation
1. Check `unifiedAIService` for the `max_tokens` override (Drafting requires 32k; Auditing 16k).
2. Inspect the "Document End" snippet in the telemetry log.
3. Verify that the `Draft Integrity Check` caught any section drafting errors before assembly.

## References
- [ADR-004: DRACO AI GOVERNANCE](../docs/07-architecture/ADR-004-DRACO-AI-GOVERNANCE.md)
- [RPAS-CM Governance Handover](../RPAS_GOVERNANCE_HANDOVER.md)
- [Entity Lifecycle Matrix](../governance/visuals/RPAS-TAR-COL-Matrix.md)
