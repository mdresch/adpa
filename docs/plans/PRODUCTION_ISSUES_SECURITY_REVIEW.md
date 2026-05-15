# Critical Production Issues - Security & Performance Review

**Date**: 2026-03-31
**Status**: 8 Critical Issues Identified
**Source**: Code Review - Production Risk Assessment

---

## Issue #1: Authorization Bypass via Redis Caching

**Severity**: 🔴 CRITICAL - Security Vulnerability

**Problem**:
```typescript
// VULNERABLE: Cache is checked BEFORE authorization
async getPlaybookById(id: string, user: AuthenticatedUser): Promise<PlaybookTemplate | null> {
  const cacheKey = `playbook:${id}`
  const cached = await cache.get(cacheKey)
  if (cached) {
    return cached as PlaybookTemplate  // Returns without checking is_public or created_by!
  }
  // ... authorization check happens AFTER cache hit
}
```

**Risk**: A private playbook cached from an authorized request can be returned to unauthorized users.

**Fix**:
```typescript
// SECURE: Always enforce authorization, cache only after auth check
async getPlaybookById(id: string, user: AuthenticatedUser): Promise<PlaybookTemplate | null> {
  // Query with authorization check FIRST
  const result = await pool.query(
    `SELECT pt.*, u.name as created_by_name
     FROM playbook_templates pt
     LEFT JOIN users u ON pt.created_by = u.id
     WHERE pt.id = $1 
     AND (pt.is_public = true OR pt.created_by = $2) 
     AND pt.deleted_at IS NULL`,
    [id, user.id]
  )

  if (result.rows.length === 0) {
    return null
  }

  const playbook = result.rows[0]
  
  // Cache ONLY after authorization succeeds
  const cacheKey = `playbook:${id}:${user.id}` // Include user in cache key
  await cache.set(cacheKey, playbook, 3600)

  return playbook
}
```

**Key Changes**:
- ✅ Authorization check happens BEFORE cache lookup
- ✅ Cache key includes user ID to prevent cross-user leakage
- ✅ Cache only stores authorized results

---

## Issue #2: Missing Authorization in Version Creation

**Severity**: 🔴 CRITICAL - Authorization Bypass

**Problem**:
```typescript
// VULNERABLE: No authorization check
async createVersion(
  playbookId: string,
  changeSummary: string,
  changeType: 'editorial' | 'structural' | 'policy',
  user: AuthenticatedUser
): Promise<PlaybookVersion> {
  // No check that user is owner or admin!
  const playbookResult = await pool.query(
    "SELECT * FROM playbook_templates WHERE id = $1 AND deleted_at IS NULL",
    [playbookId]
  )
  // ... proceeds without authorization
}
```

**Risk**: Any authenticated user can create versions of any playbook.

**Fix**:
```typescript
async createVersion(
  playbookId: string,
  changeSummary: string,
  changeType: 'editorial' | 'structural' | 'policy',
  user: AuthenticatedUser
): Promise<PlaybookVersion> {
  // ADDED: Authorization check
  const playbookResult = await pool.query(
    `SELECT * FROM playbook_templates 
     WHERE id = $1 AND deleted_at IS NULL
     AND (created_by = $2 OR $3 = 'admin')`,
    [playbookId, user.id, user.role]
  )

  if (playbookResult.rows.length === 0) {
    throw new Error('Playbook not found or access denied')
  }

  const playbook = playbookResult.rows[0]
  // ... rest of implementation
}
```

---

## Issue #3: Race Condition in Version Creation

**Severity**: 🔴 CRITICAL - Data Integrity

**Problem**:
```typescript
// VULNERABLE: Two separate queries without transaction
const result = await pool.query(
  `INSERT INTO playbook_versions (...) VALUES (...)`
)

// Concurrent calls can create conflicting version numbers
await pool.query(
  `UPDATE playbook_templates SET version_major = $1, ...`
)
```

**Risk**: Concurrent version creations can produce duplicate version numbers or violate uniqueness constraints.

