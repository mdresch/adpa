# Document Date Backdating Issue - Root Cause Analysis

**Created**: November 19, 2025  
**Issue**: Generated documents have incorrect dates (backdated)  
**Status**: 🔴 Critical - Affects all document generation

---

## 🔍 Root Cause

### **Primary Issue: Database Time vs Server Time Mismatch**

**Current Server Date**: November 19, 2025 ✅ **CORRECT**  
**Database Time**: Needs verification (may be incorrect)  
**Issue**: Documents showing dates from 2024 when they should show 2025

### **Hypothesis**
The database server's clock may be set to 2024, causing `NOW()` to return incorrect dates. Since document titles now use database time (via the fix), they're showing 2024 dates.

### **Problematic Code Locations**

#### 1. **Document Title Generation** (`server/src/routes/ai.ts:276-277`)
```typescript
const documentTitle = templateData?.rows[0]?.name 
  ? `${templateData.rows[0].name} - ${new Date().toLocaleDateString()}`
  : `AI Generated Document - ${new Date().toLocaleDateString()}`
```
**Problem**: Uses server's local time (`new Date()`) which is incorrect

#### 2. **Pipeline Worker** (`server/src/workers/pipelineWorker.ts:154, 292, 308`)
```typescript
name: `${templateName} - ${new Date().toLocaleDateString()}`
```
**Problem**: Same issue - uses server time

#### 3. **Database Inserts** (Multiple locations)
```sql
VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
```
**Status**: ✅ Uses PostgreSQL `NOW()` - should be correct if DB server time is correct

---

## 🎯 Solution Strategy

### **Option 1: Use Database Time (Recommended)**
Query database for current timestamp and use that for all date operations.

**Pros**:
- Single source of truth (database)
- Consistent across all operations
- Database time is usually more reliable

**Cons**:
- Requires database query for every date operation
- Slight performance overhead

### **Option 2: Fix System Clock**
Correct the server's system clock to the actual date.

**Pros**:
- Fixes root cause
- No code changes needed

**Cons**:
- Requires system admin access
- May affect other systems
- Doesn't solve timezone issues

### **Option 3: Use UTC Time**
Always use UTC timestamps and convert to local time only for display.

**Pros**:
- Avoids timezone issues
- More reliable

**Cons**:
- Requires refactoring date handling throughout codebase

---

## 🔧 Recommended Fix

### **Step 1: Create Date Utility Function**

Create a utility that always gets the current date from the database:

```typescript
// server/src/utils/dateUtils.ts
import { pool } from '../database/connection'

/**
 * Get current date/time from database (single source of truth)
 * This ensures all dates are consistent and correct
 */
export async function getCurrentDateFromDB(): Promise<Date> {
  const result = await pool.query('SELECT NOW() as current_date')
  return new Date(result.rows[0].current_date)
}

/**
 * Format date for document titles (consistent format)
 */
export async function getFormattedDateForTitle(): Promise<string> {
  const date = await getCurrentDateFromDB()
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}
```

### **Step 2: Update Document Title Generation**

**File**: `server/src/routes/ai.ts`

**Before**:
```typescript
const documentTitle = templateData?.rows[0]?.name 
  ? `${templateData.rows[0].name} - ${new Date().toLocaleDateString()}`
  : `AI Generated Document - ${new Date().toLocaleDateString()}`
```

**After**:
```typescript
const dbDate = await getFormattedDateFromDB()
const documentTitle = templateData?.rows[0]?.name 
  ? `${templateData.rows[0].name} - ${dbDate}`
  : `AI Generated Document - ${dbDate}`
```

### **Step 3: Update Pipeline Worker**

**File**: `server/src/workers/pipelineWorker.ts`

Replace all instances of `new Date().toLocaleDateString()` with database date.

### **Step 4: Fix System Clock (System Admin Task)**

**Action Required**: Correct the server's system clock to the actual date.

**Windows**:
```powershell
# Check current time
Get-Date

# Set correct time (example - adjust to actual date)
Set-Date -Date "2024-11-19 15:23:46"
```

**Linux**:
```bash
# Check current time
date

# Set correct time
sudo date -s "2024-11-19 15:23:46"
```

---

## 📋 Files Requiring Updates

### **High Priority** (Affects document generation)
1. ✅ `server/src/routes/ai.ts` - Document title generation
2. ✅ `server/src/workers/pipelineWorker.ts` - Pipeline document names
3. ✅ `server/src/utils/dateUtils.ts` - **NEW FILE** - Date utility functions

### **Medium Priority** (Display/formatting only)
4. `server/src/routes/documents.ts` - Document export dates
5. `server/src/services/driftResolutionService.ts` - Drift notification dates
6. `server/src/integrations/driftNotifications.ts` - Notification dates
7. `server/src/services/baselineService.ts` - Baseline date formatting
8. `server/src/services/baselineDocumentGenerator.ts` - Baseline document dates

### **Low Priority** (Internal use only)
9. `server/src/services/programMetricsService.ts` - Metrics date formatting
10. `server/src/services/contentStructuringService.ts` - Content structure dates
11. `server/src/services/adobePdfService.ts` - PDF generation dates

---

## 🧪 Testing Plan

### **Test Cases**
1. ✅ Generate new document → Verify title has correct date
2. ✅ Generate document via pipeline → Verify correct date
3. ✅ Check database `created_at` → Verify matches document title date
4. ✅ Generate multiple documents → Verify all have correct dates
5. ✅ Check timezone handling → Verify dates are consistent

### **Verification Steps**
```sql
-- Check database time
SELECT NOW() as db_time;

-- Check recent documents
SELECT name, created_at 
FROM documents 
ORDER BY created_at DESC 
LIMIT 10;

-- Verify dates match
-- Document title date should match created_at date
```

---

## ⚠️ Impact Assessment

### **Affected Documents**
- All documents generated via `/api/ai/generate` endpoint
- All documents generated via pipeline worker
- Document exports with date headers

### **Data Integrity**
- ✅ Database `created_at` timestamps should be correct (using `NOW()`)
- ❌ Document titles have wrong dates (using server time)
- ❌ Display dates may be wrong (using server time)

### **User Impact**
- Users see incorrect dates in document titles
- May cause confusion about when documents were created
- Could affect document organization and sorting

---

## 🚀 Implementation Priority

### **Phase 1: Critical Fix (Immediate)**
1. Create date utility function
2. Fix document title generation
3. Fix pipeline worker dates
4. **Fix system clock** (system admin)

**Estimated Time**: 2-3 hours  
**Impact**: Fixes all new document generation

### **Phase 2: Display Fixes (Short-term)**
5. Update all display date formatting
6. Add date validation tests

**Estimated Time**: 4-6 hours  
**Impact**: Fixes date display throughout application

### **Phase 3: Historical Data (Optional)**
7. Script to update existing document titles (if needed)
8. Migration to fix historical dates

**Estimated Time**: 2-4 hours  
**Impact**: Fixes existing documents (if required)

---

## 📝 Notes

- **System Clock Fix**: This is the root cause and should be fixed first
- **Database Time**: PostgreSQL `NOW()` should be correct if database server time is correct
- **Timezone**: Consider standardizing on UTC for all internal operations
- **Caching**: Date utility could cache database time for 1 second to reduce queries

---

## 🔗 Related Issues

- Document titles showing future dates
- Inconsistent dates between title and database
- User confusion about document creation dates

---

**Next Steps**: 
1. Fix system clock (system admin)
2. Implement date utility function
3. Update document generation code
4. Test and verify fixes

