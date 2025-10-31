# Programs Feature - Complete Implementation

**Status**: 🔵 Planned (Bug Fix + Enhancement)  
**Priority**: 🔴 **HIGH** (P0) - Feature exists but broken  
**Estimated Effort**: Small-Medium (3-4 days)  
**Current State**: API exists, database table exists, UI exists, but **not connected properly**  
**Target Release**: Immediate (Bug Fix) + Q1 2026 (Enhancements)

---

## 📋 Feature Overview

Fix the Programs page to display actual programs from database and enhance with program-project hierarchy, rollup metrics, and portfolio management capabilities.

---

## 🎯 Problem Statement

**Current Issues**:
1. ⚠️ **API Response Mismatch**: Backend returns `{ success: true, data: programs }`, frontend expects `{ programs: [] }`
2. ⚠️ **Programs Not Displaying**: 2 programs in database but page shows "No programs yet"
3. ⚠️ **No Project Assignment**: Cannot assign projects to programs
4. ⚠️ **No Rollup Metrics**: Program-level metrics not calculated from child projects
5. ⚠️ **Incomplete Hierarchy**: Program → Projects relationship not fully implemented

**User Impact**:
- Cannot use programs feature at all
- No portfolio visibility
- No program-level reporting
- Manual tracking in spreadsheets

---

## ✨ Solution - Two Phases

### Phase 1: IMMEDIATE BUG FIX (1-2 hours)

#### Fix 1: API Response Format

**Option A**: Fix Frontend (Recommended - less breaking)
```typescript
// app/programs/page.tsx (line 59)

// BEFORE (incorrect):
const data = await apiClient.request<{ programs: Program[] }>('/programs')
setPrograms(data.programs || [])

// AFTER (correct):
const data = await apiClient.request<{ success: boolean; data: Program[] }>('/programs')
setPrograms(data.data || [])
```

**Option B**: Fix Backend (more consistent with other routes)
```typescript
// server/src/routes/programRoutes.ts (line 47)

// BEFORE:
res.json({ success: true, data: programs })

// AFTER:
res.json({ programs })
```

**Recommendation**: **Option A** - Fix frontend to match backend's success/data pattern (more consistent)

---

#### Fix 2: Add Project Count to Programs List

```typescript
// server/src/services/programService.ts

export async function listPrograms(opts: any) {
  try {
    // ... existing filter logic ...
    
    const query = `
      SELECT 
        p.*,
        u.name as owner_name,
        (SELECT COUNT(*) FROM projects WHERE program_id = p.id) as project_count
      FROM programs p
      LEFT JOIN users u ON p.owner_id = u.id
      ${where} 
      ORDER BY p.created_at DESC 
      LIMIT $${idx++} OFFSET $${idx++}
    `
    
    const result = await pool.query(query, params)
    return result.rows
  } catch (error) {
    logger.error('listPrograms error', { error })
    throw error
  }
}
```

---

### Phase 2: PROGRAM-PROJECT HIERARCHY (3-4 days)

#### Enhancement 1: Assign Projects to Programs

**Update Projects Table**:
```sql
-- Add program_id to projects table (if not exists)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES programs(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_projects_program ON projects(program_id);
```

**API Endpoint**:
```typescript
// server/src/routes/programRoutes.ts

/**
 * POST /api/programs/:id/add-project
 * Assign project to program
 */
router.post('/:id/add-project', 
  authenticateToken, 
  requirePermission('programs.manage'), 
  async (req, res) => {
    try {
      const { id } = req.params
      const { projectId } = req.body
      
      // Update project's program_id
      const result = await pool.query(`
        UPDATE projects 
        SET program_id = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `, [id, projectId])
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Project not found' })
      }
      
      res.json({ success: true, data: result.rows[0] })
    } catch (error) {
      logger.error('Failed to assign project to program:', error)
      res.status(500).json({ error: 'Failed to assign project' })
    }
  }
)

/**
 * DELETE /api/programs/:id/remove-project/:projectId
 * Remove project from program
 */
router.delete('/:id/remove-project/:projectId',
  authenticateToken,
  requirePermission('programs.manage'),
  async (req, res) => {
    try {
      const { projectId } = req.params
      
      await pool.query(`
        UPDATE projects
        SET program_id = NULL, updated_at = NOW()
        WHERE id = $1
      `, [projectId])
      
      res.json({ success: true })
    } catch (error) {
      logger.error('Failed to remove project from program:', error)
      res.status(500).json({ error: 'Failed to remove project' })
    }
  }
)
```

