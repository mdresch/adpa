# New Entity Type: Team Agreements

**Status**: 🟢 **In Progress** (Frontend Complete ✅)  
**Priority**: 🔴 **HIGH** (P0)  
**PMBOK 8 Domain**: Team Performance Domain  
**Estimated Effort**: Small-Medium (3 days)  
**Dependencies**: Current AI Extraction System (✅ Completed)  
**Target Release**: Q1 2026  
**Completed Tasks**: TASK-143 (Frontend displays agreements by category) ✅

---

## 📋 Feature Overview

Add **Team Agreements** entity type to capture team culture, working norms, ground rules, and collaborative agreements. This addresses a critical gap in PMBOK 8th Edition Team Performance Domain compliance.

---

## 🎯 Problem Statement

**Current Gap:**
- We extract team members (Resources - human type)
- We have NO team culture or agreement data
- Missing critical PMBOK 8 Team Domain requirement
- Team dynamics and psychological safety not tracked

**PMBOK 8 Requirement:**
> "The Team Performance Domain addresses activities and functions associated with establishing team culture and high performance; leadership skills; and an environment that enables the project team to learn and grow."

**Impact:**
- ⚠️ **Incomplete Team Domain coverage** (60% vs. 90% with this)
- ⚠️ **No visibility into team norms** and working agreements
- ⚠️ **Cannot track team culture** indicators
- ⚠️ **Missing psychological safety** data

---

## ✨ Proposed Solution

### New Entity: Team Agreements

Capture explicit team agreements, working norms, collaboration rules, and cultural elements.

#### Entity Schema

```typescript
interface TeamAgreement {
  agreement_id: string                 // UUID
  project_id: string                   // Foreign key
  
  // Agreement details
  title: string                        // e.g., "Communication Protocol"
  description: string                  // Full text of agreement
  
  category: 
    | 'working_hours'                  // Core hours, availability
    | 'communication'                  // How we communicate
    | 'decision_making'                // How decisions are made
    | 'conflict_resolution'            // How we handle disagreements
    | 'quality_standards'              // Quality expectations
    | 'meeting_norms'                  // Meeting etiquette
    | 'code_of_conduct'                // Behavioral expectations
    | 'collaboration_tools'            // Tool usage agreements
    | 'response_times'                 // Expected response SLAs
    | 'knowledge_sharing'              // Documentation and sharing
    | 'other'
  
  // Participation
  agreed_by: string[]                  // User IDs who agreed
  facilitated_by?: string              // Who led the agreement creation
  
  // Lifecycle
  effective_date: string               // When agreement starts
  review_frequency?: string            // e.g., "monthly", "quarterly"
  next_review_date?: string            // When to review
  
  status: 'draft' | 'active' | 'under_review' | 'revised' | 'deprecated'
  
  // Adherence tracking
  adherence_score?: number             // 1-10 (how well team follows it)
  violations_count?: number            // Times agreement was broken
  last_violation_date?: string
  
  // Metadata
  source_document_id?: string          // Where this was found
  notes?: string
  
  created_at: string
  updated_at: string
}
```

---

## 🎨 UI/UX Design

### Team Agreements Tab (New)

