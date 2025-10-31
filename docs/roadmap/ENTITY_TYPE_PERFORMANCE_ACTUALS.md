# New Entity Type: Performance Actuals

**Status**: 🔵 Planned  
**Priority**: 🔴 **CRITICAL** (P0)  
**PMBOK 8 Domain**: Measurement Performance Domain, Project Work Domain  
**Estimated Effort**: Medium (5 days)  
**Dependencies**: Current AI Extraction System (✅ Completed)  
**Target Release**: Q1 2026

---

## 📋 Feature Overview

Add **Performance Actuals** entity type to track actual vs. planned performance across schedule, cost, scope, and quality dimensions. This closes a critical gap in PMBOK 8th Edition Measurement Performance Domain compliance.

---

## 🎯 Problem Statement

**Current Gap:**
- We extract planned data (milestones, deliverables, activities, resources)
- We have NO actual performance data (what actually happened)
- Cannot calculate variances (planned vs. actual)
- Missing critical PMBOK 8 Measurement Domain requirement

**Impact:**
- ⚠️ **Cannot measure project performance** (only plans, not reality)
- ⚠️ **No Earned Value Management** capability
- ⚠️ **No variance analysis** (schedule, cost, scope)
- ⚠️ **Incomplete PMBOK 8 compliance** (70% vs. 95% with this)

**User Pain Points:**
- Project managers manually track actuals in spreadsheets
- No automated variance alerts
- Baseline drift detection lacks actual data comparison
- RAG context missing critical performance data

---

## ✨ Proposed Solution

### New Entity: Performance Actuals

Track actual performance data that can be compared against planned baselines.

#### Entity Schema

```typescript
interface PerformanceActual {
  actual_id: string                    // UUID
  project_id: string                   // Foreign key
  
  // What is being measured
  entity_type: 'milestone' | 'deliverable' | 'activity' | 'phase' | 'resource'
  entity_id: string                    // Foreign key to related entity
  entity_name: string                  // Cached for reporting
  
  // Schedule Actuals
  planned_start_date?: string          // From original plan
  actual_start_date?: string           // When work actually started
  planned_end_date?: string            // From original plan
  actual_end_date?: string             // When work actually finished
  schedule_variance_days?: number      // Positive = ahead, Negative = behind
  schedule_variance_percent?: number   // % ahead/behind
  
  // Cost Actuals
  planned_cost?: number                // Budgeted cost
  actual_cost?: number                 // Actual cost incurred
  cost_variance?: number               // Positive = under budget, Negative = over
  cost_variance_percent?: number       // % under/over budget
  
  // Progress/Completion Actuals
  planned_progress_percent?: number    // Expected % complete by measurement date
  actual_progress_percent?: number     // Actual % complete
  progress_variance?: number           // Difference
  
  // Quality Actuals
  quality_score?: number               // Actual quality rating (1-10)
  defects_found?: number               // Number of defects/issues
  rework_hours?: number                // Time spent on rework
  
  // Metadata
  measurement_date: string             // When this snapshot was taken
  measurement_method: 'manual' | 'automated' | 'extracted' | 'reported'
  measured_by?: string                 // User who recorded this
  notes?: string                       // Additional context
  
  // Timestamps
  created_at: string
  updated_at: string
}
```

---

## 🎨 UI/UX Design

### Performance Dashboard (New View)

