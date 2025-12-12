# Weighted Entity Allocation System - Implementation Plan

**Status**: 🟡 Ready for Implementation  
**Date**: December 2, 2025  
**Requested By**: User  
**Priority**: High (Enhanced Analytics Accuracy)

---

## 📋 Overview

Implement a weighted entity allocation system that distributes entities across domains based on relevance weights, ensuring:
1. ✅ **Total entities across domains = Total extracted entities** (742 in Project Momentum)
2. ✅ **Primary/Secondary allocation badges** with percentages
3. ✅ **Decimal accuracy** for weighted counts
4. ✅ **No double-counting confusion**

---

## 🎯 Example: How It Works

### Current State (Double Counting Issue):
```
Governance Domain: 57 entities
Schedule Domain: 107 entities
Planning Domain: 45 entities

Issue: milestones (57) counted 3 times = inflated total
```

### New State (Weighted Allocation):
```
milestones (57 extracted total)
├─ Schedule Domain:    34.2 entities (Primary 60%)
├─ Governance Domain:  14.25 entities (Secondary 25%)
└─ Planning Domain:     8.55 entities (Secondary 15%)
    Total distributed: 57.0 entities ✓

phases (38 extracted total)  
├─ Schedule Domain:    22.8 entities (Primary 60%)
└─ Governance Domain:  15.2 entities (Secondary 40%)
    Total distributed: 38.0 entities ✓

development_approaches (10 extracted total)
└─ Governance Domain:  10.0 entities (Primary 100%)
    Total distributed: 10.0 entities ✓
```

---

## 📐 Weight Matrix Summary

| Entity Type | Domain Allocations | Weights | Total |
|-------------|-------------------|---------|-------|
| `milestones` | Schedule (Primary)<br>Governance (Secondary)<br>Planning (Secondary) | 60%<br>25%<br>15% | 100% ✓ |
| `phases` | Schedule (Primary)<br>Governance (Secondary) | 60%<br>40% | 100% ✓ |
| `development_approaches` | Governance (Primary) | 100% | 100% ✓ |
| `team_agreements` | Team (Primary)<br>Governance (Secondary)<br>Resources (Secondary) | 50%<br>30%<br>20% | 100% ✓ |
| `requirements` | Scope (Primary)<br>Planning (Secondary) | 70%<br>30% | 100% ✓ |
| `risks` | Uncertainty (Primary)<br>Risk (Equal Primary) | 50%<br>50% | 100% ✓ |
| *Single-domain entities* | One domain only | 100% | 100% ✓ |

**Full matrix**: See `types/entity-domain-weights.ts` (40+ entity types defined)

---

## 🖼️ UI Mockup

### Knowledge Domains Display (Weighted)

```
┌─────────────────────────────────────────────────────────────┐
│ Governance Domain: 72.85 entities (9.8% of total)          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Entities:                                                   │
│                                                             │
│ ⭐ 15.0 governance_decisions (Primary 100%)                │
│ ⭐ 10.0 development_approaches (Primary 100%)              │
│ ⭐ 10.0 approval_workflows (Primary 100%)                  │
│ ◆ 15.2 phases (Secondary 40%)                              │
│ ◆ 14.25 milestones (Secondary 25%)                         │
│ ◆ 3.6 team_agreements (Secondary 30%)                      │
│ ◆ 4.8 constraints (Secondary 40%)                          │
│                                                             │
│ [View Details] [Export Report]                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Schedule Domain: 412.8 entities (55.6% of total)           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Entities:                                                   │
│                                                             │
│ ⭐ 320.0 scope_items (Primary 100%)                        │
│ ⭐ 34.2 milestones (Primary 60%)                           │
│ ⭐ 22.8 phases (Primary 60%)                               │
│ ⭐ 15.0 schedule_baselines (Primary 100%)                  │
│ ⭐ 10.5 project_iterations (Secondary 30%)                 │
│ ◆ 10.3 activities (Primary 60%)                            │
│                                                             │
│ [View Details] [Export Report]                             │
└─────────────────────────────────────────────────────────────┘
```

### Badge System

| Badge | Meaning | Color | Example |
|-------|---------|-------|---------|
| `⭐ (Primary 100%)` | Single domain allocation | Gold | `development_approaches` |
| `⭐ (Primary 60%)` | Highest weight in multi-domain | Gold | `milestones` in Schedule |
| `◆ (Secondary 40%)` | Secondary weight | Silver | `phases` in Governance |
| `◆ (Secondary 25%)` | Secondary weight | Silver | `milestones` in Governance |

