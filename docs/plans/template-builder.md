# Implementation Plan: Template Builder

## Goal Description
Build a visual, drag-and-drop Template Builder to allow users to construct custom document templates (e.g., ISO Standards, Agile Retrospectives) rapidly. The builder will include an AI-assisted suggestion engine to automatically draft sections based on the selected framework, drastically reducing the manual effort required to create comprehensive governance templates.

## Proposed Changes

### `app/templates/builder/page.tsx`
- [NEW] Create the Next.js frontend route for the Template Builder interface.
- [NEW] Implement `dnd-kit` for drag-and-drop reordering of `TemplateSection` blocks.
- [NEW] Create a live-preview side-panel that renders the layout dynamically as sections are added.

### `server/src/modules/templates/TemplateBuilderController.ts`
- [NEW] API endpoint to save, publish, and version-control new templates.
- [NEW] Database schema updates to support custom variables (`TemplateVariable` entities) and required sections.

### `server/src/modules/ai/TemplateSuggestionService.ts`
- [NEW] Implement the LLM bridge for the AI-assisted section generator.
- [NEW] Given a user prompt (e.g., "Create a PMBOK Project Plan"), the service will query the intelligence tier to return structured JSON containing suggested sections, AI prompts, and target word counts.

## Verification Plan

### Automated Tests
- Unit test: `npm run test -- TemplateSuggestionService` to verify the LLM prompt construction and JSON parsing of AI suggestions.
- Unit test: Ensure template versioning correctly increments semantic versioning upon publishing edits.

### Manual Verification
- Navigate to the `/templates/builder` route in the frontend.
- Type "Agile Sprint Retrospective" into the AI Assitant and click "Suggest Sections".
- Verify that sections like "What went well", "What could be improved", and "Action Items" are automatically added.
- Drag and drop sections to reorder them, save the template, and verify it appears in the Template Gallery.
