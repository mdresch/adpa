# Date & Timezone Architecture - ADPA

**Created**: November 19, 2025  
**Purpose**: Document date/time storage and display architecture  
**Status**: Analysis & Recommendations

---

## 🎯 Current State Analysis

### **Database Storage**

PostgreSQL typically stores timestamps in one of two ways:

1. **`TIMESTAMP WITH TIME ZONE`** (Recommended)
   - Stores UTC internally
   - Converts to/from timezone on insert/select
   - Best practice for multi-timezone applications

2. **`TIMESTAMP WITHOUT TIME ZONE`** (Not Recommended)
   - Stores literal timestamp value
   - No timezone information
   - Can cause confusion

**Current ADPA Implementation**: Need to verify schema

### **Current Date Handling**

#### **Document Titles** (`server/src/utils/dateUtils.ts`)
```typescript
// Current: Uses server timezone
toLocaleDateString('en-US', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
})
// Result: "11/19/2025" (server's local timezone)
```

**Issue**: 
- Uses server's timezone (Europe/Amsterdam)
- Not timezone-aware
- Date-only format (no time), so less critical

#### **Database Inserts**
```sql
-- Current: Uses PostgreSQL NOW()
VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
```

**Status**: 
- `NOW()` returns server's current timestamp
- If column is `TIMESTAMP WITH TIME ZONE`, stores as UTC
- If column is `TIMESTAMP WITHOUT TIME ZONE`, stores literal value

---

## ✅ Best Practice Architecture

### **Recommended: UTC Storage + Display Layer Conversion**

```
┌─────────────────────────────────────────────────────────┐
│                    Storage Layer                        │
│  • All timestamps stored in UTC                         │
│  • Database: TIMESTAMP WITH TIME ZONE                   │
│  • API: ISO 8601 strings (UTC)                          │
│  • Internal: JavaScript Date objects (UTC internally)   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│                   Application Layer                     │
│  • Always work with UTC internally                      │
│  • Convert only for display/user input                   │
│  • Use user's timezone preference                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│                    Display Layer                        │
│  • Convert UTC → User's timezone                        │
│  • Format according to user's locale                   │
│  • Date-only: Use user's timezone date                  │
│  • DateTime: Show timezone indicator                    │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 Recommended Implementation

### **1. Database Schema (Verify & Fix)**

**Check current schema:**
```sql
SELECT 
  column_name, 
  data_type,
  datetime_precision
FROM information_schema.columns 
WHERE table_name = 'documents' 
  AND column_name IN ('created_at', 'updated_at');
```

**If using `TIMESTAMP WITHOUT TIME ZONE`, migrate to:**
```sql
ALTER TABLE documents 
  ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE,
  ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE;
```

### **2. Update Date Utility Functions**

**Enhanced `server/src/utils/dateUtils.ts`:**

```typescript
/**
 * Date Utility Functions
 * 
 * Architecture:
 * - Storage: UTC (database stores as TIMESTAMP WITH TIME ZONE)
 * - Display: User's timezone (converted at display layer)
 * - Document titles: Use server date (date-only, timezone less critical)
 */

/**
 * Get current UTC date/time
 * Always returns UTC, regardless of server timezone
 */
export function getCurrentUTC(): Date {
  return new Date() // JavaScript Date is always UTC internally
}

/**
 * Format date for document titles
 * Uses server's local date (date-only, timezone not critical)
 * Format: MM/DD/YYYY
 */
export async function getFormattedDateForTitle(date?: Date): Promise<string> {
  const dateToFormat = date || getCurrentUTC()
  // For date-only display, use server's local date
  return dateToFormat.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'UTC' // Or use server timezone for consistency
  })
}

/**
 * Format date/time for display (with timezone awareness)
 * Converts UTC to user's timezone
 */
export function formatDateTimeForDisplay(
  utcDate: Date | string,
  userTimezone?: string,
  locale: string = 'en-US'
): string {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate
  
  return date.toLocaleString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    timeZoneName: 'short' // Shows "EST", "PST", etc.
  })
}

/**
 * Format date-only for display (timezone-aware)
 * Shows the date in user's timezone
 */
