# New Entity Type: Development Approach Metadata (Archived)

**Status**: ✅ Completed  
**Priority**: 🟡 **MEDIUM** (P1)  
**PMBOK 8 Domain**: Development Approach & Life Cycle Performance Domain  
**Target Release**: Q1 2026  
**Completed**: February 2026  
**Archive**: See `archive/2026/ENTITY_TYPE_DEVELOPMENT_APPROACH_COMPLETED.md`

---

## 📋 Feature Overview

Add **Development Approach** metadata to capture the selected project methodology (Predictive/Agile/Hybrid), justification for selection, and tailoring decisions. This is a project-level metadata entity (one per project).

---

## 🎯 Problem Statement

**Current Gap:**
- We extract project activities, phases, and deliverables
- We have NO documentation of WHY specific methodology was chosen
- Missing PMBOK 8 Domain 3 critical requirement: Tailoring justification

**PMBOK 8 Requirement:**
> "Select appropriate development approach, life cycle, and tailor processes to fit the project context."

**Impact:**
- ⚠️ **Cannot answer "Why Agile?"** or "Why Waterfall?" for this project
- ⚠️ **Tailoring decisions not documented**
- ⚠️ **Development Approach Domain 60%** coverage vs. 90% with this
- ⚠️ **Compliance audits lack justification** evidence

---

## ✨ Proposed Solution

### New Entity: Development Approach (Project-Level Metadata)

**Note**: This is NOT a table with many rows - it's **one record per project** storing methodology metadata.

#### Entity Schema

```typescript
interface DevelopmentApproach {
  id: string                           // UUID
  project_id: string                   // Foreign key (UNIQUE - one per project)
  
  // Approach selection
  approach: 
    | 'predictive'                     // Waterfall, traditional
    | 'adaptive'                       // Agile, iterative
    | 'hybrid'                         // Mixed (predictive planning, agile execution)
    | 'incremental'                    // Deliver in increments
    | 'iterative'                      // Refine through iterations
  
  // Specific methodology
  methodology?: 
    | 'waterfall'
    | 'scrum'
    | 'kanban'
    | 'lean'
    | 'safe'                           // Scaled Agile Framework
    | 'prince2'
    | 'custom'
  
  // Tailoring justification
  justification: string                // WHY this approach was selected
  
  // Context factors (PMBOK 8 Domain 3)
  uncertainty_level: 'low' | 'medium' | 'high'
  requirements_stability: 'stable' | 'evolving' | 'uncertain'
  stakeholder_engagement_model: 'periodic' | 'continuous'
  delivery_cadence: 
    | 'single'                         // One delivery at end
    | 'iterative'                      // Multiple refinements
    | 'incremental'                    // Multiple deliveries
    | 'continuous'                     // CI/CD pipeline
  
  // Organizational factors
  organizational_maturity: 'low' | 'medium' | 'high'
  team_experience_level: 'junior' | 'mixed' | 'senior'
  regulatory_constraints?: boolean      // Compliance requirements?
  
  // Tailoring decisions
  tailoring_decisions: {
    area: string                       // What was tailored
    standard_process: string           // Normal organizational process
    tailored_process: string           // How it was adapted
    justification: string              // Why it was tailored
  }[]
  
  // Life cycle phases
  life_cycle_phases: string[]          // e.g., ["Initiation", "Planning", "Execution", "Closure"]
  iteration_length?: number            // For iterative (e.g., 2 weeks)
  iteration_unit?: 'days' | 'weeks'
  
  // Review and governance
  governance_approach: 'lightweight' | 'standard' | 'formal'
  review_gates: string[]               // Stage gates, sprint reviews, etc.
  
  // Metadata
  source_document_id?: string          // Charter, PMP, methodology doc
  defined_by?: string                  // User ID
  approved_by?: string                 // Sponsor/PMO
  
  effective_date: string
  created_at: string
  updated_at: string
}
```

---

## 🎨 UI/UX Design

### Project Settings - Development Approach Section

