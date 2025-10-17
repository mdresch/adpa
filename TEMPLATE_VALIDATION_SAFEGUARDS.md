# 🛡️ Template Validation Safeguards

## Purpose

Prevent batch document generation with unvalidated templates to ensure quality and avoid flooding users with potentially low-quality AI-generated documents.

---

## Current Status

✅ **Migration Created**: `server/migrations/015_template_development_status.sql`
- Adds `development_status` column (draft, testing, validated, production, deprecated)
- Adds validation tracking (validation_count, success_count, quality_threshold)
- Creates `template_health` view
- Creates promotion functions with quality gates

⏳ **Migration Not Yet Applied**: Run when ready to enable template lifecycle tracking

---

## Template Development Lifecycle

### **Status Flow**
```
draft → testing → validated → production
         ↓          ↓           ↓
      (manual)  (3+ runs,  (10+ runs,
                 70%+       85%+
                 success)   success)
```

### **Status Definitions**

#### **draft**
- Newly created template
- Not tested yet
- **Restriction**: ⚠️ One document at a time only
- **UI Warning**: "This template is in draft status. Test carefully."

#### **testing**
- Template under active validation
- Being tested with real projects
- **Restriction**: ⚠️ One document at a time only
- **Promotion Rule**: Need 3+ generations with 70%+ success rate

#### **validated**
- Tested and proven to work
- Produces good results consistently
- **Restriction**: ⚠️ One document at a time until promoted to production
- **Promotion Rule**: Need 10+ generations with 85%+ success rate

#### **production**
- Fully validated and approved
- Consistently produces high-quality output
- **Restriction**: ✅ Batch generation allowed (up to 10 documents)
- **Quality**: 85%+ success rate over 10+ generations

#### **deprecated**
- No longer recommended
- Being phased out or replaced
- **Restriction**: ❌ No batch generation, show warning

---

## Safeguard Implementation

### **Frontend: Template Selection UI**

When selecting a template for generation:

```typescript
// Show development status badge
<Badge variant={getStatusVariant(template.development_status)}>
  {template.development_status}
</Badge>

// Show warning for non-production templates
{template.development_status !== 'production' && (
  <Alert variant="warning">
    <AlertTriangle className="h-4 w-4" />
    <AlertTitle>Template Under Development</AlertTitle>
    <AlertDescription>
      This template is in {template.development_status} status.
      Generate one document at a time to validate quality.
    </AlertDescription>
  </Alert>
)}

// Disable batch generation
const canBatchGenerate = template.development_status === 'production'
```

### **Backend: Generation Endpoint Validation**

```typescript
// In /api/process-flow/start-workflow or /api/ai/generate
router.post('/generate', async (req, res) => {
  const { template_id, batch_count = 1 } = req.body
  
  // Check template status
  const template = await pool.query(
    'SELECT development_status, quality_threshold FROM templates WHERE id = $1',
    [template_id]
  )
  
  const status = template.rows[0].development_status
  
  // Enforce one-at-a-time for non-production templates
  if (status !== 'production' && batch_count > 1) {
    return res.status(400).json({
      error: 'Batch generation not allowed',
      message: `Template is in "${status}" status. Only single document generation allowed. Promote to "production" status first.`,
      template_status: status,
      max_batch_count: 1
    })
  }
  
  // Production templates can do batch
  if (status === 'production' && batch_count > 10) {
    return res.status(400).json({
      error: 'Batch limit exceeded',
      message: 'Maximum 10 documents per batch for production templates',
      max_batch_count: 10
    })
  }
  
  // Continue with generation...
})
```

### **Validation Tracking**

After each document generation, update template stats:

```sql
-- Call after successful generation
SELECT update_template_validation(
  'template-uuid',
  0.85,  -- quality score from generation
  'user-uuid'
);

-- This automatically:
-- 1. Increments validation_count
-- 2. Increments success_count if quality >= threshold
-- 3. Updates last_validated_at
-- 4. Records who validated it
```

### **Template Promotion**

Promote templates through lifecycle:

```sql
-- Promote from draft → testing
SELECT promote_template_status('template-uuid', 'user-uuid', 'Initial testing');

-- Promote from testing → validated (requires 3+ runs, 70%+ success)
SELECT promote_template_status('template-uuid', 'user-uuid', 'Passed validation tests');

-- Promote from validated → production (requires 10+ runs, 85%+ success)
SELECT promote_template_status('template-uuid', 'user-uuid', 'Ready for production');
```

