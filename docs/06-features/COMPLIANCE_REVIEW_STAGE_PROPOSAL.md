# Compliance Review Stage - Proposal

**Date**: October 18, 2025  
**Requested By**: User  
**Purpose**: Ensure generated documents align with selected standards framework (PMBOK, BABOK, DMBOK)  
**Status**: Proposal

---

## 🎯 Objective

Add a **Compliance Review** stage to the template lifecycle to verify that generated documents properly adhere to the selected framework's standards and structure.

---

## 📊 Current Lifecycle

```
⚪ Draft → 🔵 Testing → 🟡 Validated → 🟢 Production → 🔴 Deprecated
```

**Current Requirements**:
- Draft → Testing: None
- Testing → Validated: 3+ validations, 75%+ success rate
- Validated → Production: 10+ validations, 90%+ success rate
- Any → Deprecated: Manual

---

## 🆕 Proposed Lifecycle (Option A)

```
⚪ Draft → 🔵 Testing → 🟣 Compliance Review → 🟡 Validated → 🟢 Production → 🔴 Deprecated
```

**New Stage Details**:

| Stage | Icon | Requirements | Purpose |
|-------|------|--------------|---------|
| 🟣 **Compliance Review** | 📋 | • 5+ validations<br>• 80%+ success rate<br>• Framework alignment check<br>• Manual approval | Verify documents follow framework standards |

**Promotion Flow**:
1. ⚪ **Draft** → Create template, add system prompt
2. 🔵 **Testing** → Test with sample prompts (3+ times)
3. 🟣 **Compliance Review** → Check framework compliance (5+ uses, manual review)
4. 🟡 **Validated** → Approved for broader use (10+ uses total)
5. 🟢 **Production** → Full deployment, no restrictions

---

## 🔍 What Compliance Review Checks

### For PMBOK Templates
- ✅ All required PMBOK sections present
- ✅ Terminology aligns with PMBOK 7 guidelines
- ✅ Document structure follows PMBOK standards
- ✅ Process groups correctly represented
- ✅ Knowledge areas properly addressed

### For BABOK Templates
- ✅ Required BABOK elements included
- ✅ Business analysis techniques correctly applied
- ✅ Stakeholder perspectives addressed
- ✅ Requirements elicitation methods described

### For DMBOK Templates
- ✅ Data management knowledge areas covered
- ✅ Data governance principles followed
- ✅ DMBOK terminology and concepts correct

---

## 💻 Technical Implementation

### 1. Database Schema Changes

**Migration**: `016_add_compliance_review_stage.sql`

```sql
-- Add 'compliance_review' to development_status enum
ALTER TABLE templates
DROP CONSTRAINT IF EXISTS templates_development_status_check;

ALTER TABLE templates
ADD CONSTRAINT templates_development_status_check
CHECK (development_status IN ('draft', 'testing', 'compliance_review', 'validated', 'production', 'deprecated'));

-- Add compliance tracking columns
ALTER TABLE templates
ADD COLUMN IF NOT EXISTS compliance_checked_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS compliance_checked_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS compliance_notes TEXT,
ADD COLUMN IF NOT EXISTS framework_compliance_score NUMERIC(3,2);

-- Add comments
COMMENT ON COLUMN templates.compliance_checked_at IS 'When framework compliance was last reviewed';
COMMENT ON COLUMN templates.compliance_checked_by IS 'User who performed compliance check';
COMMENT ON COLUMN templates.compliance_notes IS 'Notes from compliance review';
COMMENT ON COLUMN templates.framework_compliance_score IS 'Framework alignment score (0-1)';
```

### 2. Update Promotion Function

```sql
-- Update promote_template_status function to include compliance_review
CREATE OR REPLACE FUNCTION promote_template_status(...)
RETURNS TABLE(...) AS $$
BEGIN
  ...
  ELSIF current_status = 'testing' THEN
    IF validation_count < 3 OR success_rate < 0.75 THEN
      RAISE EXCEPTION 'Cannot promote: Need 3+ validations with 75%+ success rate';
    END IF;
    new_status := 'compliance_review';  -- NEW STAGE
    
  ELSIF current_status = 'compliance_review' THEN
    -- Check compliance requirements
    IF validation_count < 5 OR success_rate < 0.80 THEN
      RAISE EXCEPTION 'Cannot promote: Need 5+ validations with 80%+ success rate';
    END IF;
    -- Check manual compliance approval
    IF compliance_checked_at IS NULL THEN
      RAISE EXCEPTION 'Cannot promote: Manual compliance review required';
    END IF;
    new_status := 'validated';
    
  ELSIF current_status = 'validated' THEN
    IF validation_count < 10 OR success_rate < 0.90 THEN
      RAISE EXCEPTION 'Cannot promote: Need 10+ validations with 90%+ success rate';
    END IF;
    new_status := 'production';
  ...
END;
$$ LANGUAGE plpgsql;
```

