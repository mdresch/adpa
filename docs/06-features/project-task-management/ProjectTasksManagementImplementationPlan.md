
# Project Tasks Management Implementation Plan

## Current Status & Entity Extraction Overview

### Project Status (as of November 2025)
- The foundational backend and frontend infrastructure for project/task management is in place.
- The `projects`, `tasks`, and related tables exist in the database; WBS extraction and import logic is partially implemented.
- Entity extraction logic currently identifies activities and deliverables reliably; milestones, phases, and work items are recognized but may require further mapping and validation.
- The UI supports basic task import and review, but advanced mapping, hierarchy, and type selection are in progress.
- No destructive writes occur until user confirmation during import preview.
- The migration plan is being updated to ensure all schema (including `projects`) is reproducible.

### Entity Extraction & Mapping Details
- **Activities**: Extracted as atomic work units and mapped to `tasks` (entity_type: `task`).
- **Deliverables**: Extracted and mapped to `tasks` (entity_type: `deliverable` or `task`), depending on project structure.
- **Milestones**: Identified and mapped to `tasks` (entity_type: `milestone`). These are used for key project checkpoints and have date fields.
- **Phases**: Extracted as high-level groupings and mapped to `tasks` (entity_type: `phase` or `group`). They serve as parents for nested tasks and milestones.
- **Work Items**: Extracted as checklist items or sub-tasks, mapped to either `checklist_items` (if granular) or `tasks` (entity_type: `work_item`).
- **Hierarchy**: Parent/child relationships are preserved using a `parentId` field in the extraction output and mapped to the `parent_id` column in the `tasks` table.
- **Grouping**: Phases and groups are used to organize tasks into logical sections, supporting rollup and reporting.
- **Details Captured**: For each entity, the following details are extracted and mapped:
	- `name`/`title`
	- `description`
	- `start_date`, `end_date` (where applicable)
	- `status` (planned, in progress, completed, etc.)
	- `cost` and `estimated_hours` (if available)
	- `assignee_id` (if mapped)
	- `sequence` (for ordering within parent)
	- `entity_type` (task, milestone, phase, group, work_item)

#### Example Mapping Table
| Extracted Entity | Mapped Table/Type         | Key Fields Captured                |
|------------------|--------------------------|------------------------------------|
| Activity         | tasks (task)             | name, description, parent_id, ...   |
| Deliverable      | tasks (deliverable/task) | name, description, parent_id, ...   |
| Milestone        | tasks (milestone)        | name, date, parent_id, ...          |
| Phase            | tasks (phase/group)      | name, parent_id, ...                |
| Work Item        | checklist_items/task     | name, parent_id, cost, ...          |

---

## 1. Comprehensive Entity Extraction
- **Update extraction logic** in backend (e.g., `server/src/services/wbsExtractionService.ts`) to identify and classify all WBS elements: activities, deliverables, milestones, phases, and work items.
- **Define entity mapping**: Map each extracted entity to the correct project structure (task, milestone, phase, group, etc.) using a clear schema (e.g., extend `types/ProjectEntities.ts`).
- **Preserve hierarchy**: Maintain parent/child relationships in the extraction output (e.g., using a `parentId` field or nested structure).
- **Unit tests**: Add/expand tests in `server/tests/services/wbsExtractionService.test.ts` to cover all entity types and edge cases.

## 2. Robust WBS Import & Conversion
- **Update import logic** in backend (e.g., `server/src/routes/importWbsToTasks.ts`) to handle all entity types, not just activities/deliverables.
- **UI enhancements**: In the import modal (e.g., `app/projects/[id]/import-wbs/page.tsx`), allow users to review, map, and confirm imported items (with type selectors for milestone, phase, etc.).
- **Hierarchy preservation**: Ensure imported data maintains WBS structure for grouping, rollup, and reporting (e.g., tasks nested under phases, milestones linked to tasks).
- **Validation**: Warn users about unmapped or ambiguous items before import completes.

## 3. Flexible Task Model & UI
- **Backend model**: Extend the task model (e.g., `server/src/models/Task.ts`) to support multiple entity types (task, milestone, phase, work item) and parent/child relationships.
- **Frontend components**: Update or create components (e.g., `components/project/TaskTable.tsx`, `components/project/TaskBoard.tsx`) to display and filter by type, status, and hierarchy.
- **Editing & reclassification**: Allow users to edit imported items and change their type or parent in the UI (e.g., drag-and-drop, dropdown selectors).
- **Reporting**: Add summary and rollup views (e.g., cost, progress) at each hierarchy level.

## 4. User Experience & Validation
- **Feedback**: Provide clear feedback during import and conversion (e.g., success, warnings, errors) using toasts or modals.
- **Preview**: Show a preview of the imported structure before finalizing, with options to adjust mappings.
- **Undo/rollback**: Allow users to undo the last import or revert changes if needed.

## 5. Ongoing Maintenance & Enhancement
- **Testing**: Regularly review extraction and import accuracy with real project data; add regression tests for new entity types and scenarios.
- **User feedback**: Gather feedback via in-app surveys or feedback forms to refine mapping, UI, and reporting features.
- **Documentation**: Update developer and user documentation (e.g., `docs/roadmap/`, `docs/user-guides/`) to reflect new features and workflows.
- **Future integrations**: Plan for Microsoft Planner/Graph API integration and advanced analytics (e.g., sync tasks, milestones, and phases with external systems).

