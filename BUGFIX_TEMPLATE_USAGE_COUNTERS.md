# 🐛 BUGFIX: Template Usage Counters Stuck at 20

**Date**: October 31, 2025  
**Issue**: Template `validation_count` and `success_count` stop incrementing after reaching 20  
**Severity**: Medium - Affects analytics and template health metrics  
**Status**: ✅ FIXED

---

## Problem Description

User reported that template usage statistics appear to stop incrementing after reaching exactly 20 uses. Documents continue to generate successfully, but the template cards show stale usage counts.

### Symptoms

- Template card shows "Usage: 20 times"
- More than 20 documents actually created with the template
- Success rate and validation counts don't update
- `template_usage` table has more entries than `validation_count` shows

---

## Root Cause

**Two separate tracking systems were not synchronized:**

1. **`template_usage` table** - Row inserted for every template use ✅
2. **`templates.validation_count`** - Counter in templates table ❌

The bug was in **`server/src/routes/documents.ts`** (document creation endpoint):
- ✅ Inserts row into `template_usage` table
- ❌ **Never calls `update_template_validation` to increment counters**

Meanwhile, **`server/src/routes/ai.ts`** (AI generation endpoint):
- ✅ Inserts row into `template_usage` table  
- ✅ Calls `update_template_validation` to increment counters

**Result:** If documents were created via direct document creation (not AI generation), the counters would fall out of sync with reality, eventually getting "stuck" at whatever count they reached before the AI generation path stopped being used.

---

## The Fix

### Code Change

**File**: `server/src/routes/documents.ts` (lines 760-809)

**Before:**
```typescript
// Track template usage
if (template_id && result.rows[0]) {
  try {
    await pool.query(`
      INSERT INTO template_usage (...)
      VALUES (...)
    `, [...])
    
    log.info('Template usage tracked')
  } catch (error) {
    log.warn('Failed to track template usage:', error)
  }
}
```

**After:**
```typescript
// Track template usage
if (template_id && result.rows[0]) {
  try {
    // Insert into template_usage table
    await pool.query(`INSERT INTO template_usage (...) VALUES (...)`, [...])
    log.info('Template usage tracked in template_usage table')
    
    // 🔧 FIX: Also increment template's validation_count and success_count
    try {
      const qualityScore = 0.85  // Default for manually created docs
      
      await pool.query(
        'SELECT update_template_validation($1, $2, $3)',
        [template_id, qualityScore, req.user?.id]
      )
      
      log.info('✅ Template validation counters incremented')
      
      // Clear template cache so UI shows updated metrics immediately
      await cache.del(`template:${template_id}`)
      log.info('🔄 Template cache cleared')
    } catch (validationError) {
      log.error('⚠️ Failed to increment template validation counters')
    }
  } catch (error) {
    log.warn('Failed to track template usage:', error)
  }
}
```

**What Changed:**
1. ✅ Now calls `update_template_validation()` function to increment counters
2. ✅ Uses default quality score of 0.85 (85%) for manually created documents
3. ✅ Clears template cache to ensure UI shows fresh data immediately
4. ✅ Comprehensive error logging to diagnose future issues
5. ✅ Doesn't fail document creation if counter update fails (graceful degradation)

---

## Fixing Existing Templates

If your templates are currently stuck at 20 (or any incorrect count), you need to **resync the counters** from actual data.

### Option 1: Diagnostic First (Recommended)

Investigate what's wrong with a specific template:

```bash
cd server

# Replace <template-id> with your template's UUID
npx tsx scripts/diagnose-template-usage.ts <template-id>
```

**This will show:**
- Current `validation_count` vs actual usage entries
- Whether the `update_template_validation` function works
- Any database constraints or issues

### Option 2: Fix All Templates

Recalculate and fix counters for all templates:

```bash
cd server

# DRY RUN - See what would change (safe, no modifications)
npx tsx scripts/fix-template-usage-counters.ts --dry-run

# LIVE MODE - Actually fix the counters
npx tsx scripts/fix-template-usage-counters.ts --live
```

### Option 3: Fix Specific Template

Resync just one template:

```bash
cd server

# DRY RUN first
npx tsx scripts/fix-template-usage-counters.ts --dry-run --template-id=<uuid>

# Then LIVE
npx tsx scripts/fix-template-usage-counters.ts --live --template-id=<uuid>
```