export function formatDateForDisplay(
  utcDate: Date | string,
  userTimezone?: string,
  locale: string = 'en-US'
): string {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate
  
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone
  })
}

/**
 * Get UTC ISO string (for API responses)
 * Always returns UTC
 */
export function getUTCISOString(date?: Date): string {
  return (date || getCurrentUTC()).toISOString()
}
```

### **3. Frontend Display Layer**

**Create timezone-aware date formatting:**

```typescript
// lib/utils/dateFormat.ts
import { format, formatInTimeZone } from 'date-fns-tz'

/**
 * Format date for display in user's timezone
 */
export function formatDateForUser(
  utcDate: string | Date,
  userTimezone?: string
): string {
  const tz = userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate
  
  return formatInTimeZone(date, tz, 'MM/dd/yyyy')
}

/**
 * Format date/time for display
 */
export function formatDateTimeForUser(
  utcDate: string | Date,
  userTimezone?: string
): string {
  const tz = userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate
  
  return formatInTimeZone(date, tz, 'MM/dd/yyyy HH:mm:ss zzz')
}
```

---

## 📊 Current vs Recommended

### **Document Titles (Date-Only)**

| Aspect | Current | Recommended |
|--------|---------|-------------|
| **Storage** | N/A (not stored) | N/A |
| **Generation** | Server timezone | Server timezone (OK for date-only) |
| **Display** | Server timezone | Server timezone (consistent) |

**Verdict**: ✅ Current approach is acceptable for date-only titles

### **Database Timestamps**

| Aspect | Current | Recommended |
|--------|---------|-------------|
| **Storage** | `NOW()` (needs verification) | `TIMESTAMP WITH TIME ZONE` (UTC) |
| **API Response** | Depends on column type | ISO 8601 UTC strings |
| **Display** | Server timezone | User's timezone |

**Verdict**: ⚠️ Need to verify and potentially migrate

### **Display Dates**

| Aspect | Current | Recommended |
|--------|---------|-------------|
| **Format** | `toLocaleDateString()` | User timezone-aware formatting |
| **Timezone** | Server timezone | User's timezone preference |
| **Consistency** | Varies | Consistent UTC → User TZ |

**Verdict**: ⚠️ Should implement user timezone support

---

## 🎯 Answer to Your Question

### **"Is this now universal time and the actual timezone is a display layer?"**

**Current State**: 
- ❌ **Not fully implemented**
- Database may store timestamps with or without timezone
- Display uses server timezone, not user timezone
- Document titles use server date (acceptable for date-only)

**Recommended State**:
- ✅ **Yes** - UTC storage + display layer conversion
- Database: `TIMESTAMP WITH TIME ZONE` (stores UTC)
- API: ISO 8601 UTC strings
- Display: Convert to user's timezone at display layer

---

## 🔧 Implementation Plan

### **Phase 1: Verify Current State**
1. Check database schema (TIMESTAMP WITH/WITHOUT TIME ZONE)
2. Verify how dates are currently stored
3. Test timezone behavior

### **Phase 2: Standardize Storage**
1. Ensure all timestamp columns use `TIMESTAMP WITH TIME ZONE`
2. Migrate if needed
3. Update all inserts to use UTC

### **Phase 3: Implement Display Layer**
1. Add user timezone preference (user settings)
2. Create timezone-aware formatting utilities
3. Update all date displays to use user timezone

### **Phase 4: Document Titles**
1. Keep current approach (server date for date-only)
2. Or: Store UTC, convert to server date for title
3. Document the decision

---

## 💡 Key Recommendations

1. **Storage**: Always UTC (`TIMESTAMP WITH TIME ZONE`)
2. **API**: Always return UTC ISO strings
3. **Display**: Convert to user's timezone at display layer
4. **Document Titles**: Current approach OK (date-only, server timezone)
5. **User Preference**: Add timezone setting to user profile

---

## 📝 Notes

- **Document titles** (date-only) are less critical for timezone
- **Database timestamps** should be UTC for consistency
- **Display layer** should respect user's timezone preference
- **Server timezone** (Europe/Amsterdam) is fine for date-only titles

---

**Next Steps**: 
1. Verify database schema
2. Implement user timezone preference
3. Add timezone-aware display utilities
4. Update all date displays

