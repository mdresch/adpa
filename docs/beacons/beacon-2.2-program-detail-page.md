# Beacon 2.2: Program Detail Page (Frontend)

## Owner
Frontend Agent #1

## Duration
25 minutes with GitHub Copilot

## Dependencies
- Beacon 1.2: Program CRUD API
- Beacon 1.4: Program metrics API
- Beacon 1.3: Project-program linking (to list projects)

## Epic
ADPA v3.0 - Program Management UI

## Description
Create a detailed program dashboard page showing program overview, project list, metrics, and activity feed. This is the main program management interface for program managers.

---

## Requirements

### New Page: app/programs/[id]/page.tsx

**Layout Sections:**

1. **Program Header**
   - Program name (editable inline for admin/owner)
   - Breadcrumb: Programs > {Program Name}
   - Actions: Edit, Delete, Archive (admin only)
   - RAG status badge (large, prominent)

2. **Metrics Cards (4 cards in grid)**
   - Budget: Total, Spent, Remaining (progress bar)
   - Schedule: Start date, End date, Days elapsed (progress bar)
   - Projects: Total count, Green/Amber/Red breakdown
   - Risks: Total, Critical/High/Medium/Low counts

3. **Tabs Navigation**
   - Overview (default)
   - Projects (list of projects in program)
   - Reports (board reports, status updates)
   - Settings (program settings, access control)

4. **Overview Tab:**
   - Program description (markdown rendering)
   - Key milestones (next 3 upcoming)
   - Recent activity feed (last 10 activities)
   - Owner and stakeholder list

5. **Projects Tab:**
   - Table of all projects in program
   - Columns: Name, Status, Budget, Timeline, Progress
   - Action: Click to view project detail
   - Action: Add existing project to program
   - Action: Create new project in program

---

## Reference Files

**Study these patterns:**
- `app/projects/[id]/page.tsx` - Project detail page (MIRROR THIS!)
- `app/ai-providers/[id]/edit/page.tsx` - Another detail page example
- `components/ui/card.tsx` - Metric cards
- `components/ui/tabs.tsx` - Tab navigation
- `hooks/use-api.ts` - Data fetching

**Component patterns:**
- Header with breadcrumb: See any [id]/page.tsx
- Metric cards: 2x2 grid on desktop, stack on mobile
- Tabs: Radix UI Tabs component
- Activity feed: Simple list with timestamps

---

## API Integration

**Endpoints:**
- `GET /api/programs/:id` - Get program details
- `GET /api/programs/:id/metrics` - Get aggregated metrics (Beacon 1.4)
- `GET /api/programs/:programId/projects` - List projects (Beacon 1.3)
- `PUT /api/programs/:id` - Update program
- `DELETE /api/programs/:id` - Delete program

**Real-time updates:**
- WebSocket subscription to program changes
- Auto-refresh metrics when projects update
- Show toast when program status changes

---

## Component Structure

```typescript
// app/programs/[id]/page.tsx
'use client'; // Client component for interactivity

export default function ProgramDetailPage({ params }: { params: { id: string } }) {
  const { data: program, loading } = useApi<Program>(`/programs/${params.id}`);
  const { data: metrics } = useApi<ProgramMetrics>(`/programs/${params.id}/metrics`);
  const { data: projects } = useApi<Project[]>(`/programs/${params.id}/projects`);
  
  const [activeTab, setActiveTab] = useState('overview');
  
  return (
    <div className="container mx-auto py-8">
      <ProgramHeader program={program} />
      <MetricsGrid metrics={metrics} />
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <ProgramOverview program={program} />
        </TabsContent>
        <TabsContent value="projects">
          <ProjectList projects={projects} programId={params.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

## Styling

**Metrics Cards (2x2 grid):**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
  <Card>
    <CardHeader>Budget</CardHeader>
    <CardContent>
      <div className="text-3xl font-bold">${metrics.budget.spent.toLocaleString()}</div>
      <div className="text-sm text-gray-500">of ${metrics.budget.total.toLocaleString()}</div>
      <Progress value={metrics.budget.percentSpent} className="mt-2" />
    </CardContent>
  </Card>
  {/* Repeat for other metrics */}
</div>
```

**RAG Status Badge:**
```tsx
<Badge variant={
  program.status === 'green' ? 'success' :
  program.status === 'amber' ? 'warning' : 'destructive'
}>
  {program.status === 'green' && '🟢'}
  {program.status === 'amber' && '🟡'}
  {program.status === 'red' && '🔴'}
  {' '}{program.status.toUpperCase()}
</Badge>
```

---

## Success Criteria

- [x] Program detail page loads with correct data
- [x] Metrics cards display aggregated data
- [x] RAG status prominently displayed
- [x] Tabs work (Overview, Projects, Reports)
- [x] Project list shows all projects in program
- [x] Real-time updates work (WebSocket)
- [x] Edit/delete actions work (authorized users only)
- [x] Responsive design (mobile-friendly)
- [x] Loading states implemented
- [x] Error states handled
- [x] Follows ADPA UI patterns

---

## Time Estimate

**Traditional:** 8-10 hours (complex page, multiple sections, API integration)
**With Copilot:** 25 minutes (AI generates layout, human refines styling)
**Savings:** 96% faster!

---

**Status:** Ready for AI generation  
**Priority:** HIGH (main program management interface)  
**Parallel:** Can develop with Backend beacons simultaneously

