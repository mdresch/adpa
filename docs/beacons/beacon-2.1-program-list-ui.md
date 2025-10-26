# Beacon 2.1: Program List Page (Frontend)

## Owner
Frontend Agent #1

## Duration
20 minutes with GitHub Copilot

## Dependencies
- Beacon 1.2: Program CRUD API (must exist to fetch data)

## Epic
ADPA v3.0 - Program Management UI

## Description
Create a Next.js page that lists all programs in a table with filtering, sorting, and actions. Follows ADPA's existing project list patterns with Radix UI components and Tailwind styling.

---

## Requirements

### New Page: app/programs/page.tsx

**Layout:**
- Page title: "Programs" with "Create Program" button
- Table displaying all programs:
  - Columns: Name, Owner, Budget, Timeline, Status (RAG), Actions
- Filters: Status (all/green/amber/red), Owner (dropdown)
- Sorting: Name, Budget, Start Date (ascending/descending)
- Actions: View, Edit, Delete (admin only)

**Features:**
- Server-side data fetching (getServerSideProps or use client-side with useEffect)
- Loading states (skeleton loader)
- Empty state (no programs message with "Create Program" CTA)
- RAG status indicator (🟢 green, 🟡 amber, 🔴 red)
- Responsive design (mobile-friendly table)

**Create Program Modal:**
- Form fields: name, description, budget, start_date, end_date, owner_id
- Validation: Client-side (React Hook Form) + server-side (API)
- Success: Refresh list, show toast notification
- Error handling: Display validation errors

**Component Structure:**
```typescript
// app/programs/page.tsx
export default function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: 'all', owner: null });
  
  // Fetch programs from API
  // Render table with Radix UI components
  // Handle create/edit/delete actions
}
```

---

## Reference Files

**Study these patterns (COPY THE STYLE EXACTLY):**
- `app/projects/page.tsx` - Project list page (mirror this structure!)
- `app/ai-providers/page.tsx` - Another list page example
- `components/ui/table.tsx` - Radix UI table component
- `components/ui/button.tsx` - Button variants
- `components/ui/dialog.tsx` - Modal dialog for create/edit
- `hooks/use-api.ts` - API fetching hook
- `hooks/use-toast.ts` - Toast notifications

**UI Components to use:**
- `Table` from `@/components/ui/table`
- `Button` from `@/components/ui/button`
- `Dialog` from `@/components/ui/dialog`
- `Select` from `@/components/ui/select`
- `Input` from `@/components/ui/input`
- `Badge` from `@/components/ui/badge` (for RAG status)

---

## Output Files

1. `app/programs/page.tsx` - Main programs list page
2. `components/program/CreateProgramDialog.tsx` (optional - can be inline)
3. `components/program/ProgramTable.tsx` (optional - can be inline)

**Keep it simple:** Start with single file (page.tsx), can refactor to components later.

---

## API Integration

**Endpoints to consume:**
- `GET /api/programs` - List all programs (with filters)
- `POST /api/programs` - Create new program
- `PUT /api/programs/:id` - Update program
- `DELETE /api/programs/:id` - Delete program

**API Client:**
```typescript
import { useApi } from '@/hooks/use-api';

const { data: programs, loading, error } = useApi<Program[]>('/programs', {
  params: { status: filters.status, owner_id: filters.owner }
});
```

---

## Styling

**Use Tailwind classes following ADPA patterns:**
- Page wrapper: `container mx-auto py-8 px-4`
- Table: Radix UI Table with hover effects
- RAG status badges:
  - Green: `bg-green-100 text-green-800`
  - Amber: `bg-yellow-100 text-yellow-800`
  - Red: `bg-red-100 text-red-800`
- Buttons: Existing Button component variants

**Responsive:**
- Desktop: Full table
- Mobile: Card layout (stack columns)

---

## Success Criteria

- [x] Programs page loads and displays programs
- [x] Table shows all required columns
- [x] RAG status displayed correctly (colored badges)
- [x] Filters work (status, owner)
- [x] Sorting works (name, budget, dates)
- [x] Create program dialog opens and works
- [x] Form validation prevents invalid input
- [x] Success/error toasts show appropriately
- [x] Loading states implemented
- [x] Empty state shows when no programs
- [x] Responsive on mobile devices
- [x] Follows ADPA UI patterns exactly

---

## Time Estimate

**Traditional:** 6-8 hours (UI + API integration + styling + responsive)
**With Copilot:** 20 minutes (AI generates, human reviews styling)
**Savings:** 95% faster!

---

**Status:** Ready for AI generation  
**Priority:** HIGH (core program management UI)  
**Parallel:** Can develop with Backend beacons (1.3, 1.4) simultaneously