```
┌────────────────────────────────────────────────────────────┐
│  Project: Digital Transformation                            │
│  [Overview] [Documents] [Baselines] [Team] ⭐ NEW          │
└────────────────────────────────────────────────────────────┘

Team Tab:
┌────────────────────────────────────────────────────────────┐
│  [Team Members] [Team Agreements] ⭐ NEW [Performance]     │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  📋 Team Agreements (12 active)         [+ Add Agreement]  │
│                                                              │
│  🕐 Working Hours & Availability                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Core Hours: 9am-5pm EST                              │  │
│  │ Agreed by: All 12 team members ✅                    │  │
│  │ Status: Active | Review: Monthly                     │  │
│  │ Adherence: 9.2/10 ⭐                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  💬 Communication Protocol                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Urgent: Phone/SMS (respond within 1 hour)           │  │
│  │ Normal: Teams chat (respond within 4 hours)         │  │
│  │ FYI: Email (respond within 24 hours)                │  │
│  │ Agreed by: All 12 team members ✅                    │  │
│  │ Status: Active | Review: Quarterly                   │  │
│  │ Adherence: 8.7/10 ⭐                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  🤝 Decision-Making Authority                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Technical decisions: Tech Lead (with team input)    │  │
│  │ Scope changes: PM + Sponsor approval                │  │
│  │ Design decisions: Team consensus                    │  │
│  │ Agreed by: All 12 team members ✅                    │  │
│  │ Status: Active | Review: As needed                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  🎯 Quality Standards                                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ All code must have 80% test coverage               │  │
│  │ Peer review required for all PRs                    │  │
│  │ Documentation updated before merge                  │  │
│  │ Agreed by: Development team (8 members) ✅          │  │
│  │ Status: Active | Review: Monthly                     │  │
│  │ Adherence: 9.5/10 ⭐⭐                                │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  🔧 Conflict Resolution                                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 1. Direct conversation between parties               │  │
│  │ 2. Escalate to PM if unresolved                     │  │
│  │ 3. PM mediates with stakeholder input               │  │
│  │ Agreed by: All 12 team members ✅                    │  │
│  │ Status: Active | Review: Quarterly                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

---

## 🔧 Technical Implementation

### 1. Database Schema

```sql
-- Team Agreements Table
CREATE TABLE team_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Agreement details
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(30) NOT NULL CHECK (category IN (
    'working_hours', 'communication', 'decision_making', 
    'conflict_resolution', 'quality_standards', 'meeting_norms',
    'code_of_conduct', 'collaboration_tools', 'response_times',
    'knowledge_sharing', 'other'
  )),
  
  -- Participation
  agreed_by JSONB DEFAULT '[]'::jsonb, -- Array of user IDs
  facilitated_by UUID REFERENCES users(id),
  
  -- Lifecycle
  effective_date TIMESTAMP NOT NULL,
  review_frequency VARCHAR(20), -- 'weekly', 'monthly', 'quarterly', 'annually'
  next_review_date TIMESTAMP,
  
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN (
    'draft', 'active', 'under_review', 'revised', 'deprecated'
  )),
  
  -- Adherence tracking
  adherence_score DECIMAL(3,1), -- 1.0 to 10.0
  violations_count INTEGER DEFAULT 0,
  last_violation_date TIMESTAMP,
  
  -- Metadata
  source_document_id UUID REFERENCES documents(id),
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  
  -- Indexes
  INDEX idx_team_agreements_project (project_id),
  INDEX idx_team_agreements_category (category),
  INDEX idx_team_agreements_status (status)
);

-- Track agreement adherence over time
CREATE TABLE team_agreement_adherence_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID NOT NULL REFERENCES team_agreements(id) ON DELETE CASCADE,
  date_recorded TIMESTAMP NOT NULL DEFAULT NOW(),
  adherence_score DECIMAL(3,1),
  notes TEXT,
  recorded_by UUID REFERENCES users(id),
  
  INDEX idx_adherence_log_agreement (agreement_id),
  INDEX idx_adherence_log_date (date_recorded DESC)
);
```

### 2. AI Extraction Enhancement

```typescript
/**
 * Extract team agreements from project documents
 */
