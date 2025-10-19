# Document Lifecycle Order - Quick Reference 🎯

**Quick guide for understanding the console output and lifecycle progression**

---

## Console Icons Cheat Sheet

| Icon | Meaning | Action |
|:---:|---|---|
| ⬅️ | **Earlier phase** (Foundation) | ✅ GOOD - These SHOULD be referenced |
| ➡️ | **Same phase** (Peer documents) | ✅ OK - Can cross-reference |
| ⬇️ | **Later phase** (Advanced) | ⚠️ May contain future context |

---

## The 16-Phase Lifecycle (At a Glance)

```
Pre-Initiation:
  Phase 1: 🌱 Ideation

Initiation:
  Phase 2: 💼 Business Case
  Phase 3: 📜 Project Charter

Planning (Foundation):
  Phase 4: 👥 Stakeholder Register
  Phase 5: 📋 Scope Management
  Phase 6: 📝 Requirements
  Phase 7: 📅 Schedule Management
  Phase 8: 💰 Cost/Budget Management

Planning (Advanced):
  Phase 9: 👷 Resource Management
  Phase 10: ✅ Quality Management
  Phase 11: 🎯 Risk Management
  Phase 12: 📢 Communication Management
  Phase 13: 🛒 Procurement Management
  Phase 14: 🔗 Integration Management

Closing:
  Phase 15: 📦 Project Closeout
  Phase 16: 📚 Lessons Learned
```

---

## Scoring Weights

```
Score = (Keyword × 10) + (Lifecycle × 3) + (Status)

Keyword Relevance:  10-60 points (template-specific)
Lifecycle Bonus:    0-45 points  (earlier = higher)
Status Bonus:       0-10 points  (approved > final > draft)
```

---

## What to Expect

### Generating Charter (Phase 3)

**Should see**:
```
⬅️ 1. Ideation [draft] - Phase 1
⬅️ 2. Business Case [approved] - Phase 2
```

### Generating Risk Plan (Phase 11)

**Should see**:
```
⬅️ 1. Charter [approved] - Phase 3
⬅️ 2. Stakeholder [final] - Phase 4
⬅️ 3. Scope [draft] - Phase 5
⬅️ 4. Schedule [draft] - Phase 7
⬅️ 5. Cost [draft] - Phase 8
```

### Generating Lessons Learned (Phase 16)

**Should see**:
```
⬅️ 1. Charter [approved] - Phase 3
⬅️ 2. Integration Plan [final] - Phase 14
⬅️ 3. Closeout [draft] - Phase 15
⬅️ 4. Risk [final] - Phase 11
⬅️ 5. Quality [final] - Phase 10
```

**All arrows should be ⬅️** (all phases earlier than 16)

---

## Troubleshooting

### ❌ Seeing too many ⬇️ icons?

**Problem**: Later documents being selected over foundation

**Possible Causes**:
1. **No foundation documents exist** (no Ideation, Business Case, Charter)
2. **Document names don't match lifecycle keywords** (system can't identify phase)

**Solution**:
- Generate foundation documents first (Ideation → Business Case → Charter)
- Ensure document names include keywords like "Charter", "Stakeholder", "Scope", etc.

---

### ❌ Foundation documents not showing?

**Problem**: Ideation/Charter not in top 5

**Check**:
1. **Do they exist?** (System can only select existing documents)
2. **Are they named correctly?** (Must include "ideation", "charter", "business case")
3. **What's their status?** (Approved/final documents score higher)

---

## Best Practices

### 1. Generate in Order
```
✅ Ideation → Business Case → Charter → Stakeholder → Scope → ...
❌ Random order (Risk Plan before Charter exists)
```

### 2. Approve Foundation Documents
```
✅ Ideation [draft] → Business Case [approved] → Charter [approved]
❌ All documents stuck as [draft]
```

### 3. Use Standard Names
```
✅ "Project Charter", "Stakeholder Register", "Risk Management Plan"
❌ "Doc 1", "Meeting Notes", "Untitled"
```

---

## Document Naming Guide

**For lifecycle system to work**, include these keywords in document names:

| Phase | Keywords to Include |
|---|---|
| 1 | ideation, concept, vision |
| 2 | business case, justification, feasibility |
| 3 | charter, authorization |
| 4 | stakeholder, engagement |
| 5 | scope, wbs, boundaries |
| 6 | requirement, specification, functional |
| 7 | schedule, timeline, milestone |
| 8 | cost, budget, financial |
| 9 | resource, team, staffing |
| 10 | quality, standard, metric |
| 11 | risk, threat, opportunity |
| 12 | communication, reporting |
| 13 | procurement, vendor, contract |
| 14 | integration, consolidated |
| 15 | closeout, acceptance, handover |
| 16 | lessons, retrospective, learned |

---

## Quick Checks

### ✅ System is working correctly if:

- [x] Ideation ranked #1 when generating Charter
- [x] Charter appears in top 5 for most planning docs
- [x] Earlier phases consistently ranked higher
- [x] ⬅️ icons dominate the console output
- [x] Source Documents display shows phases in UI

### ❌ System needs attention if:

- [ ] Random documents consistently ranked #1
- [ ] No ⬅️ icons (all ⬇️ or ➡️)
- [ ] "Meeting Minutes" outranking "Charter"
- [ ] No phase information in Source Documents UI

---

## Quick Test

**To verify lifecycle system is working**:

1. Generate **Business Case** (should use Ideation)
2. Generate **Charter** (should use Business Case + Ideation)
3. Generate **Risk Plan** (should use Charter + other plans)

**Check console for**:
```
⬅️ 1. [Foundation document] - Phase [X < current]
⬅️ 2. [Foundation document] - Phase [X < current]
```

**If you see this pattern** ✅ System is working!

---

## Resources

- Full documentation: `docs/06-features/DOCUMENT_LIFECYCLE_ORDER_SYSTEM.md`
- Confirmation guide: `DOCUMENT_LIFECYCLE_WORKING_PERFECTLY.md`
- Context system: `docs/06-features/INTELLIGENT_DOCUMENT_CONTEXT_SYSTEM.md`

---

**Status**: ✅ System operational since October 19, 2025

---

*Quick Reference v1.0 - October 19, 2025*

