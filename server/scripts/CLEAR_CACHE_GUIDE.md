# Clear AI Extraction Cache Guide

## Problem Solved

When AI extraction jobs fail due to:
1. **Database constraint violations** (e.g., null values, field length exceeded)
2. **Invalid data format** that was cached
3. **Corrupted extraction results**

The failed data gets cached in Redis and will be reused on retry, causing **infinite failure loops**.

## Solution

Use the cache clearing script to force fresh extraction from AI providers.

---

## Quick Usage

### Clear ALL entity types for a project
```bash
cd server
npm run clear-extraction-cache <projectId> all
```

### Clear specific entity types
```bash
npm run clear-extraction-cache <projectId> phases stakeholders
```

### Example (with actual project ID from your logs)
```bash
npm run clear-extraction-cache d5396430-afde-466d-8240-9ff98e4cb419 phases stakeholders
```

---

## Available Entity Types

- `stakeholders` - Project stakeholders
- `requirements` - Requirements and acceptance criteria
- `risks` - Risk register entries
- `milestones` - Project milestones
- `phases` - Project phases and stages
- `constraints` - Project constraints
- `best_practices` - Best practice recommendations
- `deliverables` - Project deliverables
- `scope_items` - Scope items and boundaries
- `activities` - Project activities and tasks
- `success_criteria` - Success criteria and KPIs
- `resources` - Resource requirements
- `quality_standards` - Quality standards and metrics

---

## Common Scenarios

### Scenario 1: Phase extraction failing with "null value in start_date"
**Before fix**: Cache contained phases without `start_date`
```bash
# Clear the bad cache
npm run clear-extraction-cache d5396430-afde-466d-8240-9ff98e4cb419 phases

# Retry extraction (will use fixed code with defaulting)
```

### Scenario 2: Stakeholder extraction failing with "value too long"
**Before fix**: Cache contained stakeholder roles > 100 characters
```bash
# Clear the bad cache
npm run clear-extraction-cache d5396430-afde-466d-8240-9ff98e4cb419 stakeholders

# Retry extraction (will use fixed code with truncation)
```

### Scenario 3: Multiple entity types failing
```bash
# Clear all problematic types at once
npm run clear-extraction-cache d5396430-afde-466d-8240-9ff98e4cb419 phases stakeholders risks milestones

# Or clear everything
npm run clear-extraction-cache d5396430-afde-466d-8240-9ff98e4cb419 all
```

---

## What Happens After Clearing Cache?

1. ✅ **Cache entries deleted** - Bad data removed from Redis
2. 🔄 **Next extraction job** - Will call AI providers (not use cache)
3. 💾 **Fresh data cached** - New results stored with correct formatting
4. ⚡ **Subsequent requests** - Will use the new cached data (fast)

---

## Cache Key Pattern

The script searches for keys matching:
```
ai:extraction:<projectId>:<entityType>:*
```

Example:
```
ai:extraction:d5396430-afde-466d-8240-9ff98e4cb419:phases:sha256-hash
ai:extraction:d5396430-afde-466d-8240-9ff98e4cb419:stakeholders:sha256-hash
```

---

## Troubleshooting

### Script fails to connect to Redis
```bash
# Check Redis is running
redis-cli ping
# Expected: PONG

# Check environment variables in server/.env
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Invalid project ID error
```
❌ Invalid project ID format: abc123
   Expected a UUID (e.g., d5396430-afde-466d-8240-9ff98e4cb419)
```
**Solution**: Use the full UUID from your logs or database.

### Invalid entity type error
```
❌ Invalid entity types: phase, stakeholder
```
**Solution**: Use correct entity type names (plural form):
- ✅ `phases` (not `phase`)
- ✅ `stakeholders` (not `stakeholder`)

---

## Additional Notes

### Cache TTL
- Default TTL: **7 days** (604,800 seconds)
- After TTL expires, cache is automatically cleared
- Manual clearing is faster than waiting for TTL

### API Cost Impact
- Clearing cache = next extraction calls AI providers
- **Cost**: ~$0.075 per 1M input tokens (Google Gemini)
- **Benefit**: Correct data + future cache hits save money

### When NOT to Clear Cache
- ✅ **Don't clear** if extraction succeeded and data is correct
- ✅ **Don't clear** frequently (wastes API quota)
- ❌ **Do clear** after code fixes for data validation issues
- ❌ **Do clear** when seeing repeated failures with same error

---

## See Also

- [JOB_MONITOR_QUICK_START.md](../../docs/roadmap/JOB_MONITOR_QUICK_START.md) - Monitor extraction jobs in UI
- [BEGINNER_GUIDE_BROWSER_CONSOLE.md](../../BEGINNER_GUIDE_BROWSER_CONSOLE.md) - Browser console debugging
- AI Analytics Dashboard: http://localhost:3000/ai-analytics

