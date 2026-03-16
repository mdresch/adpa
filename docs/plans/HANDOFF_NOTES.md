# Handoff Notes: Digital Twin Integration

**Status**: Phase 3 (Visio Generation) Completed.
**Next Phase**: Phase 4 (Document Triggers).

## Recent Changes (Session 2026-01-30)
1.  **Visio Export Implemented**:
    -   Backend: `VisioGenerationService.ts` handles `.vsdx` creation using "Template Injection".
    -   Route: `GET /api/digital-twin/export/visio`.
    -   Frontend: `VisioDownloadButton` added to project dashboard.
2.  **Architecture**:
    -   We rely on `server/templates/digital_twin_template.vsdx` as the "Master File".
    -   Logic dynamically looks up Master IDs from this file.
3.  **Documentation**:
    -   Spec: `plans/VISIO_GENERATION_SPEC.md`.
    -   Walkthrough: `plans/digital_twin_walkthrough.md`.

## Immediate Actions Required
1.  **Template File**: Ensure a valid `.vsdx` file exists at `server/templates/digital_twin_template.vsdx`. See `server/templates/README_VISIO_TEMPLATE.md` for instructions.
2.  **Phase 4**: Implement Logic to trigger ADPA document generation when assets in Visio change (e.g. "Alert: New Pump Added").

## Files of Interest
-   `server/src/services/visioGenerationService.ts`
-   `server/src/routes/digital-twin-export.ts`
-   `components/digital-twin/VisioDownloadButton.tsx`