### Option 4: Manual SQL Fix

If you prefer direct SQL:

```sql
-- For a specific template
WITH actual_counts AS (
  SELECT 
    template_id,
    COUNT(*) as validation_count,
    COUNT(CASE WHEN success = true THEN 1 END) as success_count,
    MAX(used_at) as last_validated_at
  FROM template_usage
  WHERE template_id = '<your-template-id>'
  GROUP BY template_id
)
UPDATE templates t
SET 
  validation_count = ac.validation_count,
  success_count = ac.success_count,
  last_validated_at = ac.last_validated_at,
  updated_at = CURRENT_TIMESTAMP
FROM actual_counts ac
WHERE t.id = ac.template_id;

-- For ALL templates
WITH actual_counts AS (
  SELECT 
    template_id,
    COUNT(*) as validation_count,
    COUNT(CASE WHEN success = true THEN 1 END) as success_count,
    MAX(used_at) as last_validated_at
  FROM template_usage
  GROUP BY template_id
)
UPDATE templates t
SET 
  validation_count = ac.validation_count,
  success_count = ac.success_count,
  last_validated_at = ac.last_validated_at,
  updated_at = CURRENT_TIMESTAMP
FROM actual_counts ac
WHERE t.id = ac.template_id;
```

---

## Testing the Fix

### Step 1: Restart Backend

```bash
cd server
npm run dev
```

### Step 2: Create a Test Document

1. Go to http://localhost:3000/templates
2. Click "View" on any template
3. Generate a new document using that template
4. Check the template card - usage count should increment immediately

### Step 3: Verify in Database

```sql
-- Check template counters
SELECT 
  id,
  name,
  validation_count,
  success_count,
  last_validated_at
FROM templates
WHERE name = 'Your Template Name';

-- Check template_usage table
SELECT COUNT(*) as actual_uses
FROM template_usage
WHERE template_id = '<template-id>';

-- These numbers should match!
```

---

## Prevention (Future Enhancement)

To prevent this from happening again, consider adding a **database trigger** that auto-syncs counters whenever a row is inserted into `template_usage`:

```sql
CREATE OR REPLACE FUNCTION sync_template_counts_on_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE templates
    SET 
      validation_count = validation_count + 1,
      success_count = CASE WHEN NEW.success = true THEN success_count + 1 ELSE success_count END,
      last_validated_at = NEW.used_at,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.template_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_template_counts
AFTER INSERT ON template_usage
FOR EACH ROW
EXECUTE FUNCTION sync_template_counts_on_usage();
```

**Pros:**
- ✅ Counters always accurate
- ✅ No application code needed
- ✅ Works for all insertion paths

**Cons:**
- ⚠️ Adds overhead to every insert
- ⚠️ Requires database-level permission to create triggers

---

## Files Changed

- ✅ `server/src/routes/documents.ts` - Fixed template counter increment
- ✅ `server/scripts/diagnose-template-usage.ts` - Created diagnostic script
- ✅ `server/scripts/fix-template-usage-counters.ts` - Created fix script
- ✅ `docs/troubleshooting/TEMPLATE_USAGE_STUCK_AT_20.md` - Created troubleshooting guide
- ✅ `BUGFIX_TEMPLATE_USAGE_COUNTERS.md` - This document

---

## Summary

**Root Cause:** Document creation endpoint wasn't calling `update_template_validation()`  
**Impact:** Template usage counters out of sync with reality, appearing "stuck"  
**Fix:** Now calling validation function from all template usage paths  
**Next Steps:** 
1. ✅ Restart backend with fixed code
2. ✅ Run fix script to resync existing templates
3. ✅ Test that new document creations increment counters
4. ✅ Monitor logs for any validation tracking failures

---

## Related Issues

- Memory ID: None yet (create if recurring)
- GitHub Issue: None (internal bugfix)
- User Report: October 31, 2025 - "Template usage seems to stop at 20 times"

## References

- Database Function: `server/migrations/015_template_development_status.sql` (lines 75-101)
- AI Route (working correctly): `server/src/routes/ai.ts` (lines 199-218)
- Document Route (now fixed): `server/src/routes/documents.ts` (lines 760-809)
- Queue Service: `server/src/services/queueService.ts` (lines 381-398)