```
┌────────────────────────────────────────────────────────────┐
│  Project Settings                                           │
│  [General] [Development Approach] ⭐ NEW [Permissions]     │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  🎯 Development Approach                                     │
│                                                              │
│  Selected Approach: Hybrid (Predictive + Agile)            │
│  Methodology: SAFe (Scaled Agile Framework)                │
│                                                              │
│  📝 Justification:                                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Selected hybrid approach because:                     │  │
│  │ • Requirements are 60% stable (infrastructure)        │  │
│  │   + 40% evolving (application features)               │  │
│  │ • Stakeholders need quarterly deliveries             │  │
│  │ • Team has mixed Agile experience (80% trained)      │  │
│  │ • Regulatory compliance requires formal gates         │  │
│  │                                                        │  │
│  │ Hybrid structure:                                      │  │
│  │ - Predictive: Infrastructure (6-month plan)          │  │
│  │ - Agile: Application development (2-week sprints)    │  │
│  │ - Integration: Quarterly PI planning (SAFe model)    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  📊 Context Factors:                                         │
│  ├─ Uncertainty Level: Medium                              │
│  ├─ Requirements Stability: Evolving                       │
│  ├─ Delivery Cadence: Incremental (quarterly releases)    │
│  ├─ Team Experience: Mixed (60% senior, 40% mid)          │
│  └─ Regulatory Constraints: Yes (SOC2, HIPAA)             │
│                                                              │
│  🔧 Tailoring Decisions (4):                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Change Control Process                                 │  │
│  │ Standard: Formal CCB for all changes                  │  │
│  │ Tailored: CCB only for baseline changes, backlog     │  │
│  │           items managed by Product Owner              │  │
│  │ Why: Reduce bureaucracy for Agile components         │  │
│  └──────────────────────────────────────────────────────┘  │
│  ... (3 more tailoring decisions)                           │
│                                                              │
│  📅 Life Cycle:                                              │
│  Initiation → Planning → Execution (6 PIs) → Closure       │
│  Sprint Length: 2 weeks                                     │
│  PI Length: 10 weeks (5 sprints + IP sprint)               │
│                                                              │
│  [Edit Approach] [View Full Details]                       │
└────────────────────────────────────────────────────────────┘
```

---

## 🔧 Technical Implementation

### 1. Database Schema

```sql
-- Development Approach (project metadata)
CREATE TABLE development_approach (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Approach selection
  approach VARCHAR(20) NOT NULL CHECK (approach IN ('predictive', 'adaptive', 'hybrid', 'incremental', 'iterative')),
  methodology VARCHAR(30) CHECK (methodology IN ('waterfall', 'scrum', 'kanban', 'lean', 'safe', 'prince2', 'custom')),
  
  -- Justification
  justification TEXT NOT NULL,
  
  -- Context factors
  uncertainty_level VARCHAR(10) CHECK (uncertainty_level IN ('low', 'medium', 'high')),
  requirements_stability VARCHAR(20) CHECK (requirements_stability IN ('stable', 'evolving', 'uncertain')),
  stakeholder_engagement_model VARCHAR(20),
  delivery_cadence VARCHAR(20) CHECK (delivery_cadence IN ('single', 'iterative', 'incremental', 'continuous')),
  
  -- Organizational context
  organizational_maturity VARCHAR(10),
  team_experience_level VARCHAR(10),
  regulatory_constraints BOOLEAN DEFAULT FALSE,
  
  -- Tailoring
  tailoring_decisions JSONB DEFAULT '[]'::jsonb,
  
  -- Life cycle
  life_cycle_phases JSONB DEFAULT '[]'::jsonb,
  iteration_length INTEGER,
  iteration_unit VARCHAR(10),
  
  -- Governance
  governance_approach VARCHAR(20),
  review_gates JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  source_document_id UUID REFERENCES documents(id),
  defined_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  effective_date TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_dev_approach_project (project_id),
  INDEX idx_dev_approach_methodology (approach, methodology)
);
```