```
┌────────────────────────────────────────────────────────────┐
│  Project Performance Dashboard                      [Export]│
├────────────────────────────────────────────────────────────┤
│                                                              │
│  📊 Overall Performance Summary                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Schedule Performance Index (SPI): 0.92 ⚠️ Behind     │  │
│  │ Cost Performance Index (CPI): 1.05 ✅ Under Budget   │  │
│  │ Scope Progress: 67% (target: 70%) 🟡 Slightly Behind│  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  📅 Schedule Variance                                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Milestone          Planned    Actual    Variance     │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ Design Complete    Jan 15     Jan 20    -5 days ⚠️  │  │
│  │ Development Start  Jan 20     Jan 23    -3 days ⚠️  │  │
│  │ Testing Complete   Feb 28     Feb 25    +3 days ✅  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  💰 Cost Variance                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Activity           Budget     Actual     Variance     │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ Requirements      $25,000    $23,500    +$1,500 ✅  │  │
│  │ Design            $40,000    $42,800    -$2,800 ⚠️  │  │
│  │ Development       $80,000    $76,200    +$3,800 ✅  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  📈 Trend Analysis                                           │
│  [Line chart showing SPI/CPI over time]                     │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

### Milestone Detail with Actuals

```
┌────────────────────────────────────────────────────────────┐
│  Milestone: Design Phase Complete                          │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  📅 Schedule Performance                                     │
│  ├─ Planned Start: January 1, 2026                         │
│  ├─ Actual Start: January 1, 2026 ✅                       │
│  ├─ Planned End: January 15, 2026                          │
│  ├─ Actual End: January 20, 2026 ⚠️                        │
│  └─ Variance: -5 days (33% behind)                         │
│                                                              │
│  💰 Cost Performance                                         │
│  ├─ Planned Cost: $40,000                                  │
│  ├─ Actual Cost: $42,800                                   │
│  └─ Variance: -$2,800 (7% over budget)                    │
│                                                              │
│  📊 Progress                                                 │
│  ├─ Planned Progress: 100%                                 │
│  ├─ Actual Progress: 100%                                  │
│  └─ Quality Score: 8.5/10 ✅                               │
│                                                              │
│  📝 Notes:                                                   │
│  Delay caused by additional stakeholder review cycles.      │
│  Cost overrun due to external consultant hours.             │
│                                                              │
│  [View Detailed History] [Edit Actuals]                    │
└────────────────────────────────────────────────────────────┘
```

---

## 🔧 Technical Implementation

### 1. Database Schema

```sql
-- Performance Actuals Table
CREATE TABLE performance_actuals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Entity reference
  entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('milestone', 'deliverable', 'activity', 'phase', 'resource')),
  entity_id UUID NOT NULL,
  entity_name VARCHAR(500) NOT NULL,
  
  -- Schedule actuals
  planned_start_date TIMESTAMP,
  actual_start_date TIMESTAMP,
  planned_end_date TIMESTAMP,
  actual_end_date TIMESTAMP,
  schedule_variance_days INTEGER,
  schedule_variance_percent DECIMAL(5,2),
  
  -- Cost actuals
  planned_cost DECIMAL(15,2),
  actual_cost DECIMAL(15,2),
  cost_variance DECIMAL(15,2),
  cost_variance_percent DECIMAL(5,2),
  
  -- Progress actuals
  planned_progress_percent DECIMAL(5,2),
  actual_progress_percent DECIMAL(5,2),
  progress_variance DECIMAL(5,2),
  
  -- Quality actuals
  quality_score DECIMAL(3,1),
  defects_found INTEGER,
  rework_hours DECIMAL(8,2),
  
  -- Metadata
  measurement_date TIMESTAMP NOT NULL,
  measurement_method VARCHAR(20) NOT NULL CHECK (measurement_method IN ('manual', 'automated', 'extracted', 'reported')),
  measured_by UUID REFERENCES users(id),
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX idx_performance_actuals_project (project_id),
  INDEX idx_performance_actuals_entity (entity_type, entity_id),
  INDEX idx_performance_actuals_measurement_date (measurement_date DESC)
);

-- Trigger to calculate variances automatically
CREATE OR REPLACE FUNCTION calculate_performance_variances()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate schedule variance
  IF NEW.planned_end_date IS NOT NULL AND NEW.actual_end_date IS NOT NULL THEN
    NEW.schedule_variance_days := EXTRACT(DAY FROM (NEW.planned_end_date - NEW.actual_end_date));
    IF NEW.planned_end_date <> NEW.planned_start_date THEN
      NEW.schedule_variance_percent := 
        (EXTRACT(EPOCH FROM (NEW.planned_end_date - NEW.actual_end_date)) / 
         EXTRACT(EPOCH FROM (NEW.planned_end_date - NEW.planned_start_date))) * 100;
    END IF;
  END IF;
  
  -- Calculate cost variance
  IF NEW.planned_cost IS NOT NULL AND NEW.actual_cost IS NOT NULL THEN
    NEW.cost_variance := NEW.planned_cost - NEW.actual_cost;
    IF NEW.planned_cost > 0 THEN
      NEW.cost_variance_percent := (NEW.cost_variance / NEW.planned_cost) * 100;
    END IF;
  END IF;
  
  -- Calculate progress variance
  IF NEW.planned_progress_percent IS NOT NULL AND NEW.actual_progress_percent IS NOT NULL THEN
    NEW.progress_variance := NEW.actual_progress_percent - NEW.planned_progress_percent;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_variances
  BEFORE INSERT OR UPDATE ON performance_actuals
  FOR EACH ROW
  EXECUTE FUNCTION calculate_performance_variances();