---

## 🎯 User Experience Flow

### **Scenario 1: Using Draft Template**

1. User selects "New Template (draft)" 
2. **Warning appears**:
   ```
   ⚠️ Template Under Development
   This template is in draft status.
   - Generate ONE document at a time
   - Review output quality carefully
   - Report issues to template owner
   ```
3. Batch generation button is **disabled**
4. User can only generate 1 document
5. After generation, they're prompted: "Please review this document and rate the quality"

### **Scenario 2: Using Production Template**

1. User selects "Project Charter (production)"
2. **Success indicator appears**:
   ```
   ✅ Production Template
   Validated with 85%+ success rate over 10+ generations.
   Batch generation available (up to 10 documents).
   ```
3. Batch generation button is **enabled**
4. User can select multiple projects or document types
5. Quality is expected to be high

---

## 📊 Template Health View

The `template_health` view provides complete visibility:

```sql
SELECT 
  name,
  development_status,
  success_rate,
  validation_count,
  health_rating,
  status_label
FROM template_health
ORDER BY success_rate DESC;
```

**Example Output**:
| Name | Status | Success Rate | Validations | Health |
|------|--------|--------------|-------------|--------|
| Project Charter | production | 92.3% | 13 | Excellent |
| Risk Register | validated | 78.5% | 7 | Good |
| User Personas | testing | 66.7% | 3 | Fair |
| New Template | draft | 0.0% | 0 | Not tested |

---

## 🔔 User Notifications

### **When Selecting Draft Template**:
```
⚠️ This template hasn't been tested yet.
Generate one document and review carefully before creating more.
```

### **When Selecting Testing Template**:
```
🔵 This template is being validated.
Success rate: 67% (2 of 3 generations)
One document at a time until validated.
```

### **When Selecting Validated Template**:
```
🟡 Template validated and working well.
Success rate: 85% (6 of 7 generations)
Generate with confidence. Batch generation available soon.
```

### **When Selecting Production Template**:
```
✅ Production-ready template
Success rate: 90% (18 of 20 generations)
Batch generation available (up to 10 documents).
```

---

## 🎯 Benefits

1. **Prevents Document Flooding** 📚
   - Users won't be overwhelmed with 50 unreviewed documents
   - Gradual, controlled generation
   
2. **Ensures Quality** ✨
   - Templates must prove themselves
   - Bad templates can't pollute the system
   
3. **Tracks Performance** 📊
   - See which templates work well
   - Identify templates that need improvement
   
4. **User Confidence** 🎯
   - Clear indicators of template maturity
   - Know what to expect before generating

---

## 📋 Implementation Checklist

### Database
- [ ] Run migration 015_template_development_status.sql
- [ ] Verify `development_status` column exists
- [ ] Verify `template_health` view works
- [ ] Test promotion functions

### Backend
- [ ] Add validation check in generation endpoints
- [ ] Implement batch count restrictions
- [ ] Call `update_template_validation()` after generation
- [ ] Add template status to API responses

### Frontend
- [ ] Show development_status badges in template selection
- [ ] Add warnings for non-production templates
- [ ] Disable batch generation for non-production templates
- [ ] Add "Rate this document" prompt after generation
- [ ] Show template health in template management UI

### Testing
- [ ] Test draft template restrictions
- [ ] Test promotion workflow
- [ ] Test batch generation blocking
- [ ] Test quality tracking
- [ ] Test UI warnings and badges

---

## 🚀 Quick Start

### 1. Apply Migration
```bash
cd server
psql "$env:POSTGRES_URL" -f migrations/015_template_development_status.sql
```

### 2. Set Initial Statuses
```sql
-- Mark well-tested templates as production
UPDATE templates 
SET development_status = 'production' 
WHERE name IN ('Project Charter', 'Stakeholder Register')
  AND id = 'ffbcf898-0486-46fa-939f-e5629737de0e'; -- The fixed one

-- Mark new templates as draft
UPDATE templates 
SET development_status = 'draft'
WHERE development_status IS NULL;
```

### 3. Test the System
1. Create a new template → Should be 'draft'
2. Try to batch generate → Should be blocked
3. Generate one document → Should work
4. Promote to 'testing' → Should require validation

---

**With these safeguards, your ADPA system will ensure quality while preventing document overload!** 🛡️✨