---

## 🔧 Implementation Steps

### Step 1: ✅ Weight Matrix Definition
**File**: `types/entity-domain-weights.ts`  
**Status**: ✅ **COMPLETED**

- Defined weights for 40+ entity types
- Ensured all weights sum to 100%
- Added validation functions
- Added formatting helpers

### Step 2: 🟡 Frontend Calculation Logic
**File**: `app/projects/[id]/components/ProjectDataExtraction.tsx`  
**Status**: 🟡 **IN PROGRESS**

**Changes needed**:

```typescript
import { 
  ENTITY_DOMAIN_WEIGHTS, 
  getEntityWeights, 
  calculateWeightedCount,
  formatWeightedCount 
} from '@/types/entity-domain-weights'

// Calculate weighted domain counts
function calculateWeightedDomainCounts(entityCounts: EntityCounts): WeightedDomainCounts {
  const domainCounts: Record<PmbokDomain, number> = {}
  
  // Initialize all domains to 0
  PMBOK_DOMAINS.forEach(domain => {
    domainCounts[domain] = 0
  })
  
  // For each entity type in entityCounts
  Object.entries(entityCounts).forEach(([entityKey, count]) => {
    if (count === 0) return
    
    // Get weight allocations for this entity
    const weights = getEntityWeights(entityKey)
    
    // Distribute count across domains based on weights
    weights.forEach(({ domain, weight }) => {
      domainCounts[domain] += calculateWeightedCount(count, weight)
    })
  })
  
  return domainCounts
}

// Calculate total entities (for validation)
function calculateTotalExtractedEntities(entityCounts: EntityCounts): number {
  return Object.values(entityCounts).reduce((sum, count) => sum + count, 0)
}

// Validate weighted allocations
function validateWeightedAllocations(
  entityCounts: EntityCounts,
  weightedDomainCounts: Record<PmbokDomain, number>
): { isValid: boolean; totalExtracted: number; totalWeighted: number; difference: number } {
  const totalExtracted = calculateTotalExtractedEntities(entityCounts)
  const totalWeighted = Object.values(weightedDomainCounts).reduce((sum, count) => sum + count, 0)
  const difference = totalExtracted - totalWeighted
  const isValid = Math.abs(difference) < 0.01 // Allow tiny rounding error
  
  return { isValid, totalExtracted, totalWeighted, difference }
}
```

### Step 3: 🟡 UI Display Updates
**File**: `app/projects/[id]/components/ProjectDataExtraction.tsx`  
**Status**: 🟡 **IN PROGRESS**

**Changes needed**:

1. **Domain Card Title** - Show weighted count with percentage
   ```typescript
   <CardTitle>
     {domain.name}: {weightedDomainCount.toFixed(1)} entities 
     ({((weightedDomainCount / totalExtracted) * 100).toFixed(1)}% of total)
   </CardTitle>
   ```

2. **Entity List with Badges** - Show entity breakdown with weights
   ```typescript
   <div className="space-y-2">
     {domain.entities.map(entityKey => {
       const count = entityCounts[entityKey] || 0
       if (count === 0) return null
       
       const weights = getEntityWeights(entityKey)
       const thisWeight = weights.find(w => w.domain === domain.pmbokDomain)
       
       if (!thisWeight) return null
       
       const weightedCount = calculateWeightedCount(count, thisWeight.weight)
       const percentage = Math.round(thisWeight.weight * 100)
       const badge = thisWeight.isPrimary ? 'Primary' : 'Secondary'
       const icon = thisWeight.isPrimary ? '⭐' : '◆'
       
       return (
         <div key={entityKey} className="flex items-center justify-between">
           <span className="flex items-center gap-2">
             {icon} {entityLabels[entityKey].label}
           </span>
           <Badge variant={thisWeight.isPrimary ? 'default' : 'secondary'}>
             {weightedCount.toFixed(1)} ({badge} {percentage}%)
           </Badge>
         </div>
       )
     })}
   </div>
   ```

3. **Validation Display** - Show validation check
   ```typescript
   {validation.isValid ? (
     <div className="text-sm text-green-600">
       ✓ Allocation validated: {validation.totalWeighted.toFixed(1)} = {validation.totalExtracted} entities
     </div>
   ) : (
     <div className="text-sm text-red-600">
       ⚠️ Allocation mismatch: {validation.difference.toFixed(2)} entity difference
     </div>
   )}
   ```

