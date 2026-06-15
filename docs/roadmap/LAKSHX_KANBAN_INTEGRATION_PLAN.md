# LakshX Project Integration into ADPA (Kanban & Task Visibility)

## Goal Description
This document provides an architectural review and implementation plan for integrating the core philosophies of the **LakshX** project management platform into the existing **ADPA Task Management Hierarchy**. LakshX focuses on high-velocity, async-first teamwork, radical visibility (Kanban), and AI-driven task management. By fusing these concepts into ADPA, we can expose transparent, AI-assisted Kanban boards to end-users (researchers, stakeholders, and governors).

> [!NOTE]
> This plan has been updated following a direct review of the LakshX source code repository (`backend/prisma/schema.prisma`), which provided concrete architectural answers to our previous open questions.

## User Review Required
The proposed changes involve significant schema additions to support dynamic columns, card histories, and meeting transcriptions. Please review the **Proposed Changes** section carefully before we proceed with creating Drizzle migrations.

## Resolved Architectural Decisions (from LakshX Codebase)
1. **End-User Permissions:** Instead of global read/write access, LakshX uses **Column-Level Permissions**. Each column in the Kanban board has granular flags (`isClientVisible`, `canCreateCards`, `canEditCards`, `canDeleteCards`). We will adopt this exact model in ADPA so stakeholders can interact safely.
2. **AI Trigger Point:** LakshX uses an elegant `DraftCard` approach. When a `Meeting` is transcribed, the AI parses the `TranscriptSegment`s and creates `DraftCard`s (with proposed titles, descriptions, and assignees) which sit in a `PENDING` state until a human user explicitly approves them into real `Card`s. We will replicate this `DraftCard` approval queue.

## Proposed Changes

### 1. Radical Visibility & Column Architecture
**LakshX Principle:** "If it's not on the board, it doesn't exist."
- **ADPA Implementation:** We will move away from static enum statuses and adopt the LakshX `Board -> Column -> Card` hierarchy.
- **Change:** 
  - Add `boards` and `columns` tables to the ADPA schema.
  - Columns will include granular client permissions (`isClientVisible`, `canEditCards`, etc.) to solve the stakeholder visibility challenge securely.

### 2. Async-First Collaboration
**LakshX Principle:** Eliminate status meetings by moving communication to the task card.
- **ADPA Implementation:** Extend the tasks schema to include an interactive event and comment feed.
- **Change:** Add a `comments` table with an `isInternal` flag, allowing teams to toggle whether a comment is visible to the external stakeholders interacting with the board.

### 3. Velocity Engine & Bottleneck Tracking
**LakshX Principle:** Track team velocity and identify bottlenecks automatically.
- **ADPA Implementation:** We will port the `CardHistory` pattern from LakshX.
- **Change:** 
  - [NEW] Create a `task_history` table in Postgres that logs `oldValue` and `newValue` every time a card's field (like `columnId`, `assignee`, or `priority`) changes.
  - [NEW] The backend will compute velocity by calculating the timestamp deltas between column movements (e.g., time spent in "In Progress").

### 4. AI-Integrated Ticket Generation (Draft Cards)
**LakshX Principle:** AI auto-generates action items and subtasks from discussions without polluting the live board.
- **ADPA Implementation:** Leverage our existing `aiService` to parse meeting transcripts.
- **Change:** 
  - [NEW] Introduce `meetings`, `transcript_segments`, and `draft_tasks` tables.
  - [NEW] Create an approval UI where governors can review AI-generated `draft_tasks` before they are promoted to live tasks on the Kanban board.

## Verification Plan

### Automated Tests
- `npm run test:features` targeting a new `kanban.velocity.test.ts` to ensure status transitions are accurately logged in the `task_history` table.
- Unit tests verifying the AI parsing logic correctly extracts action items from `transcript_segments` into `draft_tasks` and that the approval mutation successfully converts them.

### Manual Verification
- Deploy the frontend and verify the drag-and-drop Kanban board correctly enforces column-level permissions (e.g., verifying a stakeholder cannot drag a card out of a restricted column).
- Test the Draft Task approval flow end-to-end.