private async extractTeamAgreements(
  documents: Array<{ id: string; title: string; content: string }>,
  projectId: string,
  options: { aiProvider?: string; aiModel?: string }
): Promise<TeamAgreement[]> {
  try {
    logger.info('[EXTRACTION-TEAM-AGREEMENTS] Starting extraction')
    
    const documentContext = this.buildDocumentContext(documents)
    
    const prompt = `
You are analyzing project documents to extract TEAM AGREEMENTS - explicit agreements made by the project team about how they will work together.

Look for:
- Working hours and availability commitments
- Communication protocols and response time expectations
- Decision-making authority and processes
- Conflict resolution procedures
- Quality standards and Definition of Done
- Meeting norms and etiquette
- Code of conduct or behavioral expectations
- Tool usage agreements (Jira, Slack, etc.)
- Knowledge sharing commitments
- Ground rules and team charter items

DOCUMENT CONTENT:
${documentContext}

Extract all team agreements as a JSON array. For each agreement found:

{
  "title": "Brief title of the agreement",
  "description": "Full text of what was agreed",
  "category": "working_hours" | "communication" | "decision_making" | "conflict_resolution" | "quality_standards" | "meeting_norms" | "code_of_conduct" | "collaboration_tools" | "response_times" | "knowledge_sharing" | "other",
  "effective_date": "YYYY-MM-DD" (when agreement started, or document date if not specified),
  "review_frequency": "weekly" | "monthly" | "quarterly" | "annually" (if mentioned),
  "notes": "Additional context from the document"
}

Examples of what to extract:
- "Team agreed to core hours of 9am-5pm EST with flexible start/end times"
- "Decision-making: Technical Lead has authority on architecture, PM on scope"
- "All code changes require peer review before merge"
- "Respond to urgent Slack messages within 1 hour during business hours"
- "Weekly retrospectives every Friday at 2pm"

Return valid JSON array only. Return empty array if no team agreements found.
`
    
    const cacheKey = `team_agreements_${projectId}_${this.hashDocuments(documents)}`
    
    const response = await this.cachedAICall(cacheKey, {
      prompt,
      provider: options.aiProvider || 'openai',
      model: options.aiModel || 'gpt-4-turbo-preview',
      temperature: 0.3,
      max_tokens: 2500
    })
    
    const parsed = this.parseAIResponse(response.content)
    const agreements = parsed.team_agreements || []
    
    logger.info(`[EXTRACTION-TEAM-AGREEMENTS] Extracted ${agreements.length} team agreements`)
    
    return agreements
    
  } catch (error: unknown) {
    logger.error('[EXTRACTION-TEAM-AGREEMENTS] Extraction failed', {
      error: error instanceof Error ? error.message : String(error)
    })
    return []
  }
}
```

---

## 🎯 Use Cases

### Use Case 1: Project Kickoff
**Scenario**: Team creates charter with working agreements

**Document Content**:
```markdown
## Team Working Agreements

The project team has agreed to the following norms:

**Core Hours**: All team members will be available 10am-3pm EST for meetings and collaboration.

**Communication Protocol**:
- Urgent matters: Phone call or SMS (respond within 1 hour)
- Important: Microsoft Teams chat (respond within 4 hours)
- Normal: Email (respond within 24 hours)

**Decision Authority**:
- Technical architecture: Tech Lead (with team consultation)
- Scope changes: Project Manager (requires sponsor approval if >5% budget impact)
- Design decisions: Team consensus via voting

**Code Review Standards**:
- All pull requests require 2 approvals
- Reviews completed within 24 hours
- No merge on Friday afternoons

**Meeting Norms**:
- Start on time, end on time
- Cameras on for all meetings
- Agenda sent 24 hours in advance
- Meeting notes published within 2 hours
```

**AI Extraction Result**:
```json
[
  {
    "title": "Core Working Hours",
    "description": "All team members available 10am-3pm EST for meetings and collaboration",
    "category": "working_hours",
    "effective_date": "2026-01-15"
  },
  {
    "title": "Communication Response Times",
    "description": "Urgent: Phone/SMS (1 hour), Important: Teams (4 hours), Normal: Email (24 hours)",
    "category": "response_times",
    "effective_date": "2026-01-15"
  },
  {
    "title": "Decision-Making Authority",
    "description": "Tech Lead on architecture (with consultation), PM on scope (sponsor approval >5% budget), Team consensus on design",
    "category": "decision_making",
    "effective_date": "2026-01-15"
  },
  {
    "title": "Code Review Standards",
    "description": "2 approvals required, 24-hour SLA, no Friday afternoon merges",
    "category": "quality_standards",
    "effective_date": "2026-01-15"
  },
  {
    "title": "Meeting Etiquette",
    "description": "Start/end on time, cameras on, agenda 24 hours prior, notes within 2 hours",
    "category": "meeting_norms",
    "effective_date": "2026-01-15"
  }
]
```

---

### Use Case 2: Agile Team Charter

**Document Content**:
```markdown
# Team Charter - Scrum Team Alpha

## Our Values
We commit to transparency, inspection, and adaptation.

## Working Agreement
1. Daily standup at 9:30am sharp (max 15 minutes)
2. Sprint planning on Monday mornings (2-hour timebox)
3. Sprint retrospectives every other Friday
4. Definition of Done must be met before story can be "Done"
5. Help-first culture: Ask for help early, offer help proactively
6. Fail fast: Report blockers immediately
7. Respect work-life balance: No expectation to respond outside core hours

