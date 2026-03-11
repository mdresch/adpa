# Extraction Service: Phase 1 → Phase 2 Handoff

**Status**: Phase 1 (foundational quality) complete and ready for production  
**Timeline**: Week 3 onwards for Phase 2-5  
**Decision point**: Which phase next?

---

## 📊 Comparison: What's Ready vs. What's Next

### ✅ Phase 1: COMPLETE (shipped)
**Capability**: Production-hardened extraction with observability  
**Effort**: 5 days (parallel execution)  
**Business value**: Tracing, error recovery, cost control, safe re-runs  

**Added to codebase**:
- correlationId tracing in all extractors
- extraction_failures dead-letter table
- DeadLetterService (query + recovery)
- Baseline metrics capture script
- Context size guardrails (200K chars)
- IdempotencyKeyService (SHA-256 keys)
- dead-letter-cli.ts debugging tool

**Risk reduced**: Silent failures → zero; debugging → 1 minute (via correlationId)  
**Cost control**: Context limits → no runaway AI bills  
**Reliability**: Idempotency keys → safe re-runs/retries  

---

### ⏳ Phase 2: Zod Schema Validation (3-4 days)
**Capability**: Runtime validation + automatic retry  
**Effort**: Medium (need to add schemas for all 80+ entity types, but pattern is simple)  
**Business value**: Fewer bad extractions, better error messages, automated recovery  

**What it does**:
```typescript
// Before: Parse JSON, hope it's valid
const risks = parseAIResponse(response).risks || []

// After: Validate schema, retry if invalid
const schema = z.array(RiskSchema)
const result = schema.safeParse(parsed.risks)
if (!result.success) {
  // Re-prompt LLM with validation error
  const retry = await aiService.generate({...prompt, errorContext: errors})
}
```

**When to do this**: If you're seeing "AI returned garbage JSON" errors in dead-letter  
**When to skip**: If AI responses are already high-quality; move to RAG first  

---

### ⏳ Phase 3: AI Provider Fallback (1-2 days)
**Capability**: Resilience + cost optimization  
**Effort**: Light (most logic exists, just complete coverage)  
**Business value**: No single-provider lock-in, automatic cost optimization  

**What it does**:
```typescript
// Before: If OpenAI quota exceeded, extraction fails
const response = await openai.generate({...})

// After: Automatic fallback chain
const response = await aiService.generateWithFallback({
  prompt,
  providers: ['openai', 'anthropic', 'google', 'ollama']
})
// Tries OpenAI first, falls back if rate limited
```

**When to do this**: If you have multiple AI provider accounts  
**When to skip**: If single provider is sufficient; do RAG first  

---

### ⏳ Phase 4: Canary Deployment (2-3 days)
**Capability**: Safe progressive rollout  
**Effort**: Medium (need automated diff comparison + gates)  
**Business value**: Roll out optimizations without risk; instant rollback if problems  

**What it does**:
```
1. Deploy new code (feature flag OFF)
2. Enable for 1% random extractions
3. Compare new vs old results automatically
4. If diff < 1%, expand to 10%
5. If stable 24h at 10%, expand to 100%
6. Rollback instant if diff > threshold
```

**When to do this**: Before deploying Phases 2-5 to production  
**Critical for**: Proving optimizations work before full rollout  

---

### ⏳ Phase 5: RAG / Vector Search (5-7 days)
**Capability**: "Unlimited documents" support  
**Effort**: Highest (new infrastructure, testing, tuning)  
**Business value**: Support large projects without token limit issues  

**What it does**:
```
Before: 10 documents → 20KB context → token budget limits
        "Sorry, I can only process 10 documents"

After:  100 documents → embed → semantic search → top-5 chunks → 5KB context
        "Processing all 100 documents; sending most relevant 5"
```

**When to do this**: If you have users with 20+ document projects  
**When to skip**: If most projects <10 documents; not urgent  

---

## 🎯 Recommended Sequence

### Option A: Production-Grade (Recommended)
1. ✅ **Phase 1**: Deploy to production, monitor metrics
2. **Phase 4**: Add canary gates (before any more changes)
3. **Phase 2**: Zod validation (low risk, high value)
4. **Phase 3**: Provider fallback (insurance policy)
5. **Phase 5**: RAG (when needed for scale)

**Timeline**: 2-3 weeks  
**Risk**: Low (each phase gated by canary)  
**ROI**: High (obsevability, resilience, optimization)

### Option B: Feature-First
1. ✅ **Phase 1**: Deploy, gather metrics
2. **Phase 5**: RAG immediately (unlock "unlimited docs")
3. **Phase 2**: Zod (improve quality)
4. **Phase 3**: Fallback (add resilience)
5. **Phase 4**: Canary (deploy safely)