**Fix**:
```typescript
// SECURE: Use transaction and row-level lock
async createVersion(
  playbookId: string,
  changeSummary: string,
  changeType: 'editorial' | 'structural' | 'policy',
  user: AuthenticatedUser
): Promise<PlaybookVersion> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    
    // Lock the row to prevent concurrent updates
    const playbookResult = await client.query(
      `SELECT * FROM playbook_templates 
       WHERE id = $1 AND deleted_at IS NULL
       FOR UPDATE`,
      [playbookId]
    )

    if (playbookResult.rows.length === 0) {
      throw new Error('Playbook not found')
    }

    const playbook = playbookResult.rows[0]
    
    // Calculate new version
    let newMajor = playbook.version_major
    let newMinor = playbook.version_minor
    let newMicro = playbook.version_micro + 1

    if (changeType === 'structural') {
      newMinor += 1
      newMicro = 0
    } else if (changeType === 'policy') {
      newMajor += 1
      newMinor = 0
      newMicro = 0
    }

    // Insert version
    const versionId = uuidv4()
    const versionResult = await client.query(
      `INSERT INTO playbook_versions (...) VALUES (...) RETURNING *`,
      [...]
    )

    // Update template version numbers
    await client.query(
      `UPDATE playbook_templates SET version_major = $1, ... WHERE id = $2`,
      [newMajor, newMinor, newMicro, playbookId]
    )

    await client.query('COMMIT')
    return versionResult.rows[0]
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
```

**Key Changes**:
- ✅ Wrapped in transaction (BEGIN/COMMIT/ROLLBACK)
- ✅ Uses FOR UPDATE to lock row
- ✅ Atomic version number increment

---

## Issue #4: Division by Zero in QA Scoring

**Severity**: 🔴 CRITICAL - Runtime Crash

**Problem**:
```typescript
// VULNERABLE: No empty array check
private async checkEscalationTiming(playbook: PlaybookTemplate): Promise<number> {
  const escalationRules = playbook.escalation_rules
  const rulesWithTiming = escalationRules.filter(r => r.timing).length
  return (rulesWithTiming / escalationRules.length) * 100  // NaN if empty!
}
```

**Risk**: Returns NaN, which poisons overall_score and breaks quality gate logic.

**Fix**:
```typescript
private async checkEscalationTiming(playbook: PlaybookTemplate): Promise<number> {
  const escalationRules = playbook.escalation_rules
  
  // ADDED: Validate array is not empty
  if (!escalationRules || escalationRules.length === 0) {
    return 0 // No rules = no timing coverage
  }
  
  const rulesWithTiming = escalationRules.filter(r => r.timing).length
  return (rulesWithTiming / escalationRules.length) * 100
}
```

---

## Issue #5: Code Injection via new Function()

**Severity**: 🔴 CRITICAL - Remote Code Execution

**Problem**:
```typescript
// VULNERABLE: Arbitrary code execution
private evaluateCondition(condition: string, data: Record<string, any>): boolean {
  try {
    const func = new Function('data', `return ${condition}`)
    return func(data)  // Executes arbitrary JS!
  } catch (error) {
    return false
  }
}
```

**Risk**: If condition comes from DB or user input, attacker can execute arbitrary code.

**Fix**:
```typescript
private evaluateCondition(condition: string, data: Record<string, any>): boolean {
  try {
    // SECURE: Use safe expression evaluator
    const expr = require('expr-eval')
    const compiled = expr.compile(condition)
    return compiled.evaluate(data)
  } catch (error) {
    logger.warn(`Failed to evaluate condition: ${condition}`, error)
    return false
  }
}
```

---

## Issue #6: Incorrect Timestamp Logic

**Severity**: 🔴 CRITICAL - Data Integrity

**Problem**:
```typescript
// VULNERABLE: Sets resolved_at for ALL statuses
async updateResolutionStatus(
  escalationRecordId: string,
  status: 'pending' | 'in_progress' | 'resolved' | 'escalated',
  notes?: string
): Promise<void> {
  await pool.query(
    `UPDATE playbook_escalation_records
     SET resolution_status = $1, resolved_at = CURRENT_TIMESTAMP, ...
     WHERE id = $2`,
    [status, escalationRecordId]
  )
}
```

**Risk**: resolved_at is set even for pending/in_progress, breaking SLA calculations.

**Fix**:
```typescript
async updateResolutionStatus(
  escalationRecordId: string,
  status: 'pending' | 'in_progress' | 'resolved' | 'escalated',
  notes?: string
): Promise<void> {
  // SECURE: Only set resolved_at for terminal statuses
  const isTerminal = status === 'resolved' || status === 'escalated'
  
  await pool.query(
    `UPDATE playbook_escalation_records
     SET resolution_status = $1, 
         resolved_at = ${isTerminal ? 'CURRENT_TIMESTAMP' : 'resolved_at'},
         resolution_notes = $2
     WHERE id = $3`,
    [status, notes || null, escalationRecordId]
  )
}
```