```

### 2. AI Extraction Enhancement

```typescript
// server/src/services/projectDataExtractionService.ts

/**
 * Extract performance actuals from project documents
 */
private async extractPerformanceActuals(
  documents: Array<{ id: string; title: string; content: string }>,
  projectId: string,
  options: { aiProvider?: string; aiModel?: string }
): Promise<PerformanceActual[]> {
  try {
    logger.info('[EXTRACTION-ACTUALS] Starting extraction')
    
    const documentContext = this.buildDocumentContext(documents)
    
    const prompt = `
You are analyzing project documents to extract PERFORMANCE ACTUALS - actual performance data that occurred during project execution.

CRITICAL: Only extract ACTUAL performance data (what happened), NOT planned/future data.

Look for:
- "Actual start date: ...", "Actually started on ...", "Work began on ..."
- "Actual end date: ...", "Completed on ...", "Finished on ..."
- "Actual cost: $X", "Spent $X", "Incurred $X"
- "Progress: X% complete", "X% done", "Completed X%"
- "Behind schedule by X days", "Ahead of schedule", "Delayed by ..."
- "Under budget by $X", "Over budget by $X"
- Status updates, progress reports, actual vs. planned comparisons

DOCUMENT CONTENT:
${documentContext}

Extract all performance actuals as a JSON array. For each actual found:

{
  "entity_type": "milestone" | "deliverable" | "activity" | "phase",
  "entity_name": "Name of the milestone/deliverable/activity",
  "planned_start_date": "YYYY-MM-DD" (if mentioned),
  "actual_start_date": "YYYY-MM-DD" (if mentioned),
  "planned_end_date": "YYYY-MM-DD" (if mentioned),
  "actual_end_date": "YYYY-MM-DD" (if mentioned),
  "planned_cost": number (if mentioned),
  "actual_cost": number (if mentioned),
  "planned_progress_percent": number 0-100 (if mentioned),
  "actual_progress_percent": number 0-100 (if mentioned),
  "quality_score": number 1-10 (if mentioned),
  "defects_found": number (if mentioned),
  "rework_hours": number (if mentioned),
  "notes": "Brief context from the document"
}

ONLY include items with ACTUAL data (not just plans). Return empty array if no actuals found.

Output valid JSON array only.
`
    
    const cacheKey = `performance_actuals_${projectId}_${this.hashDocuments(documents)}`
    
    const response = await this.cachedAICall(cacheKey, {
      prompt,
      provider: options.aiProvider || 'openai',
      model: options.aiModel || 'gpt-4-turbo-preview',
      temperature: 0.3,
      max_tokens: 3000
    })
    
    const parsed = this.parseAIResponse(response.content)
    const actuals = parsed.performance_actuals || []
    
    logger.info(`[EXTRACTION-ACTUALS] Extracted ${actuals.length} performance actuals`)
    
    return actuals
    
  } catch (error: unknown) {
    logger.error('[EXTRACTION-ACTUALS] Extraction failed', {
      error: error instanceof Error ? error.message : String(error)
    })
    return []
  }
}

/**
 * Save performance actuals to database
 */