**Goal:**
Deliver a robust, user-friendly project task management system that accurately reflects all project elements, supports advanced planning, and enables effective tracking and reporting.

## 6. Future Enhancements & GPT-5 Agent Assistance

This section captures forward-looking work, automation, and how an AI coding/automation agent (GPT-5-style) can accelerate implementation, testing, and maintenance.

### 6.1 Phased Rollout
- **Phase A (Scaffold & Import Validation, 1-2 weeks)**
	- Create `app/projects/[id]/planner/page.tsx` scaffold and placeholder components: `TaskBoard`, `ChecklistPanel`, `RollupSummary`.
	- Extend import UI (`app/projects/[id]/import-wbs/page.tsx`) to include mapping previews and type selectors.
	- Add backend route `POST /api/projects/:id/import-wbs/preview` for preview and validation.
	- Acceptance: Users can preview and confirm mapped items; no destructive writes until confirmation.

- **Phase B (Planner UI & Local Rollups, 2-3 weeks)**
	- Implement Planner DnD using `react-dnd` or `@dnd-kit/core` for tasks and checklist items.
	- Implement local rollup calculations (client + lightweight API) for checklist→task→project views.
	- Acceptance: Drag-and-drop, checklist creation, and immediate UI rollup updates work for projects with up to 500 tasks.

- **Phase C (Backend Aggregation & Persistence, 2 weeks)**
	- Implement server-side aggregation APIs (`GET /api/projects/:id/rollup`) and database materialized views or periodic aggregates for large portfolios.
	- Ensure eventual consistency and provide endpoints for on-demand recompute.
	- Acceptance: Aggregated cost and progress values match client-side calculations and update within acceptable latency (e.g., < 5s for project-level recompute).

- **Phase D (Integrations & Role-Based Assignment, 2-4 weeks)**
	- Prototype Microsoft Graph/Planner sync (two-way sync of tasks and assignments).
	- Implement role-based assignment APIs and UI for role-to-user mapping.
	- Acceptance: Tasks assigned in Planner appear in ADPA and vice versa during a test sync window.

### 6.2 Acceptance Criteria (Examples)
- Checklist items have `cost: DECIMAL(15,2)`, `status: enum`, `assigneeId`, `estimatedHours`.
- Moving a checklist item updates its parent task rollup within 1-2 seconds in UI and persists to backend within 10s.
- WBS import preview highlights ambiguous items and allows user-driven reclassification before import proceeds.

### 6.3 Data Model & DB Notes
- Add `checklist_items` table with fields: `id UUID`, `task_id UUID`, `name TEXT`, `cost NUMERIC(15,2)`, `status TEXT`, `assignee_id UUID`, `estimated_hours DECIMAL`, `sequence INT`.
- Extend `tasks` table with `entity_type` (task|milestone|phase|group), `parent_id UUID`, `group_id UUID`.
- Create materialized view `project_financial_rollup` or implement periodic aggregate table to store computed rollups for fast reads.

### 6.4 APIs to Add or Extend
- `POST /api/projects/:id/import-wbs/preview` – returns parsed items and mapping suggestions.
- `POST /api/projects/:id/import-wbs/confirm` – performs import after user confirmation.
- `GET /api/projects/:id/rollup` – returns aggregated costs/progress for project/program/portfolio.
- `POST /api/tasks/:id/checklist` – create checklist items on a task.
- `PATCH /api/tasks/:id/assign` – assign task or checklist item to user or role.

### 6.5 UX & Accessibility
- Ensure Planner implements keyboard-accessible reordering and ARIA roles for drag-and-drop.
- Provide visual rollup indicators (badges, progress bars) and exportable CSV/Excel for finance teams.

### 6.6 Testing, Observability & Performance
- Unit tests for `wbsExtractionService` and import routes (`server/tests/...`).
- Integration tests for import preview → confirm flow and for rollup accuracy using synthetic large datasets.
- Add telemetry (Prometheus/StatsD or application insights) for import duration, error rates, and aggregate recompute times.

### 6.7 Risk & Mitigation
- **Large imports may be slow**: Mitigate with streaming imports and background jobs (Bull queue) with progress updates.
- **Conflicting mappings**: Provide manual review step and conflict resolution UI.

### 6.8 How an AI Agent (GPT-5-style) Can Help
- **Scaffold code & PRs**: Generate initial component/route scaffolds (`planner/page.tsx`, components) and unit test skeletons.
- **Create issue templates and GitHub tasks**: Convert plan items into tracked GitHub issues with labels and estimates.
- **Suggest SQL and DB migration snippets**: Propose migration SQL for `checklist_items` and `project_financial_rollup` materialized view.
- **Write integration test scenarios**: Generate Playwright / Jest tests for import preview and rollup verification.
- **Assist with Microsoft Graph prototyping**: Provide sample code for OAuth authentication and Planner API calls.

### 6.9 Documentation & Handoff
- Update `docs/` with a `Project Tasks - Planner` user guide and admin setup steps for role mappings and sync credentials.
- Provide a release checklist and post-release monitoring plan.

---

*If you want, I can now scaffold the `planner` page and create the DB migration SQL for `checklist_items` and `project_financial_rollup` as a next step.*