---

## Issue #7: Expensive & Unstable Variance Algorithm

**Severity**: 🔴 CRITICAL - Performance & Correctness

**Problem**:
```typescript
// VULNERABLE: O(n·m) complexity, unstable metric
private calculateVariance(expected: Record<string, any>, actual: Record<string, any>): number {
  const expectedStr = JSON.stringify(expected)  // Order-dependent!
  const actualStr = JSON.stringify(actual)
  const similarity = this.calculateSimilarity(expectedStr, actualStr)
  return 1 - similarity
}

private getEditDistance(s1: string, s2: string): number {
  // Levenshtein distance: O(n·m) time, O(n) space
  // Can be very slow on large payloads
}
```

**Risk**: 
- Quadratic time complexity on large payloads
- Sensitive to key ordering (not semantic)
- Noisy signal for analytics

**Fix**:
```typescript
private calculateVariance(expected: Record<string, any>, actual: Record<string, any>): number {
  // SECURE: Semantic comparison, not string-based
  
  // Compare key sets
  const expectedKeys = new Set(Object.keys(expected))
  const actualKeys = new Set(Object.keys(actual))
  
  const addedKeys = [...actualKeys].filter(k => !expectedKeys.has(k)).length
  const removedKeys = [...expectedKeys].filter(k => !actualKeys.has(k)).length
  const commonKeys = [...expectedKeys].filter(k => actualKeys.has(k))
  
  // Compare values for common keys
  let changedValues = 0
  for (const key of commonKeys) {
    if (JSON.stringify(expected[key]) !== JSON.stringify(actual[key])) {
      changedValues++
    }
  }
  
  // Calculate variance as ratio of changes
  const totalKeys = Math.max(expectedKeys.size, actualKeys.size)
  if (totalKeys === 0) return 0
  
  const changes = addedKeys + removedKeys + changedValues
  return Math.min(1, changes / totalKeys)
}
```

**Key Improvements**:
- ✅ O(n) time complexity
- ✅ Semantic comparison (key/value based)
- ✅ Stable metric
- ✅ Handles missing/extra keys

---

## Issue #8: N+1 Write Pattern in Entity Extraction

**Severity**: 🔴 CRITICAL - Performance

**Problem**:
```typescript
// VULNERABLE: One INSERT per entity
for (const entity of entities) {
  await pool.query(
    `INSERT INTO playbook_extracted_entities (...) VALUES (...)`,
    [...]
  )
}
```

**Risk**: 
- Slow: O(n) round trips to database
- Hard to rollback: Partial inserts on failure
- Bottleneck under load

**Fix**:
```typescript
// SECURE: Batch insert
if (entities.length === 0) return []

const values = entities.map((entity, idx) => {
  const paramBase = idx * 9
  return `($${paramBase + 1}, $${paramBase + 2}, $${paramBase + 3}, $${paramBase + 4}, $${paramBase + 5}, $${paramBase + 6}, $${paramBase + 7}, $${paramBase + 8}, $${paramBase + 9})`
}).join(',')

const params = entities.flatMap(entity => [
  entity.id,
  entity.playbook_id,
  entity.version_id,
  entity.entity_type,
  entity.entity_name,
  JSON.stringify(entity.entity_value),
  entity.extracted_at,
  entity.extraction_confidence,
  entity.source_section
])

await pool.query(
  `INSERT INTO playbook_extracted_entities (...) VALUES ${values}`,
  params
)
```

**Key Improvements**:
- ✅ Single database round trip
- ✅ Atomic: All or nothing
- ✅ 10-100x faster

---

## Issue #9: Missing UUID Extension & Weak Enums

**Severity**: 🟡 HIGH - Data Quality

**Problem**:
```sql
-- VULNERABLE: No UUID extension enabled
CREATE TABLE playbook_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- Requires extension!
  status VARCHAR(50) DEFAULT 'draft',  -- Free-form string, no validation
  qa_status VARCHAR(50),  -- Can be any string
  quality_gate_status VARCHAR(50),  -- No constraints
  review_workflow_state VARCHAR(50)  -- Invalid states possible
);
```

