# Template Usage Counter Stuck at 20 - Troubleshooting Guide

## Problem Description

Template usage statistics (`validation_count`, `success_count`) appear to stop incrementing after reaching 20 uses. Documents continue to be generated successfully, but the template usage counter doesn't reflect the actual usage.

## Affected Metrics

- **Usage Count**: Shows on template card (e.g., "Usage: 20 times")
- **Validation Count**: Total number of times template was used
- **Success Count**: Number of successful generations (quality >= threshold)
- **Success Rate**: Calculated as `success_count / validation_count`

## Root Cause Investigation

The counter increment happens in two places:

1. **`update_template_validation` function** (database function in `server/migrations/015_template_development_status.sql`)
   - Called from `server/src/routes/ai.ts` after AI generation
   - Increments `validation_count` and conditionally increments `success_count`
   - **NO hard limit** in the function itself

2. **Template cache** (`server/src/utils/redis.ts`)
   - Cache is cleared after each update (`cache.del(\`template:\${template_id}\`)`)
   - Ensures UI shows fresh data

## Diagnostic Steps

### Step 1: Run Diagnostic Script

This will investigate what's actually happening with your template:

```bash
cd server

# Get your template ID from the URL (e.g., http://localhost:3000/templates/<UUID>)
npx tsx scripts/diagnose-template-usage.ts <template-id>
```

**What it checks:**
- ✅ Current `validation_count` and `success_count` in templates table
- ✅ Actual count of entries in `template_usage` table
- ✅ Actual count of documents created with this template
- ✅ Whether `update_template_validation` function works
- ✅ Any database constraints that might limit the counter

**Expected Output:**
```
🔍 TEMPLATE USAGE DIAGNOSTIC

Investigating template: abc-123-def-456

📊 Current Template Statistics:
{
  "validation_count": 20,
  "success_count": 19,
  "usage_count": 20,
  ...
}

📝 Template Usage History:
{
  "total_entries": 35,  ← If this is higher than validation_count, there's a mismatch!
  ...
}

💡 ANALYSIS:
  ⚠️  WARNING: Mismatch between validation_count and actual usage entries!
     Expected: 35
     Actual: 20
```

### Step 2: Check Application Logs

Look for errors or warnings when templates are used:

```bash
# Check recent logs for template validation tracking
cd server
grep "Template validation tracked" logs/combined.log | tail -20
grep "Failed to track template validation" logs/error.log
```

**What to look for:**
- ❌ `Failed to track template validation` errors
- ❌ Database connection errors during generation
- ❌ Transaction rollback issues

### Step 3: Verify Database Function

Connect to your database and test the function manually:

```sql
-- Check current count
SELECT id, name, validation_count, success_count 
FROM templates 
WHERE name LIKE '%your template name%';

-- Manually call the update function
SELECT update_template_validation(
  '<template-id>'::UUID, 
  0.85::NUMERIC, 
  '<user-id>'::UUID
);

-- Check if it incremented
SELECT validation_count, success_count, last_validated_at
FROM templates 
WHERE id = '<template-id>';
```

**Expected Result:**
- `validation_count` should increment by 1
- `success_count` should increment by 1 (if quality_score >= quality_threshold)
- `last_validated_at` should update to current timestamp

If the manual test **works**, the issue is that the function isn't being called from the application.

If the manual test **fails**, there's a database-level issue.

## Possible Causes & Fixes

### Cause 1: Counter Out of Sync with Reality ✅ MOST LIKELY

**Symptoms:**
- Template shows 20 uses
- But `template_usage` table has more entries
- Documents continue to be created successfully

**Root Cause:**
- The `update_template_validation` function WAS being called, but at some point it stopped
- OR the counters were manually set/reset and are now out of sync

**Fix: Recalculate Counters from Actual Data**

```bash
cd server

# DRY RUN - See what would change (safe, no modifications)
npx tsx scripts/fix-template-usage-counters.ts --dry-run

# For a specific template
npx tsx scripts/fix-template-usage-counters.ts --dry-run --template-id=<uuid>

# LIVE MODE - Actually fix the counters
npx tsx scripts/fix-template-usage-counters.ts --live

# Fix specific template only
npx tsx scripts/fix-template-usage-counters.ts --live --template-id=<uuid>
```

**What this does:**
- Counts actual entries in `template_usage` table for each template
- Counts actual successful uses (where `success = true`)
- Updates `validation_count` and `success_count` to match reality
- Updates `last_validated_at` to the most recent use timestamp

### Cause 2: Function Not Being Called

**Symptoms:**
- `template_usage` table shows only 20 entries
- Documents created but template usage not tracked