private async savePerformanceActuals(
  projectId: string,
  userId: string,
  actuals: PerformanceActual[],
  client: PoolClient
): Promise<number> {
  if (actuals.length === 0) return 0
  
  const values: any[] = []
  const placeholders: string[] = []
  
  actuals.forEach((actual, index) => {
    const baseIndex = index * 18
    placeholders.push(`(
      $${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4},
      $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8},
      $${baseIndex + 9}, $${baseIndex + 10}, $${baseIndex + 11}, $${baseIndex + 12},
      $${baseIndex + 13}, $${baseIndex + 14}, $${baseIndex + 15}, $${baseIndex + 16},
      $${baseIndex + 17}, $${baseIndex + 18}
    )`)
    
    values.push(
      projectId,
      actual.entity_type,
      actual.entity_id || null, // Will need to resolve from entity_name
      actual.entity_name,
      actual.planned_start_date || null,
      actual.actual_start_date || null,
      actual.planned_end_date || null,
      actual.actual_end_date || null,
      actual.planned_cost || null,
      actual.actual_cost || null,
      actual.planned_progress_percent || null,
      actual.actual_progress_percent || null,
      actual.quality_score || null,
      actual.defects_found || null,
      actual.rework_hours || null,
      actual.measurement_date || new Date().toISOString(),
      'extracted',
      actual.notes || null
    )
  })
  
  const query = `
    INSERT INTO performance_actuals (
      project_id, entity_type, entity_id, entity_name,
      planned_start_date, actual_start_date, planned_end_date, actual_end_date,
      planned_cost, actual_cost, planned_progress_percent, actual_progress_percent,
      quality_score, defects_found, rework_hours,
      measurement_date, measurement_method, notes
    ) VALUES ${placeholders.join(', ')}
    ON CONFLICT (project_id, entity_type, entity_id, measurement_date)
    DO UPDATE SET
      actual_start_date = EXCLUDED.actual_start_date,
      actual_end_date = EXCLUDED.actual_end_date,
      actual_cost = EXCLUDED.actual_cost,
      actual_progress_percent = EXCLUDED.actual_progress_percent,
      quality_score = EXCLUDED.quality_score,
      updated_at = NOW()
  `
  
  await client.query(query, values)
  
  logger.info(`[EXTRACTION-ACTUALS] Saved ${actuals.length} performance actuals`)
  
  return actuals.length
}
```

### 3. API Endpoints

```typescript
// server/src/routes/performanceActuals.ts

import { Router } from 'express'
import { authenticateToken } from '../middleware/auth'
import { pool } from '../database/connection'

const router = Router()

/**
 * GET /api/performance-actuals/:projectId
 * Get all performance actuals for a project
 */
router.get('/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params
    
    const result = await pool.query(`
      SELECT 
        pa.*,
        u.name as measured_by_name
      FROM performance_actuals pa
      LEFT JOIN users u ON pa.measured_by = u.id
      WHERE pa.project_id = $1
      ORDER BY pa.measurement_date DESC, pa.entity_name
    `, [projectId])
    
    res.json({ actuals: result.rows })
    
  } catch (error) {
    logger.error('Failed to fetch performance actuals:', error)
    res.status(500).json({ error: 'Failed to fetch performance actuals' })
  }
})

/**
 * GET /api/performance-actuals/:projectId/summary
 * Get performance summary (SPI, CPI, etc.)
 */
