# Template Sharing & Visibility Workflow

**Date**: October 18, 2025  
**Status**: ✅ **Aligned with Lifecycle Stages**  
**Purpose**: Ensure quality before team sharing

---

## 🎯 User's Requirement (Confirmed)

> "No sharing of templates if it's not passed tests on generation and the framework selected compliance check. Then the template becomes validated plus you promote it to a production template which you will be able to share with the team."

**Translation**: 
- ❌ Cannot share until **Validated** stage (after compliance)
- ✅ Can share at **Validated** and **Production** stages
- 🔒 Quality gates ensure only verified templates are shared

---

## 📊 Visibility Rules by Lifecycle Stage

| Stage | Visibility | Who Can Access | Reason |
|-------|-----------|----------------|---------|
| ⚪ **Draft** | 🔒 Private | Creator only | Untested, unverified |
| 🔵 **Testing** | 🔒 Private | Creator only | Under validation |
| 🟣 **Compliance** | 🔒 Private | Creator + Reviewers | Framework verification |
| 🟡 **Validated** | ✅ **Can Share** | Team members | Quality & compliance verified |
| 🟢 **Production** | ✅ **Public** | Everyone | Full deployment approved |
| 📦 **Archived** | 🔒 Private | Creator + Admins | No longer active |

---

## 🔐 Sharing Workflow

### **Stage 1-3: Private Only** 🔒

**Draft → Testing → Compliance**:
```
Creator creates template
  ↓
Runs 3+ validation tests
  ↓
Promotes to Compliance Review
  ↓
Reviewer checks framework alignment
  ↓
Still PRIVATE - not ready for team
```

**Reason**: Template hasn't proven quality or compliance yet

---

### **Stage 4: Ready to Share** ✅

**Validated**:
```
✅ Compliance approved
✅ 5+ successful document generations
✅ 80%+ success rate
✅ Framework alignment verified

→ Can now share with team!
```

**What users can do**:
- Toggle `is_public` to **true**
- Team members can see and use template
- Template appears in team's template library
- All quality gates passed

---

### **Stage 5: Full Deployment** ✅

**Production**:
```
✅ 10+ successful document generations
✅ 90%+ success rate
✅ Extensive validation
✅ Compliance verified

→ Fully shareable, no restrictions!
```

**What users can do**:
- Batch generation (up to 10 docs)
- Enterprise-wide deployment
- Template promoted in catalog
- Recommended for standard use

---

## 🛡️ Quality Gates Summary

### **Why These Gates Matter**

**Without Compliance Gate**:
```
Bad Template → Testing → Validated → Team uses it → ❌ Poor quality docs
```

**With Compliance Gate** (Your New System):
```
Template → Testing → 🟣 Compliance Review → ❌ Fails alignment check
→ Cannot share → Team protected from poor quality
```

**Or Success Path**:
```
Template → Testing → 🟣 Compliance Review → ✅ Passes → Validated → Production
→ Team gets high-quality, framework-aligned templates!
```

---

## 📋 Recommended Visibility Settings

### **Automatic Suggestions**

| Stage | Recommended Visibility | Can Override? |
|-------|----------------------|---------------|
| Draft | 🔒 Private (forced) | No |
| Testing | 🔒 Private (forced) | No |
| Compliance | 🔒 Private (forced) | No |
| Validated | 🔓 Optional (default: private) | Yes - can share |
| Production | ✅ Public (recommended) | Yes |
| Archived | 🔒 Private (forced) | No |

---

## 🔧 Proposed Enhancement: Auto-Visibility Rules

### **Current Behavior**
- `is_public` is a manual toggle
- Can be set at any stage
- No automatic enforcement

### **Proposed Behavior**
```sql
-- Prevent public visibility before Validated stage
ALTER TABLE templates
ADD CONSTRAINT templates_public_validated_check
CHECK (
  is_public = false OR 
  development_status IN ('validated', 'production')
);
```

**Effect**:
- ❌ Cannot set `is_public = true` in Draft, Testing, or Compliance
- ✅ Can share starting at Validated stage
- ✅ Ensures quality gates passed before sharing

---

## 💡 Implementation Options

### **Option A: Hard Constraint** (Recommended)

**Database constraint** prevents public visibility before Validated:

```sql
CHECK (is_public = false OR development_status IN ('validated', 'production'))
```

**Pros**:
- Enforced at database level
- Cannot be bypassed
- Clear business rule

**Cons**:
- Less flexible for special cases

### **Option B: Soft Warning**

**UI warning** when trying to make pre-validated template public:

```typescript
if (template.development_status !== 'validated' && 
    template.development_status !== 'production' && 
    is_public === true) {
  toast.warning('Template should reach Validated stage before sharing')
  return
}
```

**Pros**:
- Flexible for admins
- Can override if needed

**Cons**:
- Can be bypassed

### **Option C: Current** (No restriction)

Templates can be public at any stage

**Pros**:
- Maximum flexibility

**Cons**:
- Might share unvalidated templates

---

## 🎯 Your Current Template Status

```
Template: Project Charter - Template Builder
Status: 🔵 Testing
Visibility: 🔒 Private

✅ 3 document generations
✅ 100% success rate
✅ Ready to promote to Compliance Review

Next Steps:
1. Promote to 🟣 Compliance Review
2. Generate 2 more docs (5 total needed)
3. Maintain 80%+ success
4. Request manual compliance approval
5. Promote to 🟡 Validated
6. Toggle is_public = true
7. Share with team! ✅
```

---

## 📝 Sharing Process (Step by Step)

### **For Your Template to Be Shareable**

**Current**: 3/5 steps complete

1. ✅ **Created** (Draft stage)
2. ✅ **Tested** (Promoted to Testing, 3 docs generated)
3. ⏳ **Compliance** (Next: Promote → Compliance Review)
   - Generate 2 more documents (5 total)
   - Submit for compliance review
   - Wait for approval
4. ⏳ **Validated** (After compliance approved)
   - Toggle `is_public` to true
   - Team can now see and use!
5. ⏳ **Production** (After 10+ docs, 90%+ success)
   - Full enterprise deployment
   - Recommended in catalog

---

## ✅ Summary

**Your Understanding**: ✅ **Perfect!**

**Key Points**:
1. ✅ No sharing before Validated (compliance passed)
2. ✅ Framework compliance required (PMBOK, BABOK, DMBOK)
3. ✅ Quality gates protect team from poor templates
4. ✅ Validated → can share with team
5. ✅ Production → full deployment

**Your Template**:
- Status: Testing (3/3 docs, 100% success)
- Next: Compliance Review
- Then: Validated (sharable!)
- Finally: Production (recommended)

**Would you like to**:
1. Add hard constraint (no public before Validated)?
2. Promote your template to Compliance Review now?
3. Or keep current flexible approach?

---

**End of Sharing Workflow Documentation**