## Conflict Resolution
1. Raise concern in retrospective (if it can wait)
2. Talk directly to person involved (if urgent)
3. Escalate to Scrum Master if unresolved within 2 days
4. Team vote for deadlocks (majority rules)
```

**AI Extraction Result**: 7 team agreements extracted

---

## 📊 Example Agreements by Category

### Communication (3-5 agreements typical)
- "Response time expectations for different message types"
- "Preferred communication channels for different scenarios"
- "Escalation path for urgent issues"
- "Meeting invitation lead time requirements"

### Decision-Making (2-4 agreements)
- "Authority matrix for different decision types"
- "Consensus vs. consultative vs. command decisions"
- "Voting procedures for deadlocks"

### Quality Standards (3-6 agreements)
- "Definition of Done for user stories"
- "Code review requirements"
- "Testing standards before deployment"
- "Documentation requirements"

### Working Norms (2-4 agreements)
- "Core collaboration hours"
- "Remote work expectations"
- "Meeting attendance policies"

### Conflict Resolution (1-2 agreements)
- "Process for addressing disagreements"
- "Escalation procedures"

---

## 🔧 Technical Implementation

### 1. Database Migration

```sql
-- Migration: 200_create_team_agreements.sql

CREATE TABLE team_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(30) NOT NULL,
  
  agreed_by JSONB DEFAULT '[]'::jsonb,
  facilitated_by UUID REFERENCES users(id),
  
  effective_date TIMESTAMP NOT NULL,
  review_frequency VARCHAR(20),
  next_review_date TIMESTAMP,
  
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  
  adherence_score DECIMAL(3,1),
  violations_count INTEGER DEFAULT 0,
  last_violation_date TIMESTAMP,
  
  source_document_id UUID REFERENCES documents(id),
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  
  INDEX idx_team_agreements_project (project_id),
  INDEX idx_team_agreements_category (category),
  INDEX idx_team_agreements_status (status)
);

CREATE TABLE team_agreement_adherence_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID NOT NULL REFERENCES team_agreements(id) ON DELETE CASCADE,
  date_recorded TIMESTAMP NOT NULL DEFAULT NOW(),
  adherence_score DECIMAL(3,1),
  notes TEXT,
  recorded_by UUID REFERENCES users(id),
  
  INDEX idx_adherence_log_agreement (agreement_id),
  INDEX idx_adherence_log_date (date_recorded DESC)
);
```

### 2. Update Extraction Service

Add to parallel extraction array:

```typescript
// server/src/services/projectDataExtractionService.ts

async extractProjectEntities(...): Promise<ExtractionResult> {
  // ... existing code ...
  
  const [
    stakeholders,
    requirements,
    risks,
    milestones,
    constraints,
    successCriteria,
    bestPractices,
    phases,
    resources,
    technologies,
    qualityStandards,
    deliverables,
    scopeItems,
    activities,
    teamAgreements  // ⭐ NEW - 14th entity type
  ] = await Promise.all([
    this.extractStakeholders(documents, projectId, options),
    this.extractRequirements(documents, projectId, options),
    this.extractRisks(documents, projectId, options),
    this.extractMilestones(documents, projectId, options),
    this.extractConstraints(documents, projectId, options),
    this.extractSuccessCriteria(documents, projectId, options),
    this.extractBestPractices(documents, projectId, options),
    this.extractPhases(documents, projectId, options),
    this.extractResources(documents, projectId, options),
    this.extractTechnologies(documents, projectId, options),
    this.extractQualityStandards(documents, projectId, options),
    this.extractDeliverables(documents, projectId, options),
    this.extractScopeItems(documents, projectId, options),
    this.extractActivities(documents, projectId, options),
    this.extractTeamAgreements(documents, projectId, options)  // ⭐ NEW
  ])
  
  return {
    stakeholders,
    requirements,
    risks,
    milestones,
    constraints,
    successCriteria,
    bestPractices,
    phases,
    resources,
    technologies,
    qualityStandards,
    deliverables,
    scopeItems,
    activities,
    teamAgreements  // ⭐ NEW
  }
}
```

### 3. Frontend Component

```typescript
// app/projects/[id]/team/page.tsx (new file)