router.get('/:projectId/summary', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params
    
    // Calculate overall performance indices
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_measurements,
        AVG(schedule_variance_days) as avg_schedule_variance_days,
        AVG(schedule_variance_percent) as avg_schedule_variance_percent,
        AVG(cost_variance) as avg_cost_variance,
        AVG(cost_variance_percent) as avg_cost_variance_percent,
        AVG(progress_variance) as avg_progress_variance,
        AVG(quality_score) as avg_quality_score,
        SUM(defects_found) as total_defects,
        SUM(rework_hours) as total_rework_hours
      FROM performance_actuals
      WHERE project_id = $1
    `, [projectId])
    
    const summary = result.rows[0]
    
    // Calculate SPI and CPI
    const spi = summary.avg_schedule_variance_percent 
      ? 1 + (summary.avg_schedule_variance_percent / 100)
      : null
      
    const cpi = summary.avg_cost_variance_percent
      ? 1 + (summary.avg_cost_variance_percent / 100)
      : null
    
    res.json({
      summary: {
        ...summary,
        schedule_performance_index: spi,
        cost_performance_index: cpi,
        overall_health: determineProjectHealth(spi, cpi, summary.avg_quality_score)
      }
    })
    
  } catch (error) {
    logger.error('Failed to calculate performance summary:', error)
    res.status(500).json({ error: 'Failed to calculate performance summary' })
  }
})

/**
 * POST /api/performance-actuals/:projectId
 * Add/update performance actual manually
 */
router.post('/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params
    const userId = req.user!.id
    const actual = req.body
    
    const result = await pool.query(`
      INSERT INTO performance_actuals (
        project_id, entity_type, entity_id, entity_name,
        actual_start_date, actual_end_date,
        actual_cost, actual_progress_percent,
        quality_score, measurement_date,
        measurement_method, measured_by, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'manual', $11, $12)
      RETURNING *
    `, [
      projectId,
      actual.entity_type,
      actual.entity_id,
      actual.entity_name,
      actual.actual_start_date,
      actual.actual_end_date,
      actual.actual_cost,
      actual.actual_progress_percent,
      actual.quality_score,
      actual.measurement_date || new Date().toISOString(),
      userId,
      actual.notes
    ])
    
    res.json({ actual: result.rows[0] })
    
  } catch (error) {
    logger.error('Failed to save performance actual:', error)
    res.status(500).json({ error: 'Failed to save performance actual' })
  }
})

function determineProjectHealth(spi: number | null, cpi: number | null, quality: number | null): string {
  if (!spi || !cpi) return 'unknown'
  
  if (spi >= 0.95 && cpi >= 0.95 && (quality || 7) >= 7) return 'healthy'
  if (spi >= 0.85 && cpi >= 0.85) return 'at_risk'
  return 'unhealthy'
}

export default router
```

---

## 📊 Business Value

### Quantifiable Benefits

1. **Complete PMBOK 8 Compliance**
   - Measurement Domain: 70% → 95% coverage
   - Overall PMBOK 8: 77.5% → 90% coverage

2. **Performance Tracking**
   - Automatic variance calculation
   - SPI/CPI metrics
   - Trend analysis over time

3. **Early Warning System**
   - Alert when schedule variance > threshold
   - Alert when cost variance > threshold
   - Proactive project management

4. **Better RAG Context**
   - AI has actual performance data
   - Better recommendations based on real outcomes
   - Historical performance informs future plans

5. **Compliance & Reporting**
   - Automated performance reports
   - Audit trail of actuals
   - Evidence for PMO reviews

---

## 🧪 Testing Plan

### Unit Tests
- ✅ Variance calculation (schedule, cost, progress)
- ✅ AI extraction from status reports
- ✅ Database save with conflict handling

### Integration Tests
- ✅ Extract actuals from real project documents
- ✅ Performance summary calculation
- ✅ Dashboard displays correct metrics

### Manual Testing
- [ ] Generate project with milestones
- [ ] Add status report documents with actuals
- [ ] Run extraction
- [ ] Verify actuals match source documents
- [ ] Check variance calculations
- [ ] View performance dashboard

---

## 📈 Success Metrics

### Technical
- ✅ Extract actuals from 80%+ of status reports
- ✅ Variance calculations accurate to ±1%
- ✅ Performance summary generates in < 2 seconds

### Business
- ✅ Project managers use dashboard weekly
- ✅ 50%+ reduction in manual tracking time
- ✅ Earlier detection of project issues (2-3 weeks sooner)

---

## 🚀 Rollout Plan

### Phase 1: Backend (Days 1-2)
- Create database schema
- Implement AI extraction
- Add API endpoints

### Phase 2: Frontend (Days 3-4)
- Performance dashboard component
- Actuals display in milestone/deliverable views
- Manual entry forms

### Phase 3: Testing (Day 4)
- Integration testing
- Performance optimization
- User acceptance testing

### Phase 4: Deployment (Day 5)
- Deploy to staging
- Beta testing with select projects
- Production deployment

---

## ✅ Acceptance Criteria

- [ ] Database schema created with proper indexes
- [ ] AI extraction identifies actuals from documents
- [ ] Variances calculated automatically
- [ ] Performance dashboard displays SPI/CPI
- [ ] Manual entry of actuals works
- [ ] API endpoints functional
- [ ] Real-time variance alerts
- [ ] Integration with existing entities (milestones, deliverables)
- [ ] PMBOK 8 Measurement Domain requirements met

---

## 📚 Related Documentation

- **PMBOK 8 Analysis**: `/docs/roadmap/PMBOK8_EXTRACTION_COVERAGE_ANALYSIS.md`
- **AI Extraction**: `/docs/features/AI_PROJECT_DATA_EXTRACTION.md`
- **Baseline Integration**: `/docs/roadmap/entity-baseline-integration.md`

---

**Created**: October 31, 2025  
**Status**: 🔵 Ready for Implementation  
**Next Steps**: Review with team, prioritize in Q1 2026 sprint