**Risk**: 
- Migration fails if UUID extension not enabled
- Invalid states can be inserted
- Hard to debug data quality issues

**Fix**:
```sql
-- SECURE: Enable extension and use CHECK constraints
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE playbook_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status VARCHAR(50) DEFAULT 'draft' 
    CHECK (status IN ('draft', 'testing', 'active', 'deprecated')),
  qa_status VARCHAR(50) 
    CHECK (qa_status IS NULL OR qa_status IN ('passed', 'failed', 'pending')),
  quality_gate_status VARCHAR(50) 
    CHECK (quality_gate_status IS NULL OR quality_gate_status IN ('passed', 'failed', 'blocked')),
  review_workflow_state VARCHAR(50) DEFAULT 'draft'
    CHECK (review_workflow_state IN ('draft', 'in_review', 'approved', 'rejected')),
  ...
);
```

---

## Issue #10: Excessive Use of Record<string, any>

**Severity**: 🟡 HIGH - Type Safety

**Problem**:
```typescript
// VULNERABLE: Erases type safety
export interface PlaybookTemplate {
  content: Record<string, any>  // Could be anything
  qa_results?: Record<string, any>  // Unvalidated
  trigger_data?: Record<string, any>  // No schema
}

export interface AuthenticatedUser {
  permissions?: any  // Completely untyped
}
```

**Risk**: 
- No compile-time validation
- Runtime errors from unexpected shapes
- Harder to refactor

**Fix**:
```typescript
// SECURE: Define specific types
export interface SeverityModel {
  levels: SeverityLevel[]
  classification_rules: ClassificationRule[]
  escalation_thresholds: EscalationThreshold[]
}

export interface PlaybookTemplate {
  content: {
    severity_model: SeverityModel
    escalation_rules: EscalationRule[]
    actions: PlaybookAction[]
    automations?: PlaybookAutomation[]
    compliance_references?: ComplianceReference[]
  }
  qa_results?: QAResult  // Specific type
  trigger_data?: TriggerData  // Specific type
}

export interface AuthenticatedUser {
  id: string
  email: string
  role: 'user' | 'admin' | 'reviewer'
  permissions: UserPermissions  // Specific type
}

export interface UserPermissions {
  canCreatePlaybooks: boolean
  canReviewPlaybooks: boolean
  canDeletePlaybooks: boolean
  canManageUsers: boolean
}
```

---

## Summary Table

| # | Issue | Type | Severity | Status |
|---|-------|------|----------|--------|
| 1 | Redis Cache Authz Bypass | Security | CRITICAL | ⚠️ NEEDS FIX |
| 2 | Missing Version Authz | Security | CRITICAL | ⚠️ NEEDS FIX |
| 3 | Race Condition (No Transaction) | Data Integrity | CRITICAL | ⚠️ NEEDS FIX |
| 4 | Division by Zero (QA) | Logic | CRITICAL | ⚠️ NEEDS FIX |
| 5 | Code Injection (new Function) | Security | CRITICAL | ⚠️ NEEDS FIX |
| 6 | Wrong Timestamp Logic | Data Integrity | CRITICAL | ⚠️ NEEDS FIX |
| 7 | Expensive Variance Algorithm | Performance | CRITICAL | ⚠️ NEEDS FIX |
| 8 | N+1 Write Pattern | Performance | CRITICAL | ⚠️ NEEDS FIX |
| 9 | Missing UUID Extension | Data Quality | HIGH | ⚠️ NEEDS FIX |
| 10 | Excessive Record<string, any> | Type Safety | HIGH | ⚠️ NEEDS FIX |

---

## Implementation Priority

**BLOCKING (Must fix before Phase 1)**:
1. Issue #1 - Redis cache authorization
2. Issue #2 - Version creation authorization
3. Issue #3 - Transaction/locking
4. Issue #5 - Code injection
5. Issue #6 - Timestamp logic

**HIGH (Must fix before Phase 2)**:
6. Issue #4 - Division by zero
7. Issue #7 - Variance algorithm
8. Issue #8 - Batch inserts
9. Issue #9 - UUID extension & enums
10. Issue #10 - Type safety

---

## Conclusion

✅ **All 10 production issues documented with fixes**

⚠️ **Implementation plan requires significant revision before production use**

🔒 **Security-first approach needed for all data access patterns**

📊 **Performance optimizations critical for scalability**