**Root Cause:**
- Code path that calls `update_template_validation` is being skipped
- OR the call is failing silently

**Fix: Add Better Error Logging**

Edit `server/src/routes/ai.ts` around line 200:

```typescript
// Track template validation (for template lifecycle tracking)
if (template_id && quality.overallQuality) {
  try {
    log.info('🔄 Calling update_template_validation', {
      template_id,
      quality_score: quality.overallQuality,
      user_id: req.user?.id
    })
    
    await pool.query(
      'SELECT update_template_validation($1, $2, $3)',
      [template_id, quality.overallQuality / 100, req.user?.id]
    )
    
    log.info('✅ Template validation tracked', {
      template_id,
      quality_score: quality.overallQuality,
      validation_count_incremented: true
    })
    
    // IMPORTANT: Clear template cache so UI shows updated metrics immediately
    await cache.del(`template:${template_id}`)
    log.info('🔄 Template cache cleared for fresh metrics display')
  } catch (error) {
    log.error('⚠️ FAILED to track template validation:', {
      template_id,
      error: error.message,
      stack: error.stack  // ← ADD THIS to see full error
    })
  }
}
```

Then monitor logs during next document generation:
```bash
tail -f server/logs/combined.log | grep -E "update_template_validation|Template validation"
```

### Cause 3: Database Constraint or Bug in Function

**Symptoms:**
- Manual SQL call to `update_template_validation` fails
- OR succeeds but counter doesn't increment
- Errors in database logs

**Fix: Recreate the Function**

```sql
-- Drop and recreate the function
DROP FUNCTION IF EXISTS update_template_validation(UUID, NUMERIC, UUID);

-- Recreate from migration file
-- Run: server/migrations/015_template_development_status.sql lines 75-101
```

### Cause 4: Template ID Changing

**Symptoms:**
- Different template ID being used than expected
- Usage tracked against wrong template

**Fix: Log the template_id**

Add logging in document generation:

```typescript
log.info('📝 Document generation request', {
  template_id: req.body.template_id,
  project_id: req.body.projectId,
  user_id: req.user?.id
})
```

### Cause 5: Cache Poisoning

**Symptoms:**
- Database shows correct high count (e.g., 35)
- UI shows cached old count (20)
- Clearing browser cache doesn't help

**Fix: Clear Redis Cache**

```bash
# Option 1: Clear specific template cache
redis-cli DEL "template:<template-id>"

# Option 2: Clear all template caches
redis-cli KEYS "template:*" | xargs redis-cli DEL

# Option 3: Clear entire Redis (nuclear option)
redis-cli FLUSHALL
```

## Quick Fix (Temporary)

If you need immediate fix without investigation:

```bash
cd server
npx tsx scripts/fix-template-usage-counters.ts --live --template-id=<your-template-id>
```

This will resync the counters based on actual usage data.

## Preventative Measures

1. **Add Database Trigger** to auto-update counts when `template_usage` rows inserted:

```sql
CREATE OR REPLACE FUNCTION sync_template_counts_on_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE templates
    SET 
      validation_count = validation_count + 1,
      success_count = CASE WHEN NEW.success = true THEN success_count + 1 ELSE success_count END,
      last_validated_at = NEW.used_at
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

2. **Add Monitoring Alert** when counters drift:

```typescript
// In a scheduled job (e.g., nightly)
const driftCheck = await pool.query(`
  SELECT 
    t.id,
    t.name,
    t.validation_count,
    COUNT(tu.id) as actual_count,
    ABS(t.validation_count - COUNT(tu.id)) as drift
  FROM templates t
  LEFT JOIN template_usage tu ON t.id = tu.template_id
  GROUP BY t.id, t.name, t.validation_count
  HAVING ABS(t.validation_count - COUNT(tu.id)) > 5
`)

if (driftCheck.rows.length > 0) {
  // Send alert email/notification
  logger.warn('Template counter drift detected', { templates: driftCheck.rows })
}
```

## Related Files

- **Database Function**: `server/migrations/015_template_development_status.sql` (lines 75-101)
- **AI Route**: `server/src/routes/ai.ts` (lines 199-218)
- **Templates API**: `server/src/routes/templates.ts` (lines 34-40)
- **Queue Service**: `server/src/services/queueService.ts` (lines 381-398)
- **Diagnostic Script**: `server/scripts/diagnose-template-usage.ts`
- **Fix Script**: `server/scripts/fix-template-usage-counters.ts`

## Summary

The most likely cause is that the counters are **out of sync** with actual data. Run the diagnostic script first to confirm, then use the fix script to resync the counters.

If the issue persists after resyncing, it means the `update_template_validation` function is not being called consistently. Add detailed logging to track down where the call is being skipped or failing.