---

#### Enhancement 2: Program Dashboard with Project Rollups

**UI Enhancement**:
```
┌────────────────────────────────────────────────────────────┐
│  Program: Digital Transformation Initiative                 │
│  [Overview] [Projects] [Metrics] [Reports]                 │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  📊 Program Health: 🟡 AMBER                                 │
│                                                              │
│  💰 Budget Performance:                                      │
│  ├─ Total Program Budget: $5,000,000                       │
│  ├─ Allocated to Projects: $4,200,000 (84%)                │
│  ├─ Spent to Date: $2,100,000 (50%)                        │
│  └─ Variance: +$300,000 (6% under budget) ✅               │
│                                                              │
│  📅 Schedule Performance:                                    │
│  ├─ Program Duration: Jan 2026 - Dec 2027 (24 months)      │
│  ├─ Projects Complete: 3 of 12 (25%)                       │
│  ├─ Projects On Track: 6 of 12 (50%)                       │
│  └─ Projects At Risk: 3 of 12 (25%) ⚠️                     │
│                                                              │
│  🎯 Projects (12 total):                                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ✅ Customer Portal Migration              COMPLETE   │  │
│  │   Budget: $350,000 | Timeline: On Track              │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ 🔵 Cloud Infrastructure Upgrade           ACTIVE     │  │
│  │   Budget: $850,000 | Timeline: On Track              │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ ⚠️ Data Warehouse Implementation          AT RISK    │  │
│  │   Budget: $1,200,000 | Timeline: 3 weeks behind ⚠️  │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ 🔵 API Gateway Modernization              ACTIVE     │  │
│  │ ... (8 more projects)                                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  [+ Assign Project] [View All Projects] [Export Report]   │
└────────────────────────────────────────────────────────────┘
```

---

#### Enhancement 3: Program Metrics Calculation

```typescript
// server/src/services/programMetricsService.ts (ALREADY EXISTS!)

// Enhance existing metrics calculation
export async function calculateMetrics(programId: string) {
  const program = await programService.getProgramById(programId)
  if (!program) throw new Error('Program not found')
  
  // Get all projects in this program
  const projects = await pool.query(`
    SELECT 
      p.*,
      (SELECT COUNT(*) FROM documents WHERE project_id = p.id) as document_count,
      (SELECT COUNT(*) FROM milestones WHERE project_id = p.id AND status = 'completed') as completed_milestones,
      (SELECT COUNT(*) FROM milestones WHERE project_id = p.id) as total_milestones
    FROM projects p
    WHERE p.program_id = $1
  `, [programId])
  
  const projectsList = projects.rows
  
  // Calculate rollup metrics
  const metrics = {
    program_id: programId,
    program_name: program.name,
    
    // Project metrics
    total_projects: projectsList.length,
    projects_complete: projectsList.filter(p => p.status === 'completed').length,
    projects_active: projectsList.filter(p => p.status === 'active').length,
    projects_at_risk: projectsList.filter(p => p.status === 'at_risk').length,
    
    // Budget rollup
    total_budget: program.budget || 0,
    allocated_budget: projectsList.reduce((sum, p) => sum + (parseFloat(p.budget) || 0), 0),
    budget_utilization: 0,  // Calculate from actuals
    
    // Schedule rollup
    program_start: program.start_date,
    program_end: program.end_date,
    earliest_project_start: projectsList.reduce((earliest, p) => 
      !earliest || p.start_date < earliest ? p.start_date : earliest, null
    ),
    latest_project_end: projectsList.reduce((latest, p) => 
      !latest || p.end_date > latest ? p.end_date : latest, null
    ),
    
    // Completion metrics
    total_milestones: projectsList.reduce((sum, p) => sum + (p.total_milestones || 0), 0),
    completed_milestones: projectsList.reduce((sum, p) => sum + (p.completed_milestones || 0), 0),
    completion_percentage: 0,  // Calculate
    
    // Document metrics
    total_documents: projectsList.reduce((sum, p) => sum + (p.document_count || 0), 0),
    
    // Health calculation
    overall_health: calculateProgramHealth(projectsList),
    
    // Risk summary
    high_risk_projects: projectsList.filter(p => p.status === 'at_risk').map(p => ({
      id: p.id,
      name: p.name,
      risk_reason: p.risk_reason
    }))
  }
  
  // Calculate percentages
  if (metrics.total_milestones > 0) {
    metrics.completion_percentage = (metrics.completed_milestones / metrics.total_milestones) * 100
  }
  
  if (program.budget && program.budget > 0) {
    metrics.budget_utilization = (metrics.allocated_budget / program.budget) * 100
  }
  
  return metrics
}

function calculateProgramHealth(projects: any[]): 'green' | 'amber' | 'red' {
  if (projects.length === 0) return 'green'
  
  const atRiskCount = projects.filter(p => p.status === 'at_risk').length
  const atRiskPercent = (atRiskCount / projects.length) * 100
  
  if (atRiskPercent >= 30) return 'red'    // 30%+ projects at risk
  if (atRiskPercent >= 15) return 'amber'  // 15-30% projects at risk
  return 'green'                            // < 15% projects at risk
}
```

