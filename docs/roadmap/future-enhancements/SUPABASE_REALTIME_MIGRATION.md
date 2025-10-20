# Feature Request: Migrate to Supabase Realtime (Hybrid Architecture)

**Feature ID**: FR-2026-003  
**Category**: Architecture Enhancement  
**Priority**: Medium  
**Estimated Effort**: 2-3 weeks  
**Status**: 📋 Proposed (Not Started)

---

## Executive Summary

**What**: Migrate from pure Socket.io to a hybrid architecture using **Supabase Realtime** for database changes and **Socket.io** for complex business logic events.

**Why**: Reduce backend load, improve performance, leverage built-in Row-Level Security (RLS), and simplify code for database-driven real-time features.

**Value**: 30-40% reduction in backend WebSocket load, better security (automatic RLS), lower latency for DB changes, and simplified maintenance.

**Ask**: 2-3 weeks of development time (after baseline system is stable and tested).

---

## Problem Statement

### Current Architecture (Socket.io Only)

```typescript
// Current: Every database change requires manual broadcasting
async function updateDocument(docId, content) {
  await db.update('documents', docId, content)
  // Must manually broadcast via Socket.io
  io.to(`doc:${docId}`).emit('document:updated', { docId, content })
}
```

**Issues**:
- ❌ Backend must manually broadcast every DB change
- ❌ No automatic Row-Level Security on WebSocket events
- ❌ Backend is bottleneck for all real-time updates
- ❌ More server resources needed for WebSocket scaling
- ❌ Code duplication (DB logic + broadcast logic)

---

## Proposed Solution: Hybrid Architecture

### Use Supabase Realtime For:
✅ **Database change notifications** (CDC - Change Data Capture)
✅ **User presence tracking** (who's online, viewing documents)
✅ **Simple broadcasts** (client-to-client messages)

### Keep Socket.io For:
✅ **Business logic events** (job queue updates, AI progress)
✅ **Server-initiated actions** (notifications, alerts)
✅ **Complex workflows** (multi-step processes)
✅ **Events requiring validation** (before broadcasting)

---

## Technical Architecture

### After Migration:

```typescript
// Supabase Realtime: Database changes (automatic)
const channel = supabase
  .channel(`project:${projectId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'documents',
    filter: `project_id=eq.${projectId}`
  }, (payload) => {
    // RLS automatically enforced!
    updateDocumentInUI(payload.new)
  })
  .subscribe()

// Socket.io: Business events (manual)
socket.on('job:status', (data) => {
  updateJobProgress(data)
})
```

**Benefits**:
- Supabase handles DB change broadcasting automatically
- RLS policies enforced at database level
- No backend code needed for simple DB updates
- Socket.io handles complex business logic

---

## Migration Plan (12 Steps)

### Phase 1: Analysis & Setup
1. **Audit Socket.io usage** - Document all current events
2. **Set up Supabase Realtime** - Enable in Supabase dashboard
3. **Create RealtimeContext** - New React context for Supabase subscriptions

### Phase 2: Core Migration  
4. **Migrate DB listeners** - Documents, baselines, projects
5. **Implement presence** - Track online users, document viewers
6. **Enable RLS policies** - Secure all Realtime subscriptions
7. **Migrate broadcasts** - Simple client-to-client messages

### Phase 3: Hybrid Integration
8. **Keep Socket.io for complex events** - Job progress, AI generation

### Phase 4: Testing & Finalization
9. **Update components** - Refactor to use hybrid approach
10. **Test functionality** - Verify all features work
11. **Performance testing** - Benchmark connections and latency
12. **Update documentation** - Architecture decisions

---

## Expected Benefits

| Metric | Current | After Migration | Improvement |
|--------|---------|-----------------|-------------|
| Backend WebSocket Load | 100% | 60% | **-40%** |
| DB Change Latency | 50-100ms | 10-30ms | **-70%** |
| Security (RLS) | Manual | Automatic | **100%** |
| Code Complexity | High | Medium | **-30%** |
| Connection Scalability | Limited | High | **+200%** |

---

## Dependencies

**Requires**:
- Baseline system stable and tested ✅ (in progress)
- Supabase project configured ✅ (exists)
- RLS policies defined ❌ (need to create)

**Integrates With**:
- Document management system
- Baseline system
- Project collaboration features

---

## Risks

| Risk | Mitigation |
|------|------------|
| **Breaking existing real-time features** | Gradual migration, keep Socket.io as fallback |
| **RLS policies too restrictive** | Thorough testing, policy review |
| **Performance regression** | Benchmark before/after, rollback plan |
| **Learning curve** | Documentation, examples |

---

## Decision Matrix: When to Use Which?

| Use Case | Use Supabase | Use Socket.io |
|----------|--------------|---------------|
| Document row updated | ✅ Yes | ❌ No |
| User presence tracking | ✅ Yes | ❌ No |
| Job queue progress | ❌ No | ✅ Yes |
| AI generation streaming | ❌ No | ✅ Yes |
| Admin notifications | ❌ No | ✅ Yes |
| Workflow coordination | ❌ No | ✅ Yes |

---

## Implementation Priority

**Priority**: Medium (after baseline system is validated)

**Rationale**:
- Not critical for current functionality
- Nice-to-have performance improvement
- Reduces technical debt
- Better long-term architecture

**Timeline**: Q1 2026 (after baseline testing complete)

---

## Success Criteria

- [ ] 30%+ reduction in backend WebSocket load
- [ ] RLS policies enforced for all DB subscriptions
- [ ] Zero regression in real-time features
- [ ] Improved latency for DB change notifications
- [ ] Documentation complete (hybrid architecture guide)

---

## Related Work

- **Baseline System** (CR-2026-001) - Currently testing
- **Feedback Intelligence** (CR-2026-002) - Schema complete
- **Document Version Control** (Future) - Would benefit from Supabase Realtime

---

## Notes

**Why Hybrid Instead of Full Migration**:
- Socket.io is perfect for complex business logic
- Supabase Realtime is perfect for simple DB changes
- Best of both worlds: performance + flexibility

**Why Not Now**:
- Baseline system needs testing first
- Don't introduce new complexity while debugging
- Better to have stable foundation before optimizing

---

**Status**: Documented for future implementation after baseline validation complete.

