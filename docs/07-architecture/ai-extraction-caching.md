he chec# AI Extraction Caching System

## Overview

The AI extraction feature now includes an **intelligent caching layer** that dramatically reduces API calls to AI providers and improves extraction performance.

## How It Works

### Cache Key Strategy

Each AI extraction request generates a unique cache key:

```
ai:extraction:{projectId}:{contentHash}:{entityType}:{provider}:{model}
```

**Components:**
- `projectId`: Project UUID
- `contentHash`: SHA-256 hash of combined document content (first 16 chars)
- `entityType`: stakeholders, requirements, risks, etc.
- `provider`: openai, google, mistral, etc.
- `model`: gpt-4, gemini-pro, etc.

### Cache Behavior

```typescript
// First extraction (cache miss):
extractSingleEntityType('stakeholders')
  → ❌ Cache miss
  → 🤖 Call AI API (~30s, costs $$)
  → 💾 Store in Redis (TTL: 7 days)
  → ✅ Return 85 entities

// Second extraction on SAME documents (cache hit):
extractSingleEntityType('stakeholders')
  → ✅ Cache HIT
  → ⚡ Return from Redis (~50ms, FREE)
  → ✅ Return 85 entities
```

## Performance Impact

### Without Caching (Before)
- **First extraction:** 13 AI calls × 30s = **~6 minutes**
- **Second extraction:** 13 AI calls × 30s = **~6 minutes**
- **Cost:** $$$ for each extraction

### With Caching (After)
- **First extraction:** 13 AI calls × 30s = **~6 minutes** (same)
- **Second extraction:** 13 cache hits × 50ms = **<1 second** ⚡
- **Cost:** $$$ first time, **FREE** thereafter

### Cost Savings Example

Assuming:
- 10 extraction runs per day
- 13 entity types per extraction
- $0.01 per AI call average

**Without caching:**
```
130 AI calls/day × $0.01 = $1.30/day
$1.30 × 365 days = $474.50/year
```

**With caching (90% cache hit rate):**
```
13 AI calls/day × $0.01 = $0.13/day
$0.13 × 365 days = $47.45/year

SAVINGS: $427.05/year (90% reduction)
```

## Cache Invalidation

Cache is automatically invalidated when:

1. **TTL expires** (7 days by default)
2. **Manual invalidation:**
   ```typescript
   await aiCacheService.invalidateProject(projectId)
   ```
3. **Documents change** (different content hash)

## Monitoring

### Logs

**Cache HIT:**
```
[AI-CACHE] ✅ Cache HIT for stakeholders
  projectId: xxx
  entityType: stakeholders
  cachedCount: 85
```

**Cache MISS:**
```
[AI-CACHE] ❌ Cache MISS for stakeholders
  projectId: xxx
  entityType: stakeholders

[EXTRACTION-STAKEHOLDERS] ❌ Cache miss, calling AI...
[AI-CACHE] 💾 Cached 85 entities for future use
```

### Statistics API

```typescript
const stats = await aiCacheService.getStats(projectId)
// Returns:
// {
//   totalCached: 13,
//   cacheKeys: ['ai:extraction:...', ...]
// }
```

## Configuration

### TTL (Time To Live)

Default: **7 days** (604,800 seconds)

**Rationale:**
- Project documents are relatively stable
- 7 days allows re-extractions within a week to be free
- Long enough for development/testing cycles

**Custom TTL:**
```typescript
await aiCacheService.set(
  projectId,
  documentContext,
  entityType,
  entities,
  aiProvider,
  aiModel,
  3600 // 1 hour custom TTL
)
```

### Cache Storage

- **Technology:** Redis
- **Namespace:** `ai:extraction:*`
- **Data Format:** JSON string
- **Max Size:** Determined by Redis configuration

## Benefits

### 1. Cost Reduction
- ✅ 90%+ reduction in AI API costs
- ✅ Free re-extractions within TTL period

### 2. Performance
- ✅ Sub-second response for cached entities
- ✅ Faster development/testing cycles

### 3. Resilience
- ✅ Works during AI provider outages (cached data available)
- ✅ Protects against rate limits (use cache instead)

### 4. Developer Experience
- ✅ Instant re-runs during development
- ✅ No waiting for AI on cached data

## Use Cases

### Development & Testing
```
Run 1: Full extraction (13 AI calls, 6 mins, $$$)
Run 2-N: All cached (instant, FREE)
```

### Production Re-runs
```
Morning: Full extraction
Afternoon: Need to re-check → All cached
Next day: Still cached
Week later: Cache expires, full extraction
```

### Document Updates
```
Add new document → Content hash changes → Cache miss
Edit existing document → Content hash changes → Cache miss
Same documents → Content hash same → Cache hit
```

## Cache Key Examples

```
ai:extraction:b9a459aa-...:a3f2c8d9e4b1a5c7:stakeholders:google:gemini-pro
ai:extraction:b9a459aa-...:a3f2c8d9e4b1a5c7:requirements:google:gemini-pro
ai:extraction:b9a459aa-...:a3f2c8d9e4b1a5c7:risks:google:gemini-pro
```

**Notice:** Same `contentHash` (a3f2c8d9e4b1a5c7) = same documents

## API Usage

### Automatic (Default)

Caching is **automatic** - no code changes needed:

```typescript
// Just call extraction normally
const entities = await projectDataExtractionService.extractSingleEntityType(
  projectId,
  userId,
  'stakeholders',
  { aiProvider: 'google', aiModel: 'gemini-pro' }
)
// Caching happens transparently
```

### Manual Cache Management

```typescript
// Check cache stats
const stats = await aiCacheService.getStats(projectId)
console.log(`Cached entries: ${stats.totalCached}`)

// Invalidate cache
await aiCacheService.invalidateProject(projectId)

// Warm cache (check what's cached)
await aiCacheService.warmCache(projectId, documentContext, entityTypes)
```

## Troubleshooting

### Cache Not Working?

1. **Check Redis connection:**
   ```
   redis-cli ping
   ```

2. **Check logs for cache errors:**
   ```
   grep "AI-CACHE" server/logs/combined.log
   ```

3. **Verify cache keys exist:**
   ```
   redis-cli KEYS "ai:extraction:*"
   ```

### Clear All Cache

```bash
redis-cli DEL "ai:extraction:*"
```

Or programmatically:
```typescript
await aiCacheService.invalidateProject(projectId)
```

## Future Enhancements

1. **Partial cache hits:** Cache document-level results, recombine
2. **Compression:** Compress large entity lists in Redis
3. **Multi-tier cache:** Memory (LRU) + Redis
4. **Cache warming:** Pre-populate cache for common extractions
5. **Analytics:** Track cache hit rates, cost savings

---

**Status:** ✅ Implemented and production-ready  
**Version:** 1.0.0  
**Date:** October 30, 2025