### 2. AI Extraction

```typescript
/**
 * Extract development approach from project charter/PMP
 */
private async extractDevelopmentApproach(
  documents: Array<{ id: string; title: string; content: string }>,
  projectId: string,
  options: { aiProvider?: string; aiModel?: string }
): Promise<DevelopmentApproach | null> {
  try {
    logger.info('[EXTRACTION-APPROACH] Starting extraction')
    
    const documentContext = this.buildDocumentContext(documents)
    
    const prompt = `
You are analyzing project documents to extract DEVELOPMENT APPROACH - the methodology selected for this project.

Look for:
- "Methodology: Agile/Scrum/Waterfall/Hybrid"
- "Development approach: Predictive/Adaptive"
- "Tailoring justification"
- "Why we chose [methodology]"
- Life cycle phases mentioned
- Sprint/iteration lengths
- Delivery cadence (single release vs incremental)
- Governance approach (formal gates, agile ceremonies)

DOCUMENT CONTENT:
${documentContext}

Extract as a single JSON object (not array - one per project):

{
  "approach": "predictive" | "adaptive" | "hybrid" | "incremental" | "iterative",
  "methodology": "waterfall" | "scrum" | "kanban" | "lean" | "safe" | "prince2" | "custom",
  "justification": "Full explanation of why this approach was selected",
  "uncertainty_level": "low" | "medium" | "high",
  "requirements_stability": "stable" | "evolving" | "uncertain",
  "delivery_cadence": "single" | "iterative" | "incremental" | "continuous",
  "team_experience_level": "junior" | "mixed" | "senior",
  "life_cycle_phases": ["Phase 1 name", "Phase 2 name", ...],
  "iteration_length": number (if iterative),
  "iteration_unit": "days" | "weeks",
  "governance_approach": "lightweight" | "standard" | "formal",
  "tailoring_decisions": [
    {
      "area": "What was tailored",
      "standard_process": "Normal org process",
      "tailored_process": "How it was adapted",
      "justification": "Why"
    }
  ]
}

Return JSON object only. Return null if no methodology information found.
`
    
    const cacheKey = `dev_approach_${projectId}_${this.hashDocuments(documents)}`
    
    const response = await this.cachedAICall(cacheKey, {
      prompt,
      provider: options.aiProvider || 'openai',
      model: options.aiModel || 'gpt-4-turbo-preview',
      temperature: 0.3,
      max_tokens: 2000
    })
    
    const parsed = this.parseAIResponse(response.content)
    
    logger.info(`[EXTRACTION-APPROACH] Extracted development approach`)
    
    return parsed.development_approach || null
    
  } catch (error: unknown) {
    logger.error('[EXTRACTION-APPROACH] Extraction failed', {
      error: error instanceof Error ? error.message : String(error)
    })
    return null
  }
}
```

---

## 📊 Business Value

### Benefits

1. **Compliance & Audit**
   - Document WHY methodology was chosen
   - Evidence for PMO/audit reviews
   - Tailoring decisions justified

2. **Knowledge Transfer**
   - New team members understand approach
   - Stakeholders understand delivery model
   - Clear expectations set

3. **PMBOK 8 Alignment**
   - Development Approach Domain: 60% → 90% coverage
   - Overall PMBOK 8: 85% → 88% coverage
   - Tailoring requirement met

4. **Process Improvement**
   - Analyze which approaches work for which projects
   - Historical data for methodology selection
   - ROI analysis by approach type

---

## ✅ Acceptance Criteria

- [ ] Database schema (one record per project)
- [ ] AI extraction from charter/PMP documents
- [ ] Approach categorization accurate
- [ ] Tailoring decisions captured
- [ ] Frontend displays in project settings
- [ ] Manual edit functionality
- [ ] PMBOK 8 Domain 3 requirements met

---

**Created**: October 31, 2025  
**Status**: 🔵 Ready for Implementation  
**PMBOK 8 Impact**: Development Approach Domain 60% → 90%

