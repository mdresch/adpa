---
name: adpa-entities-maintenance-registries
description: Use when modifying or troubleshooting ADPA entity registries, database-level deduplication, dual-store persistence, entity freshness tracking, or template analytics profiling.
---

# ADPA Entities Maintenance and Registries

## Overview
ADPA uses a modular, registry-driven entity system to manage, extract, and maintain structured data (e.g., stakeholders, risks, requirements) across project documents. The system relies on a dual-store architecture: entities are written both to domain-specific tables and synced to a central ledger (`entity_extractions`) where deduplication, merging, and freshness tracking occur.

## When to Use
- Troubleshooting missing or out-of-date document entities.
- Registering a new PMBOK entity type in the system.
- Modifying deduplication rules or name normalization matching.
- Reviewing how document templates track entity counts, knowledge domains, or performance domain coverage.
- Editing inline H8 markdown entity parser configurations.

---

## 1. Modular Extraction Registry

The central registry ([ExtractionRegistry.ts](file:///f:/Source/Repos/adpa/server/src/services/extraction/ExtractionRegistry.ts)) manages extractor and saver modules for all PMBOK entity types (80+ subdirectories under `entities/`).

### Registration & Rollout
- Modules are registered via `extractionRegistry.register(entityType, { extract, save })`.
- Per-entity feature flags allow safe rollouts and rollbacks: `EXTRACTION_USE_NEW_<ENTITY_TYPE>=true` (e.g., `EXTRACTION_USE_NEW_WORK_ITEMS`).
- Programmatic checks (`extractionRegistry.isEnabled(entityType)`) control whether the new modular path or legacy path is executed.

---

## 2. Storage & Deduplication Strategy

When entities are generated or parsed inline via H8 tags (processed in [inlineEntityParserService.ts](file:///f:/Source/Repos/adpa/server/src/services/inlineEntityParserService.ts)), they undergo dual-store persistence.

```
AI Generation / H8 Tags
       ↓
[ExtractionOrchestrator]
       ↓
┌──────────────────────────────────────────────┐
│  Dual-Write Flow                             │
├──────────────────────┬───────────────────────┤
│ 1. Domain Table      │ 2. Central Ledger     │
│ (e.g. `stakeholders`)│ (`entity_extractions`)│
└──────────────────────┴───────────────────────┘
```

### Central Ledger Deduplication & Merging
In [entityExtractionService.ts](file:///f:/Source/Repos/adpa/server/src/services/entityExtractionService.ts#L498-L633), name-based normalization is performed to identify duplicates:
1. **Name Normalization**: Special characters are removed, whitespace is normalized, and casing is ignored:
   ```typescript
   const normalizedInputName = entityName
     .toLowerCase()
     .replace(/[^\w\s]/g, '')
     .replace(/\s+/g, ' ')
     .trim();
   ```
2. **Conflict Resolution & Merge**:
   - **Properties**: Merges properties inside `entity_data`: `{ ...existingData, ...entity.entity_data }`.
   - **Traceability**: Deduplicates and unions `source_document_ids` inside `entity_data`: `Array.from(new Set([...existingDocIds, documentId]))`.
   - **Confidence**: Stores the maximum confidence score using `Math.max(existingConfidence, newConfidence)`.
   - **Verification**: Keeps verified status if either the existing or newly extracted entity is verified.

---

## 3. Freshness & Feedback Loop

To observe freshness and compliance across several entities, ADPA maintains a feedback loop during storage:

1. **Document Purpose Rebuild**: `DocumentPurposeService.rebuildForProject(projectId)` runs to re-aggregate and update document purposes and entity counts.
2. **Template Entity Statistics**: If a document uses a template, its `entity_counts` are updated via `documentTemplateService.updateTemplateEntityStats(templateId, statsCounts)`.
3. **Domain Coverage Profiling**: [TemplateAnalyticsService.ts](file:///f:/Source/Repos/adpa/server/src/services/templateAnalyticsService.ts#L83-L245) recalculates the template entity profile using `ENTITY_DOMAIN_WEIGHTS` to map entity occurrences to PMBOK knowledge and performance domains.

---

## Key Files
- Registry: [ExtractionRegistry.ts](file:///f:/Source/Repos/adpa/server/src/services/extraction/ExtractionRegistry.ts)
- Orchestration: [ExtractionOrchestrator.ts](file:///f:/Source/Repos/adpa/server/src/services/extraction/ExtractionOrchestrator.ts)
- Central Extraction Service: [entityExtractionService.ts](file:///f:/Source/Repos/adpa/server/src/services/entityExtractionService.ts)
- Inline Parser: [inlineEntityParserService.ts](file:///f:/Source/Repos/adpa/server/src/services/inlineEntityParserService.ts)
- Template Analytics: [templateAnalyticsService.ts](file:///f:/Source/Repos/adpa/server/src/services/templateAnalyticsService.ts)

## Common Pitfalls
- **Singular vs Plural Naming**: Ensure newly added entities map correctly between singular (ledger) and plural (domain table/API payload) names using the mapping configuration in [AnalysisController.ts](file:///f:/Source/Repos/adpa/server/src/modules/analysis/AnalysisController.ts).
- **Caching**: Changes to template profiles require invalidating Redis keys (`template:${templateId}`) so the frontend displays updated metrics immediately.
- **Save Failures**: Extraction save failures write to the dead-letter queue via [DeadLetterService.ts](file:///f:/Source/Repos/adpa/server/src/services/extraction/DeadLetterService.ts) for auditing. Check this table if entities fail to persist.