### 3. Frontend Status Configuration

**File**: `app/templates/[id]/page.tsx`

```typescript
const statusConfig = {
  // ... existing statuses ...
  
  compliance_review: {
    label: '🟣 Compliance Review',
    emoji: '🟣',
    color: 'bg-purple-100 text-purple-800',
    icon: ClipboardCheck,
    description: 'Framework compliance verification',
    restrictions: 'Limited use pending compliance approval',
    nextStatus: 'validated' as const,
    requiresValidation: 5,
    requiresSuccess: 80,
    requiresCompliance: true  // NEW
  },
  
  // ... rest of config ...
}
```

### 4. Compliance Check UI

**New Component**: Compliance Review Panel

```tsx
{template.development_status === 'compliance_review' && (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <ClipboardCheck className="h-5 w-5" />
        Framework Compliance Check
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      {/* Framework alignment checklist */}
      <div className="space-y-2">
        <h4 className="font-medium">
          {template.framework} Compliance Checklist
        </h4>
        <div className="space-y-2">
          {frameworkChecklist[template.framework].map(item => (
            <div key={item.id} className="flex items-start gap-2">
              <input type="checkbox" id={item.id} />
              <label htmlFor={item.id} className="text-sm">
                {item.label}
              </label>
            </div>
          ))}
        </div>
      </div>
      
      {/* Compliance score */}
      <div>
        <label className="text-sm font-medium">
          Framework Alignment Score
        </label>
        <Input 
          type="number" 
          min="0" 
          max="100" 
          placeholder="0-100%"
        />
      </div>
      
      {/* Review notes */}
      <div>
        <label className="text-sm font-medium">
          Compliance Notes
        </label>
        <Textarea 
          placeholder="Document any framework deviations or recommendations..."
          rows={4}
        />
      </div>
      
      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={handleApproveCompliance} className="flex-1">
          ✅ Approve Compliance
        </Button>
        <Button 
          variant="outline" 
          onClick={handleRejectCompliance}
          className="flex-1"
        >
          ❌ Reject - Back to Testing
        </Button>
      </div>
    </CardContent>
  </Card>
)}
```

---

## 🔄 Updated Promotion Requirements

| From Status | To Status | Requirements |
|-------------|-----------|--------------|
| ⚪ Draft | 🔵 Testing | None |
| 🔵 Testing | 🟣 Compliance Review | • 3+ validations<br>• 75%+ success rate |
| 🟣 Compliance Review | 🟡 Validated | • 5+ validations<br>• 80%+ success rate<br>• ✅ Manual compliance approval |
| 🟡 Validated | 🟢 Production | • 10+ validations<br>• 90%+ success rate |

---

## 🎨 Visual Timeline Update

**Before**:
```
⚪ ─────→ 🔵 ─────→ 🟡 ─────→ 🟢
Draft    Testing   Validated  Production
```

**After**:
```
⚪ ──→ 🔵 ──→ 🟣 ──→ 🟡 ──→ 🟢
Draft  Testing  Compliance  Validated  Production
                  Review
```

---

## 📋 Framework-Specific Checklists

### PMBOK 7 Checklist
```typescript
const pmbok7Checklist = [
  { id: 'obj', label: 'Project objectives clearly stated' },
  { id: 'scope', label: 'Scope statement includes in/out of scope' },
  { id: 'stakeholders', label: 'Stakeholder register with roles' },
  { id: 'deliverables', label: 'Key deliverables identified' },
  { id: 'schedule', label: 'High-level schedule/milestones' },
  { id: 'budget', label: 'Budget summary included' },
  { id: 'risks', label: 'Initial risk assessment' },
  { id: 'success', label: 'Success criteria defined' },
  { id: 'constraints', label: 'Constraints and assumptions' },
  { id: 'approval', label: 'Approval section present' }
]
```