export default function ProjectTeamPage({ params }: { params: { id: string } }) {
  const [agreements, setAgreements] = useState<TeamAgreement[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetchTeamAgreements()
  }, [params.id])
  
  const fetchTeamAgreements = async () => {
    try {
      const response = await fetch(`/api/team-agreements/${params.id}`)
      const data = await response.json()
      setAgreements(data.agreements)
    } finally {
      setLoading(false)
    }
  }
  
  const groupedAgreements = groupBy(agreements, 'category')
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Team Agreements</h1>
        <Button onClick={() => setShowAddDialog(true)}>
          + Add Agreement
        </Button>
      </div>
      
      {Object.entries(groupedAgreements).map(([category, categoryAgreements]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle>{formatCategory(category)}</CardTitle>
            <CardDescription>{categoryAgreements.length} active agreements</CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {categoryAgreements.map(agreement => (
              <AgreementCard key={agreement.id} agreement={agreement} />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

---

## 📈 Success Metrics

### Technical
- ✅ Extract 5-15 team agreements per project (typical)
- ✅ Categorization accuracy > 90%
- ✅ Adherence tracking updates weekly

### Business
- ✅ Team Performance Domain coverage: 60% → 90%
- ✅ Overall PMBOK 8 coverage: 77.5% → 83%
- ✅ Team culture visibility improved
- ✅ Onboarding time reduced (new members read agreements)

---

## 🚀 Rollout Plan

### Day 1: Database & Backend
- Create database schema
- Implement AI extraction method
- Add to parallel extraction
- Create API endpoints

### Day 2: Frontend UI
- Team Agreements tab
- Display agreements by category
- Manual add/edit forms
- Adherence tracking UI

### Day 3: Testing & Deployment
- Integration testing
- User acceptance testing
- Deploy to production

---

## ✅ Acceptance Criteria

- [x] Database schema created ✅ **TASK-138 COMPLETE** (Migration 329)
- [x] AI extraction working for team agreements ✅
- [x] Agreements categorized correctly (>90% accuracy) ✅
- [x] **Frontend displays agreements by category** ✅ **TASK-143 COMPLETE**
- [ ] Manual add/edit functionality
- [ ] Adherence tracking enabled
- [x] Integration with main extraction flow ✅
- [ ] PMBOK 8 Team Domain requirements met (partial - frontend complete)

---

**Created**: October 31, 2025  
**Status**: 🟢 **In Progress** - Frontend Complete (TASK-143) ✅  
**Last Updated**: November 13, 2025  
**PMBOK 8 Impact**: Team Performance Domain 60% → 90%

---

## 🎉 Implementation Status

### ✅ Completed (November 2025)

1. **Database Schema (TASK-138)** ✅ **COMPLETE**
   - `team_agreements` table created/updated
   - `team_agreement_adherence_log` table created
   - Migration 329 applied successfully
   - All constraints, indexes, and triggers verified
   - Existing data migrated (ARRAY → JSONB, DATE → TIMESTAMP)
   - Test suite created (`team-agreements-schema.test.ts`)

2. **AI Extraction** ✅
   - Team agreements extraction implemented
   - Successfully extracting agreements from project documents
   - Categorization working correctly

3. **Frontend Display (TASK-143)** ✅ **COMPLETE**
   - `TeamAgreementsTab` component created
   - Displays agreements grouped by category
   - Category icons and formatting implemented
   - Status badges and metadata display
   - Type-safe handling of `adherence_score` (handles null/undefined/string values)
   - Integrated into project page tabs

**Component Location**: `app/projects/[id]/components/TeamAgreementsTab.tsx`

**Features Implemented**:
- ✅ Fetches team agreements via API
- ✅ Groups agreements by category (11 categories supported)
- ✅ Displays category-specific icons and colors
- ✅ Shows agreement details (title, description, status, review frequency)
- ✅ Displays agreed by count and review information
- ✅ Handles empty states and loading states
- ✅ Type-safe numeric handling for adherence scores

### 🔄 In Progress

- Manual add/edit functionality
- Adherence tracking UI
- Violation tracking

### 📋 Remaining Tasks

- Manual add/edit forms
- Adherence score input/update UI
- Violation reporting interface
- Integration with PMBOK 8 Team Domain dashboard