---

## 🔧 Implementation Plan

### Immediate Bug Fix (TODAY - 1-2 hours)

#### Step 1: Fix API Response Format

```typescript
// app/programs/page.tsx

const fetchPrograms = async () => {
  try {
    setLoading(true)
    const data = await apiClient.request<{ success: boolean; data: Program[] }>('/programs')
    
    // FIX: Use data.data instead of data.programs
    setPrograms(data.data || [])
    
    console.log('[PROGRAMS] Fetched programs:', data.data)
    
  } catch (error) {
    console.error("Failed to fetch programs:", error)
    toast.error("Failed to load programs")
  } finally {
    setLoading(false)
  }
}
```

#### Step 2: Verify Database Programs

Check if programs exist and query is working correctly.

---

### Phase 2: Program-Project Hierarchy (Days 1-2)

#### Add Project Assignment UI

```typescript
// app/programs/[id]/page.tsx (new component or enhance existing)

export default function ProgramDetailPage({ params }: { params: { id: string } }) {
  const [program, setProgram] = useState<Program | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [allProjects, setAllProjects] = useState<Project[]>([])
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  
  const fetchProgramProjects = async () => {
    try {
      const response = await fetch(`/api/programs/${params.id}/projects`)
      const data = await response.json()
      setProjects(data.data || [])
    } catch (error) {
      toast.error('Failed to load projects')
    }
  }
  
  const handleAssignProject = async (projectId: string) => {
    try {
      await fetch(`/api/programs/${params.id}/add-project`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ projectId })
      })
      
      toast.success('Project assigned to program')
      fetchProgramProjects()
      setAssignDialogOpen(false)
      
    } catch (error) {
      toast.error('Failed to assign project')
    }
  }
  
  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Program Projects ({projects.length})</CardTitle>
          <Button onClick={() => setAssignDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Assign Project
          </Button>
        </CardHeader>
        
        <CardContent>
          {projects.map(project => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </CardContent>
      </Card>
      
      {/* Assign Project Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Project to Program</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Label>Select Project</Label>
            <Select onValueChange={handleAssignProject}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a project" />
              </SelectTrigger>
              <SelectContent>
                {allProjects
                  .filter(p => !p.program_id) // Only unassigned projects
                  .map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

---

### Phase 3: Program Rollup Metrics (Days 3-4)

#### Program Dashboard with Aggregated Data

```typescript
// components/program/ProgramMetricsDashboard.tsx