### BABOK v3 Checklist
```typescript
const babokChecklist = [
  { id: 'context', label: 'Business context established' },
  { id: 'requirements', label: 'Requirements elicitation approach' },
  { id: 'stakeholders', label: 'Stakeholder analysis included' },
  { id: 'solution', label: 'Solution scope defined' },
  { id: 'analysis', label: 'Analysis techniques documented' },
  { id: 'validation', label: 'Requirements validation approach' }
]
```

### DMBOK 2.0 Checklist
```typescript
const dmbokChecklist = [
  { id: 'governance', label: 'Data governance principles' },
  { id: 'quality', label: 'Data quality criteria' },
  { id: 'architecture', label: 'Data architecture alignment' },
  { id: 'lifecycle', label: 'Data lifecycle considerations' },
  { id: 'security', label: 'Data security requirements' },
  { id: 'metadata', label: 'Metadata management approach' }
]
```

---

## 🔌 API Endpoints

### New Endpoints

```typescript
// Approve compliance review
POST /api/templates/:id/compliance/approve
Body: {
  compliance_score: number,  // 0-100
  notes: string,
  checklist: { [key: string]: boolean }
}

// Reject compliance review (back to testing)
POST /api/templates/:id/compliance/reject
Body: {
  reason: string,
  recommendations: string
}

// Get compliance history
GET /api/templates/:id/compliance/history
Returns: Array of compliance reviews
```

---

## 📊 Analytics Impact

**New Metrics**:
- Compliance review pass rate
- Average time in compliance review
- Framework compliance scores by template
- Most common compliance issues

**Dashboard Additions**:
```
┌─────────────────────────────────┐
│ 🟣 Templates in Compliance      │
│                                 │
│ 5 templates awaiting review     │
│ Avg compliance score: 87%       │
│ Avg review time: 2.3 days       │
└─────────────────────────────────┘
```

---

## ✅ Benefits

1. **Standards Adherence**: Ensures documents follow framework guidelines
2. **Quality Gate**: Additional checkpoint before validation
3. **Audit Trail**: Documented compliance review history
4. **Framework Confidence**: Users trust generated documents are compliant
5. **Continuous Improvement**: Identify common compliance issues

---

## ⚠️ Considerations

1. **Manual Review Required**: Someone must perform compliance checks (not fully automated)
2. **Additional Time**: Adds a step to the promotion process
3. **Framework Expertise**: Reviewers need framework knowledge
4. **Maintenance**: Checklists need updates when frameworks change

---

## 🚀 Implementation Plan

### Phase 1: Database & Backend (1-2 hours)
- ✅ Add compliance_review status to enum
- ✅ Add compliance tracking columns
- ✅ Update promotion function
- ✅ Create compliance API endpoints

### Phase 2: Frontend UI (2-3 hours)
- ✅ Add compliance status to statusConfig
- ✅ Update lifecycle timeline (5 stages)
- ✅ Create compliance review panel
- ✅ Add framework checklists

### Phase 3: Testing (1 hour)
- ✅ Test promotion flow with new stage
- ✅ Test compliance approval/rejection
- ✅ Verify requirements enforcement

### Phase 4: Documentation (30 minutes)
- ✅ Update user guide
- ✅ Create compliance reviewer guide
- ✅ Document framework checklists

**Total Effort**: ~5-6 hours

---

## 🎯 Recommendation

**Implement Compliance Review Stage** with these priorities:

1. **High Priority**: Database changes, promotion logic
2. **Medium Priority**: Basic compliance approval UI
3. **Low Priority**: Framework-specific checklists (can start with generic)

**Alternative**: Start with a **manual "flag for review"** feature, then automate later

---

## 📝 User's Request

> "I'm looking at adding a stage for compliance review and alignment to the standards framework is selected to be represented in the generated documents."

**Answer**: ✅ **Excellent idea!** 

**Benefits**:
- Ensures PMBOK/BABOK/DMBOK documents follow standards
- Adds quality gate before production
- Builds user confidence in generated documents

**Implementation**: Can be done in ~5-6 hours with the plan above.

**Next Steps**:
1. ✅ Approve proposal
2. Create migration SQL
3. Update frontend lifecycle
4. Add compliance review UI

Would you like me to implement this?

---

**End of Proposal**