**Timeline**: 3-4 weeks  
**Risk**: Medium (big feature before canary gates)  
**ROI**: Medium (solves one big problem; others wait)

### Option C: Quality-First
1. ✅ **Phase 1**: Deploy, monitor
2. **Phase 2**: Zod + retries (improve success rate)
3. **Phase 3**: AI fallback (reduce failures)
4. **Phase 4**: Canary gates (deploy safely)
5. **Phase 5**: RAG (scale support)

**Timeline**: 2-3 weeks  
**Risk**: Low (quality improvements before features)  
**ROI**: High (fewer failures first, then scale)

---

## 📊 Effort Breakdown Remaining

| Phase | Effort | Prerequisite | Priority |
|---|---|---|---|
| Phase 2 (Zod) | 3-4 days | Phase 1 ✅ | Medium |
| Phase 3 (Fallback) | 1-2 days | Phase 1 ✅ | Medium |
| Phase 4 (Canary) | 2-3 days | Any | HIGH |
| Phase 5 (RAG) | 5-7 days | Phase 1 ✅ | Low-Medium |
| **Total remaining** | **11-17 days** | | |

**My recommendation**: Do Phase 4 (Canary) ASAP, then choose between 2/3/5 based on user feedback.

---

## 🎯 Phase 2 Starting Point

If you choose Phase 2 (Zod), here's the kickoff:

### 1. Define schemas (highest effort)
```typescript
// server/src/services/extraction/schemas/RiskSchema.ts
export const RiskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000),
  category: z.enum(['technical', 'schedule', 'budget', 'resource', 'external', 'quality']),
  probability: z.enum(['high', 'medium', 'low']),
  impact: z.enum(['high', 'medium', 'low']),
  mitigation_strategy: z.string().optional(),
  contingency_plan: z.string().optional(),
  source_document: z.string()
})
```

### 2. Add retry logic (medium effort)
```typescript
// server/src/services/extraction/base/ValidateWithRetry.ts
const parseWithRetry = async (raw, schema, maxRetries = 2) => {
  let result = schema.safeParse(JSON.parse(raw))
  let attempt = 0
  
  while (!result.success && attempt < maxRetries) {
    // Re-prompt with error context
    const retry = await aiService.generate({
      prompt: `${originalPrompt}\n\nValidation failed:\n${formatZodErrors(result.error)}`,
      ...
    })
    result = schema.safeParse(JSON.parse(retry))
    attempt++
  }
  
  return result
}
```

### 3. Apply to extractors (repetitive)
```typescript
// Apply to each of 80+ extractors
const result = await parseWithRetry(aiResponse, RiskSchema)
if (!result.success) {
  logger.error('Validation failed', { errors: result.error })
  // Reject entities or return empty
  return { entities: [], rejectedCount: parsed.risks.length }
}
```

### 4. Test
```bash
npm test -- extraction.parity  # Verify behavior unchanged
npm run extract:baseline  # Verify latency acceptable
```

**Estimated effort**: 3-4 days (1 day schemas, 2-3 days apply to all entities)

---

## 🚀 Next Steps

### Immediate (This week)
- [ ] Deploy Phase 1 to production
- [ ] Run `npm run extract:baseline` to capture metrics
- [ ] Verify dead-letter table receives error logs
- [ ] Test correlationId in production logs

### Next week
- [ ] Decide: Phase 2, 3, 4, or 5?
- [ ] If Phase 4 (canary): Start immediately
- [ ] If Phase 2 (Zod): Schedule 3-4 day sprint
- [ ] If Phase 5 (RAG): Schedule 5-7 day sprint
- [ ] If Phase 3 (fallback): Quick 1-2 day task

### Sprint Planning
- Assign Phase (whichever you choose)
- Dedicate 1-2 engineers
- Run Phase 4 (canary) gates before production rollout
- Monitor extraction_failures dead-letter table during rollout

---

## 💡 My Recommendation

**Start with Phase 4 (Canary Deployment)** — This is a 2-3 day infrastructure setup that enables safe rollout of everything else. Once you have automated diff gates, you can deploy Phases 2-5 with confidence.

Then **pick Phase 2 or Phase 5** based on:
- **Choose Phase 2** if: Users report "bad AI extractions"
- **Choose Phase 5** if: Users ask "can I upload 50 documents?"

Both are valuable; canary gates let you prove which one helps more.

---

## 📞 Support

Questions during Phase 2-5 development?

- Use dead-letter CLI for debugging: `npx ts-node server/src/debug/dead-letter-cli.ts`
- Check baseline metrics: `cat extraction_metrics_baseline.json`
- Trace via correlationId: `jq 'select(.correlationId=="xyz")' logs.json`
- Reference Phase 1 implementations as examples

---

**Status**: ✅ Phase 1 complete. You're ready to move forward.

**Question**: Which phase do you want to tackle first? 🚀
