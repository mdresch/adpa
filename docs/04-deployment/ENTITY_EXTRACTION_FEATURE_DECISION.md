# Entity Extraction Feature Decision

**Date:** July 6, 2026  
**Status:** **DEFERRED**  
**Migration Context:** Supabase → Azure Database for PostgreSQL Flexible Server

---

## Executive Summary

The automatic entity extraction feature was deliberately **deferred** during the Supabase to Azure migration. The Supabase Edge Function implementation was removed, and the Express stand-in is currently a stub. This decision document outlines the rationale, current state, and options for moving forward.

---

## Background

### Original Implementation (Supabase)

The entity extraction feature was implemented using:
- **Supabase Edge Function**: `entity-extractor` 
- **Database Triggers**: Automatic extraction on document creation
- **HTTP Extension**: Supabase-specific extension for Edge Function calls
- **Purpose**: Automatically tag documents with entities (PROJECT_NAME, MILESTONE, RISK, etc.)

### Migration Impact

**Migration 429** dropped the following:
- `on_document_created_extract_entities` trigger
- `trg_documents_entity_extract` trigger  
- `trigger_entity_extraction()` function
- `notify_entity_extractor()` function

**Reason:** Azure Database for PostgreSQL does not support the Supabase `http` extension required for Edge Function calls.

---

## Current State

### Database Layer
- ✅ Triggers removed (Migration 429)
- ✅ Functions removed (Migration 429)
- ✅ `document_entities` table still exists (contains existing extracted entities)
- ✅ Entity extraction API endpoint exists but is a stub

### Application Layer
- **Express Stand-in**: `POST /api/rag/extract-entities/batch` 
- **Status**: Stub implementation, does not extract entities
- **Service Reference**: `supabaseService.ts` reflects this as "removed" status

### Data Layer
- **Existing Entities**: 730+ entities previously extracted remain in database
- **Extraction Capability**: No automatic extraction on document creation
- **Manual Extraction**: Available via existing AI extraction service (different from automatic triggers)

---

## Decision Rationale

### Why Defer?

1. **Azure Incompatibility**: The Supabase Edge Function pattern cannot be directly ported to Azure
2. **Alternative Exists**: Manual entity extraction via AI service is available and functional
3. **Priority Focus**: Migration priority was core database functionality, not edge features
4. **Complexity**: Implementing Azure-compatible extraction requires significant architectural changes

### Why Not Remove Entirely?

1. **Data Value**: Existing 730+ entities provide value for current operations
2. **Future Need**: Entity extraction remains valuable for document governance
3. **User Expectation**: Feature was documented and may be expected by users
4. **Strategic Value**: Entity extraction supports knowledge graph and RAG features

---

## Options for Moving Forward

### Option 1: Implement Azure-Compatible Extraction (Recommended)

**Approach**: Replace Supabase Edge Function with Azure-native implementation

**Implementation Options:**
- **Azure Functions**: Serverless functions triggered by database changes
- **Express Backend**: Implement extraction in Express with queue-based processing
- **Hybrid**: Express triggers Azure Function for extraction

**Pros:**
- Restores automatic extraction capability
- Leverages Azure ecosystem
- Maintains feature parity with original implementation

**Cons:**
- Requires significant development effort
- Need to design trigger mechanism (Azure Event Grid, etc.)
- Additional Azure service dependencies

**Effort Estimate**: 2-3 weeks development + testing

---

### Option 2: Enhance Manual Extraction (Alternative)

**Approach**: Improve existing manual extraction service and UI

**Implementation:**
- Add batch extraction UI for existing documents
- Improve extraction scheduling and automation
- Add extraction to document generation pipeline

**Pros:**
- Lower development effort
- Leverages existing infrastructure
- More user control over extraction timing

**Cons:**
- Not truly automatic
- Requires user intervention
- Different UX from original implementation

**Effort Estimate**: 1-2 weeks development

---

### Option 3: Officially Deprecate (Not Recommended)

**Approach**: Remove all entity extraction code and document as deprecated

**Implementation:**
- Remove stub API endpoint
- Archive `document_entities` table
- Update documentation to reflect deprecation
- Communicate deprecation to users

**Pros:**
- Clean removal of technical debt
- No maintenance burden
- Clear feature boundaries

**Cons:**
- Loss of valuable feature
- Negative user impact
- Reduces system capabilities
- May affect knowledge graph/RAG features

**Effort Estimate**: 3-5 days cleanup

