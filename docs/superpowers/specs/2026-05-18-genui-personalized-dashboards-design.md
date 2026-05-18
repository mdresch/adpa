# GenUI Personalized Dashboards Design

Date: 2026-05-18
Topic: ADPA future personalization with GenUI/OpenUI and a practical v1 slice
Status: Approved design draft

## Goal

Design ADPA's future personalized UI direction around GenUI/OpenUI while defining a practical v1 that gives project managers stable, familiar dashboards with fresh project data, controlled AI suggestions, and document-specific visual enhancement.

## Context

ADPA already has an OpenUI chat foundation with project-scoped responses, structured GenUI rendering, and report-oriented outputs. The next personalization step should build on that direction without letting AI invent ADPA's core project framework.

The core ADPA project outline remains stable:

- the project outline is fixed across projects
- the 49-process framework is fixed across projects
- the 92 input/output documents and deliverables are mostly fixed, with variation by project type
- document content varies by project

AI should personalize views, widgets, explanations, suggestions, visuals, and report content inside this stable framework.

## Design Choice

Use stable ADPA presets with AI suggestion mode.

The dashboard loads an ADPA-defined preset first, applies the user's saved personalization, refreshes project data, and then uses AI to suggest optional changes. AI does not automatically replace the layout on page load.

This balances personalization with trust, speed, governance, predictable testing, and user control.

## Page Types

### PM Command Center

The PM Command Center is a phase/process-driven dashboard for project managers.

It uses the fixed ADPA process framework and the selected project's current signals to emphasize the most useful widgets. The view supports decisions, risks, status, compliance, milestones, issues, mitigations, actions, and lessons learned.

The command center uses predefined ADPA presets:

- Default
- Steering Meeting
- Risk Review
- Compliance
- Issues
- Mitigations

Each preset has an ADPA default widget set and layout. Users can personalize each preset with pin, unpin, and constrained resize behavior.

### Document Outline View

The Document Outline View is a document-section-driven workspace.

It follows the selected document's paragraph or section structure rather than the project phase layout. It supports document health, evidence, gaps, comments, generated content, section review, curated visual placement, and report improvement.

This view is intentionally separate from the PM Command Center because a document-centered workflow expects ordered section navigation, while the command center expects operational prioritization.

## Widget and Layout Model

V1 uses a shared widget catalog rather than widget-specific RBAC or separate catalogs per page type.

Widgets declare their layout constraints:

- widget type
- default tile size
- allowed tile sizes
- minimum tile size
- maximum tile size
- supported preset/page contexts
- data source
- refresh policy
- empty-state behavior

The grid is constrained, likely around a 12-column layout. Widgets can use approved tile footprints such as 2, 4, 6, 9, or 12 tiles, but each widget decides which of those sizes it supports.

Examples:

- Compliance Score may support 2, 4, or 6 tiles, but not 9 or 12.
- Milestone Timeline may support 6, 9, or 12 tiles, but not 2.
- Decision Queue may support 4, 6, or 9 tiles.

Pinned widgets preserve identity, placement, and valid size. Their content remains live and refreshes from the selected project.

## User Personalization

Personalization is user-level across projects.

A user's pinned widgets, preset preferences, and widget sizes apply across projects. The layout stays familiar, but widget data changes based on the active project.

Each preset can be personalized independently:

- pin widget
- unpin widget
- resize widget within allowed sizes
- reset selected preset to ADPA defaults

Reset applies only to the selected preset. It restores layout preferences such as pins, widget sizes, and placement. It does not delete project data, documents, lessons learned, or access rights.

The inferred user presentation profile works like dashboard preferences:

- global user profile across projects
- optional per-preset adjustments later
- affects explanation depth and rendering style
- never affects access rights

ADPA can infer presentation preferences over time from signals such as expanded details, pinned widgets, accepted suggestions, preferred presets, role context, and repeated feedback.

## Access Control

V1 keeps access control simple.

- Project selector lists only projects the user can access.
- Backend requests re-check project access for every dashboard, widget, lesson, and document operation.
- No widget-specific RBAC in v1.
- Widgets render only data from the selected accessible project.
- Empty widget states are for missing data inside an accessible project, not unauthorized project access.

Widgets do not grant access. They only visualize data the user can already retrieve through existing project permissions and API rules.

## AI Suggestion Mode

V1 uses AI suggestions rather than automatic layout regeneration.

Flow:

1. User opens a dashboard.
2. ADPA loads the selected predefined preset immediately.
3. ADPA applies the user's saved pin and resize preferences.
4. Widgets fetch fresh data for the selected accessible project.
5. AI analyzes current project signals.
6. AI suggests optional changes.
7. User applies or ignores suggestions.

AI suggestions can include:

- add a widget
- remove a non-pinned widget
- resize a widget within allowed sizes
- switch to a better structured visual
- recommend a more relevant preset

AI suggestions must not move, remove, or resize pinned widgets unless the user explicitly changes the pin or accepts a targeted suggestion.

## Visual Generation

Dashboard and process visuals use structured component rendering.

Allowed structured visuals include:

- risk heatmap
- compliance trend
- 49-process coverage map
- milestone timeline
- issue board
- mitigation board
- evidence table
- document section health map
- lessons learned similarity view

For dashboards and processes, AI outputs a structured visual specification. ADPA renders that specification through approved widgets and components. This keeps visuals refreshable, accessible, auditable, RBAC-safe, and consistent with pinned dashboard behavior.

Documents can use curated library images.

Reports and document drafts can automatically include images from a shared visual library to improve readability. These images can appear wherever the report benefits from them. Freeform image generation is deferred; v1 focuses on library-based placement.

Visual library assets are shared across projects and users. Free-for-all uploads are allowed, with PMO-approved or trusted assets ranked higher when available.

Each asset should store:

- uploader
- source or license confirmation
- tags
- alt text
- usage context
- created date
- trust or approval status

Because assets cross project and user boundaries, uploaded visuals must not contain private project data unless sanitized and intentionally shared.

## Lessons Learned

The Compliance preset includes standards, best practices, and lessons learned, not only PMBOK quality processes.

It covers:

- standards-inspired compliance rules
- quality/process compliance anchored by 8.1 Plan Quality Management, 8.2 Manage Quality, and 8.3 Control Quality
- risk coverage anchored by 11.1 through 11.7
- best practices by process, document, project type, and maturity context
- lessons learned from prior projects
- remediation recommendations

Lessons learned support both curated and AI-suggested entries:

- curated lessons are trusted first
- AI can suggest lessons from project evidence
- human-in-the-loop review is required before promotion
- promotion authority follows existing project and role permissions
- promoted lessons become reusable recommendations for future projects

Lessons should be tagged by process, document type, project type, risk category, compliance area, maturity level, and evidence source.

## Data Model Intent

The implementation plan should consider these records:

- `dashboard_presets`: ADPA-defined preset definitions
- `user_preset_layouts`: user-level saved pin, resize, and layout preferences per preset
- `widget_catalog`: shared widget definitions, allowed sizes, data source, and refresh policy
- `dashboard_suggestions`: AI-generated optional changes with pending, applied, or dismissed status
- `user_presentation_profile`: inferred presentation depth and style preferences
- `lessons_learned`: curated, project-saved, promoted, and AI-suggested lessons
- `visual_library_assets`: shared images with metadata and trust ranking

Names are provisional and should be aligned with existing ADPA database conventions during implementation planning.

## Error Handling and Guardrails

The v1 design should handle:

- no accessible projects
- selected project becoming inaccessible between page loads
- missing project data for a widget
- widget data refresh failure
- invalid AI suggestion
- AI suggestion that conflicts with pinned widgets
- invalid widget resize outside allowed sizes
- missing or unlicensed visual library metadata
- lessons suggested without enough evidence

The UI should keep the preset stable, show plain-language errors, and avoid applying invalid AI changes.

## Testing Intent

The implementation plan should cover:

- project selector excludes inaccessible projects
- backend rejects inaccessible project requests
- predefined preset loads without AI
- pinned widgets keep position and valid size across projects
- widget data refreshes based on the selected project
- reset selected preset restores ADPA defaults only for that preset
- AI suggestions never change pinned widgets unless explicitly accepted
- invalid widget sizes are rejected
- structured visuals render from approved component specs
- document library images insert with metadata
- lessons learned promotion follows existing permissions

## Scope Boundaries

Included in v1:

- two page types: PM Command Center and Document Outline View
- ADPA-defined presets
- shared widget catalog
- per-user, cross-project preset personalization
- pin, unpin, constrained resize, and reset selected preset
- stable preset loading with fresh project data
- AI suggestion mode
- structured dashboard/process visuals
- global visual library image placement in document drafts
- broader Compliance preset with standards, quality, risk, best practices, and lessons learned

Excluded from v1:

- full automatic AI layout regeneration on every page load
- freeform drag-and-drop placement
- widget-specific RBAC
- unlimited custom dashboard presets
- freeform AI image generation as the primary document visual source
- project-specific dashboard layout sprawl
- AI-generated changes to the fixed 49-process framework

## Risks and Controls

Risk: AI makes dashboards feel unstable.
Control: Load stable presets first and make AI changes optional suggestions.

Risk: personalization becomes too complex.
Control: Keep preferences user-level across projects and reset one selected preset at a time.

Risk: widgets expose unauthorized data.
Control: project selector lists only accessible projects and backend re-checks access on every request.

Risk: small widgets become unusable when stretched.
Control: each widget declares allowed sizes and the grid rejects invalid footprints.

Risk: compliance scope is too narrow.
Control: treat Compliance as standards, best practices, risk, quality, remediation, and lessons learned rather than only quality management.

Risk: shared visual assets leak private data.
Control: store metadata, require rights/source confirmation, prefer trusted assets, and warn against private project content in shared uploads.

## Outcome

The future ADPA personalization direction is GenUI-enabled but framework-governed. V1 starts with stable ADPA presets, user-level cross-project personalization, constrained widgets, fresh project data, optional AI suggestions, structured process visuals, document outline views, shared curated visuals, and lessons learned intelligence. This gives project managers a familiar command center while creating a controlled path toward richer generated UI over time.