export function ProgramMetricsDashboard({ programId }: { programId: string }) {
  const [metrics, setMetrics] = useState<ProgramMetrics | null>(null)
  
  useEffect(() => {
    fetchMetrics()
  }, [programId])
  
  const fetchMetrics = async () => {
    const response = await fetch(`/api/programs/${programId}/metrics`)
    const data = await response.json()
    setMetrics(data.data)
  }
  
  if (!metrics) return <Loading />
  
  return (
    <div className="space-y-6">
      {/* Program Health Card */}
      <Card>
        <CardHeader>
          <CardTitle>Program Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-4xl">
              {metrics.overall_health === 'green' && '🟢'}
              {metrics.overall_health === 'amber' && '🟡'}
              {metrics.overall_health === 'red' && '🔴'}
            </div>
            <div>
              <div className="text-2xl font-bold">
                {metrics.overall_health.toUpperCase()}
              </div>
              <div className="text-sm text-muted-foreground">
                {metrics.projects_at_risk} of {metrics.total_projects} projects at risk
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Budget Card */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span>Total Budget:</span>
              <span className="font-bold">${metrics.total_budget.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Allocated:</span>
              <span>${metrics.allocated_budget.toLocaleString()}</span>
            </div>
            <Progress value={metrics.budget_utilization} className="h-2" />
            <div className="text-sm text-muted-foreground">
              {metrics.budget_utilization.toFixed(1)}% allocated
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Project Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Project Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span>On Track</span>
              </div>
              <Badge>{metrics.projects_complete + metrics.projects_active} projects</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <span>At Risk</span>
              </div>
              <Badge variant="destructive">{metrics.projects_at_risk} projects</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Completion Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Completion Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-3xl font-bold">
              {metrics.completion_percentage.toFixed(1)}%
            </div>
            <Progress value={metrics.completion_percentage} className="h-3" />
            <div className="text-sm text-muted-foreground">
              {metrics.completed_milestones} of {metrics.total_milestones} milestones complete
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* At-Risk Projects Alert */}
      {metrics.high_risk_projects.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Projects Requiring Attention ({metrics.high_risk_projects.length})</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 space-y-1">
              {metrics.high_risk_projects.map(p => (
                <li key={p.id}>
                  <Link href={`/projects/${p.id}`} className="underline">
                    {p.name}
                  </Link>
                  {p.risk_reason && ` - ${p.risk_reason}`}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
```

---

## 🎨 Complete UI Flow

### 1. Programs List Page

```
┌────────────────────────────────────────────────────────────┐
│  Programs (4 active)                   [+ Create Program]  │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  🔍 [Search programs...]                                     │
│                                                              │
│  ┌────────────────────────────────────┐                     │
│  │ 🟢 Digital Transformation          │                     │
│  │ $5M budget | 12 projects           │                     │
│  │ Jan 2026 - Dec 2027                │                     │
│  │ [View Details →]                   │                     │
│  └────────────────────────────────────┘                     │
│                                                              │
│  ┌────────────────────────────────────┐                     │
│  │ 🟡 Customer Experience Enhancement │                     │
│  │ $3.2M budget | 8 projects          │                     │
│  │ Mar 2026 - Jun 2027                │                     │
│  │ [View Details →]                   │                     │
│  └────────────────────────────────────┘                     │
│                                                              │
│  ... (2 more programs)                                      │
└────────────────────────────────────────────────────────────┘
```

### 2. Program Detail Page

```
┌────────────────────────────────────────────────────────────┐
│  🟡 Customer Experience Enhancement Program                 │
│  [Overview] [Projects] [Metrics] [Reports] [Settings]      │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  Projects Tab:                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Assigned Projects (8)            [+ Assign Project]  │  │
│  │                                                        │  │
│  │ ☑ Mobile App Redesign                      COMPLETE  │  │
│  │   $450K | Jan-Mar 2026 | 100% complete                │  │
│  │   [View] [Remove from Program]                        │  │
│  │                                                        │  │
│  │ 🔵 Website UX Optimization                   ACTIVE   │  │
│  │   $620K | Feb-May 2026 | 45% complete                 │  │
│  │   [View] [Remove from Program]                        │  │
│  │                                                        │  │
│  │ ⚠️ Customer Portal Migration               AT RISK    │  │
│  │   $1.2M | Mar-Aug 2026 | 23% complete (3 weeks late) │  │
│  │   [View] [Remove from Program]                        │  │
│  │                                                        │  │
│  │ ... (5 more projects)                                  │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

---

## 📊 Database Schema Updates

### Current Schema (programs table EXISTS)

```sql
-- Programs table (already exists)
CREATE TABLE IF NOT EXISTS programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  budget DECIMAL(15,2),
  currency VARCHAR(3) DEFAULT 'USD',
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'green' CHECK (status IN ('green', 'amber', 'red')),
  owner_id UUID REFERENCES users(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Required Update

```sql
-- Add program_id to projects (if not exists)
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES programs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_program ON projects(program_id);

-- Update projects service to include program_id in queries
```

---

## 🐛 Bug Fixes Required

### Fix 1: API Response Format Mismatch (CRITICAL)

**File**: `app/programs/page.tsx` line 59-60

```typescript
// CURRENT (BROKEN):
const data = await apiClient.request<{ programs: Program[] }>('/programs')
setPrograms(data.programs || [])

// FIXED:
const data = await apiClient.request<{ success: boolean; data: Program[] }>('/programs')
setPrograms(data.data || [])
```

---

### Fix 2: Add Owner Name to Programs List

**File**: `server/src/services/programService.ts` line 109

```typescript
// CURRENT:
const query = `SELECT * FROM programs ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`

// FIXED:
const query = `
  SELECT 
    p.*,
    u.name as owner_name,
    (SELECT COUNT(*) FROM projects WHERE program_id = p.id) as project_count
  FROM programs p
  LEFT JOIN users u ON p.owner_id = u.id
  ${where} 
  ORDER BY p.created_at DESC 
  LIMIT $${idx++} OFFSET $${idx++}
`
```

---

### Fix 3: Add Program ID to Projects Service

**File**: `server/src/services/projectService.ts`

```typescript
// Add to findByProgram method
export async function findByProgram(programId: string): Promise<Project[]> {
  const result = await pool.query(`
    SELECT 
      p.*,
      u.name as owner_name,
      (SELECT COUNT(*) FROM documents WHERE project_id = p.id) as document_count
    FROM projects p
    LEFT JOIN users u ON p.owner_id = u.id
    WHERE p.program_id = $1
    ORDER BY p.created_at DESC
  `, [programId])
  
  return result.rows
}
```

---

## ✅ Acceptance Criteria

### Immediate Bug Fix
- [ ] Programs page displays actual programs from database
- [ ] API response format matches frontend expectations
- [ ] Program count shows correctly
- [ ] Program cards display correctly
- [ ] Clicking program navigates to detail page

### Phase 2: Hierarchy
- [ ] Can assign projects to programs
- [ ] Can remove projects from programs
- [ ] Program detail page shows assigned projects
- [ ] Project cards show program badge (if assigned)
- [ ] Unassigned projects can be filtered

### Phase 3: Metrics
- [ ] Program metrics calculated from child projects
- [ ] Budget rollup working
- [ ] Completion percentage accurate
- [ ] Health status calculated correctly
- [ ] At-risk projects highlighted

---

## 🚀 Rollout Plan

### TODAY: Critical Bug Fix (1-2 hours)
1. Fix API response format mismatch
2. Test programs page loads
3. Verify 2 existing programs display
4. Deploy fix immediately

### Week 1: Project Assignment (2 days)
1. Add program_id column to projects
2. Create assign/remove endpoints
3. Build assignment UI
4. Test workflow

### Week 2: Rollup Metrics (2 days)
1. Enhance metrics calculation
2. Build program dashboard
3. Add health status logic
4. Test with real data

---

## 📈 Success Metrics

### Technical
- ✅ Programs page loads in < 2 seconds
- ✅ Program-project queries optimized (indexed)
- ✅ Metrics calculation < 5 seconds
- ✅ Zero errors in console/logs

### Business
- ✅ Users can create and view programs
- ✅ Projects properly organized under programs
- ✅ Portfolio visibility achieved
- ✅ Program-level reporting functional

---

## 📚 Related Features

### Existing (Leverage)
- ✅ Programs table exists
- ✅ Program API routes exist
- ✅ Program service exists
- ✅ Program metrics service exists
- ✅ Programs UI exists

### Missing (Build)
- ❌ API response format fix
- ❌ Program-project relationship UI
- ❌ Project assignment workflow
- ❌ Program rollup metrics display

---

**Created**: October 31, 2025  
**Status**: 🔵 Critical Bug + Enhancement  
**Next Steps**: Fix bug immediately, then enhance with hierarchy

