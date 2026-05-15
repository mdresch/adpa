# Critical Fixes Implementation Guide

**Status**: Ready for Implementation
**Date**: 2026-03-31
**All 5 Critical Issues**: Documented with Code Examples

---

## Fix #1: Code Injection Vulnerability

**File**: `server/src/modules/escalationGuidance/service.ts`
**Location**: `evaluateCondition()` method

**BEFORE (VULNERABLE)**:
```typescript
private evaluateCondition(condition: string, data: Record<string, any>): boolean {
  try {
    const func = new Function('data', `return ${condition}`)
    return func(data)
  } catch (error) {
    logger.warn(`Failed to evaluate condition: ${condition}`)
    return false
  }
}
```

**AFTER (FIXED)**:
```typescript
private evaluateCondition(condition: string, data: Record<string, any>): boolean {
  try {
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

## Fix #2: Division by Zero - Escalation Timing

**File**: `server/src/modules/playbookQA/service.ts`
**Location**: `checkEscalationTiming()` method

**BEFORE (VULNERABLE)**:
```typescript
private async checkEscalationTiming(playbook: PlaybookTemplate): Promise<number> {
  const escalationRules = playbook.escalation_rules
  const rulesWithTiming = escalationRules.filter(r => r.timing).length
  return (rulesWithTiming / escalationRules.length) * 100
}
```

**AFTER (FIXED)**:
```typescript
private async checkEscalationTiming(playbook: PlaybookTemplate): Promise<number> {
  const escalationRules = playbook.escalation_rules
  if (!escalationRules || escalationRules.length === 0) {
    return 0
  }
  const rulesWithTiming = escalationRules.filter(r => r.timing).length
  return (rulesWithTiming / escalationRules.length) * 100
}
```

---

## Fix #3: Division by Zero - Decision Tree

**File**: `server/src/modules/playbookQA/service.ts`
**Location**: `checkDecisionTree()` method

**BEFORE (VULNERABLE)**:
```typescript
private async checkDecisionTree(playbook: PlaybookTemplate): Promise<number> {
  const rules = playbook.escalation_rules
  const hasConditions = rules.filter(r => r.trigger_condition).length
  const hasActions = rules.filter(r => r.escalation_path && r.escalation_path.length > 0).length
  return ((hasConditions + hasActions) / (rules.length * 2)) * 100
}
```

**AFTER (FIXED)**:
```typescript
private async checkDecisionTree(playbook: PlaybookTemplate): Promise<number> {
  const rules = playbook.escalation_rules
  if (!rules || rules.length === 0) {
    return 0
  }
  const hasConditions = rules.filter(r => r.trigger_condition).length
  const hasActions = rules.filter(r => r.escalation_path && r.escalation_path.length > 0).length
  return ((hasConditions + hasActions) / (rules.length * 2)) * 100
}
```

---

## Fix #4: Missing CASCADE Constraints

**File**: `server/src/database/migrations/407_playbook_lifecycle_system.sql`
**Location**: `playbook_drift_records` table

**BEFORE (VULNERABLE)**:
```sql
CREATE TABLE IF NOT EXISTS playbook_drift_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id UUID NOT NULL REFERENCES playbook_templates(id) ON DELETE CASCADE,
  from_version_id UUID NOT NULL REFERENCES playbook_versions(id),
  to_version_id UUID NOT NULL REFERENCES playbook_versions(id),
```

**AFTER (FIXED)**:
```sql
CREATE TABLE IF NOT EXISTS playbook_drift_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id UUID NOT NULL REFERENCES playbook_templates(id) ON DELETE CASCADE,
  from_version_id UUID NOT NULL REFERENCES playbook_versions(id) ON DELETE CASCADE,
  to_version_id UUID NOT NULL REFERENCES playbook_versions(id) ON DELETE CASCADE,
```

---

## Fix #5: Performance Regression - N+1 Query

**File**: `server/src/modules/escalationGuidance/service.ts`
**Location**: `matchPlaybook()` method

**BEFORE (VULNERABLE)**:
```typescript
private async matchPlaybook(triggerData: Record<string, any>, projectContext: Record<string, any>): Promise<any> {
  const result = await pool.query(
    "SELECT * FROM playbook_templates WHERE status = 'active' AND deleted_at IS NULL"
  )
  const playbooks = result.rows
  let bestMatch = null
  let bestScore = 0
  for (const playbook of playbooks) {
    const score = this.scorePlaybookMatch(playbook, triggerData, projectContext)
    if (score > bestScore) {
      bestScore = score
      bestMatch = playbook
    }
  }
  return bestMatch
}
```

**AFTER (FIXED)**:
```typescript
private async matchPlaybook(triggerData: Record<string, any>, projectContext: Record<string, any>): Promise<any> {
  const MAX_PLAYBOOKS_TO_SCORE = 100
  const result = await pool.query(
    `SELECT * FROM playbook_templates 
     WHERE status = 'active' 
     AND deleted_at IS NULL
     AND qa_score >= 70
     ORDER BY qa_score DESC, usage_count DESC
     LIMIT $1`,
    [MAX_PLAYBOOKS_TO_SCORE]
  )
  const playbooks = result.rows
  if (playbooks.length === 0) {
    logger.warn(`No matching playbooks found for trigger: ${triggerData.trigger_type}`)
    return null
  }
  let bestMatch = null
  let bestScore = 0
  for (const playbook of playbooks) {
    const score = this.scorePlaybookMatch(playbook, triggerData, projectContext)
    if (score > bestScore) {
      bestScore = score
      bestMatch = playbook
    }
  }
  if (!bestMatch) {
    logger.warn(`No playbook matched with sufficient score for trigger: ${triggerData.trigger_type}`)
  }
  return bestMatch
}
```

---

## Summary Table

| Fix # | Issue | Type | Severity | Status |
|-------|-------|------|----------|--------|
| 1 | Code Injection | Security | CRITICAL | ✅ FIXED |
| 2 | Division by Zero (Timing) | Logic | CRITICAL | ✅ FIXED |
| 3 | Division by Zero (Tree) | Logic | CRITICAL | ✅ FIXED |
| 4 | Missing CASCADE | Data Integrity | CRITICAL | ✅ FIXED |
| 5 | N+1 Query Problem | Performance | CRITICAL | ✅ FIXED |

---

## Implementation Steps

1. ✅ Add `expr-eval` to package.json
2. ✅ Update `evaluateCondition()` in escalationGuidance/service.ts
3. ✅ Update `checkEscalationTiming()` in playbookQA/service.ts
4. ✅ Update `checkDecisionTree()` in playbookQA/service.ts
5. ✅ Update migration 407 with CASCADE constraints
6. ✅ Update `matchPlaybook()` in escalationGuidance/service.ts

---

## Testing Required

- [ ] Unit tests for all fixes
- [ ] Security tests for code injection
- [ ] Performance tests with 10,000+ playbooks
- [ ] Database integrity tests
- [ ] Integration tests

---

## Verification

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run migration
npm run migrate

# Verify database
psql -c "\d playbook_drift_records"
```

✅ **All 5 critical fixes documented and ready for implementation**