---

## Recommended Path

### Phase 1: Short-term (Immediate)

**Action:** Document current state and set expectations

- [x] Create this decision document
- [ ] Update user-facing documentation to reflect deferred status
- [ ] Add UI notice if extraction is attempted
- [ ] Communicate to stakeholders about feature status

### Phase 2: Medium-term (Next Sprint)

**Action:** Implement Option 2 (Enhanced Manual Extraction)

- [ ] Add batch extraction UI to document management
- [ ] Integrate extraction into document generation pipeline
- [ ] Add extraction scheduling capabilities
- [ ] Improve extraction quality and accuracy

### Phase 3: Long-term (Future Sprint)

**Action:** Implement Option 1 (Azure-Compatible Automatic Extraction)

- [ ] Design Azure Function architecture
- [ ] Implement Azure Event Grid triggers
- [ ] Port extraction logic to Azure Functions
- [ ] Test and validate automatic extraction
- [ ] Migrate from manual to automatic extraction

---

## Technical Considerations

### Database Schema
The `document_entities` table structure remains intact:
```sql
CREATE TABLE document_entities (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES documents(id),
  entity TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  score NUMERIC,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Entity Types Supported
- PROJECT_NAME
- MILESTONE
- RISK
- STAKEHOLDER
- REQUIREMENT
- ACTIVITY
- DELIVERABLE
- QUALITY_STANDARD
- CONSTRAINT
- ASSUMPTION
- SUCCESS_CRITERION
- BENEFIT
- KPI

### Integration Points
- Document generation pipeline
- Knowledge graph construction
- RAG context injection
- Project analytics and reporting

---

## Success Criteria

### For Option 1 (Automatic Extraction)
- [ ] Automatic extraction triggers on document creation
- [ ] Extraction accuracy ≥ 90% (measured against manual validation)
- [ ] Extraction latency ≤ 30 seconds
- [ ] Zero data loss during migration from manual to automatic
- [ ] Cost within Azure budget constraints

### For Option 2 (Enhanced Manual)
- [ ] Batch extraction UI functional
- [ ] Extraction integrated into document generation
- [ ] User satisfaction ≥ 80% (survey-based)
- [ ] Extraction accuracy ≥ 85%
- [ ] Processing time ≤ 2 minutes for 100 documents

---

## Risks and Mitigations

### Risk 1: User Confusion
**Risk:** Users expect automatic extraction but find it doesn't work
**Mitigation:** Clear documentation, UI notices, stakeholder communication

### Risk 2: Data Quality Degradation
**Risk:** Manual extraction leads to inconsistent entity data
**Mitigation:** Validation rules, quality checks, periodic audits

### Risk 3: Performance Impact
**Risk:** Extraction processing affects system performance
**Mitigation:** Queue-based processing, rate limiting, monitoring

### Risk 4: Cost Overrun
**Risk:** Azure Functions extraction exceeds budget
**Mitigation:** Cost monitoring, optimization, fallback to manual processing

---

## Dependencies

### Technical Dependencies
- Azure Functions infrastructure (for Option 1)
- Event Grid setup (for Option 1)
- Express backend capacity (for Option 2)
- AI extraction service availability

### Team Dependencies
- Backend development team
- Azure infrastructure team
- QA/testing team
- Product management for requirements

---

## Timeline

### Immediate (Week 1)
- Document current state
- Update user-facing documentation
- Stakeholder communication

### Short-term (Weeks 2-3)
- Implement Option 2 (enhanced manual extraction)
- UI development and testing
- User acceptance testing

### Long-term (Weeks 4-6)
- Design Option 1 architecture
- Implement Azure Functions extraction
- Testing and validation
- Migration from manual to automatic

---

## Conclusion

The entity extraction feature remains valuable but was deferred during the Azure migration due to technical incompatibility. The recommended path is a phased approach:

1. **Immediate**: Document and communicate current state
2. **Short-term**: Enhance manual extraction capabilities
3. **Long-term**: Implement Azure-compatible automatic extraction

This approach balances immediate user needs with long-term architectural goals while managing development effort and risk.

---

## References

- Migration 429: `server/migrations/429_drop_supabase_entity_extraction_triggers.sql`
- Migration Document: `docs/04-deployment/SUPABASE_TO_AZURE_MIGRATION_COMPLETE.md`
- Service Status: `server/src/services/supabaseService.ts`
- Entity Extraction API: `POST /api/rag/extract-entities/batch`