### Step 4: 🔴 Testing & Validation
**Status**: 🔴 **NOT STARTED**

**Test Cases**:

1. **Project Momentum (742 entities)**
   - Verify Governance shows weighted count
   - Verify all domains show weighted counts
   - Verify total = 742.0 ± 0.01
   
2. **Badge Display**
   - Verify Primary badges show for highest weight
   - Verify Secondary badges show for lower weights
   - Verify percentages are accurate
   
3. **Edge Cases**
   - Single domain entity (100% weight)
   - Equal weight entities (50/50 split)
   - Triple allocation (60/25/15 split)

### Step 5: 🔴 Documentation
**Status**: 🔴 **NOT STARTED**

**Documents to create/update**:
- User guide explaining weighted allocation
- API documentation if exposing weights via API
- Update PMBOK8 alignment docs with weight matrix

---

## 🎨 Design Decisions

### Badge Colors
- **Primary (⭐)**: Gold/Yellow - Highest weight allocation
- **Secondary (◆)**: Silver/Gray - Lower weight allocations

### Decimal Places
- **Entity counts**: 1 decimal place (e.g., "34.2 entities")
- **Percentages**: 1 decimal place (e.g., "9.8% of total")
- **Validation tolerance**: 0.01 entities (rounding error)

### Weight Display
- **Format**: `(Primary 60%)` or `(Secondary 25%)`
- **Always show percentage**: Even for 100% allocations
- **Badge first**: `(Primary 100%)` not `(100% Primary)`

---

## ✅ Validation Rules

1. **Weight sum per entity = 1.0** (100%)
   ```typescript
   phases: 0.60 + 0.40 = 1.0 ✓
   milestones: 0.60 + 0.25 + 0.15 = 1.0 ✓
   ```

2. **Total weighted = Total extracted**
   ```typescript
   ∑ weighted_counts = ∑ extracted_counts
   742.0 = 742 ✓
   ```

3. **No negative weights**
   ```typescript
   all weights >= 0.0
   ```

4. **No weights > 1.0**
   ```typescript
   all weights <= 1.0
   ```

5. **At least one primary per entity**
   ```typescript
   max(weights) => isPrimary = true
   ```

---

## 📊 Expected Results

### Project Momentum (742 entities)

**Before** (Double Counting):
```
Knowledge Domains "Total": ~1,200+ entities (inflated due to duplicates)
❌ Doesn't match extracted total (742)
```

**After** (Weighted Allocation):
```
Governance:        72.85 entities (9.8%)
Scope:            412.80 entities (55.6%)
Schedule:         145.50 entities (19.6%)
Finance:            0.00 entities (0.0%)
Resources:         45.20 entities (6.1%)
Risk:              48.15 entities (6.5%)
Stakeholders Ops:  17.50 entities (2.4%)
───────────────────────────────────────
Total:            742.00 entities ✓ (100%)
```

---

## 🚀 Rollout Plan

### Phase 1: Backend Preparation ✅ COMPLETE
- [x] Define weight matrix
- [x] Create validation functions
- [x] Add formatting helpers

### Phase 2: Frontend Implementation 🟡 IN PROGRESS
- [ ] Import weight matrix
- [ ] Implement calculation logic
- [ ] Update UI display
- [ ] Add badges and percentages
- [ ] Add validation display

### Phase 3: Testing 🔴 PENDING
- [ ] Test with Project Momentum (742 entities)
- [ ] Verify all edge cases
- [ ] User acceptance testing

### Phase 4: Documentation 🔴 PENDING
- [ ] Update user guides
- [ ] Update architecture docs
- [ ] Create weight matrix reference

---

## 💡 Future Enhancements

1. **Configurable Weights**: Allow admins to adjust weights via UI
2. **AI-Suggested Weights**: Use AI to analyze entity content and suggest optimal weights
3. **Weight History**: Track weight changes over time
4. **Export Weighted Reports**: Export domain analytics with weighted distributions
5. **Visual Weight Diagram**: Show weight distribution as pie/bar charts per entity

---

**Next Steps**: 
1. Review weight matrix for accuracy
2. User approval to proceed with frontend implementation
3. Implement calculation and display logic
4. Test with Project Momentum data

---

**Status**: 🟡 Awaiting user approval to proceed with frontend implementation

