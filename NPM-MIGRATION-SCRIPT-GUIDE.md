# NPM Migration Script Setup
## Migration 230: Semantic Search and Knowledge Base Optimization

### What Was Added

#### 1. Migration Runner Script
**File**: `server/scripts/migrate-230.js`
**Size**: 200+ lines
**Purpose**: Automated database migration runner with validation and health checks

**Features**:
- Reads SQL migration file automatically
- Connects to PostgreSQL/Supabase database
- Executes migration with transaction support
- Validates migration success
- Provides detailed before/after status
- Beautiful colored CLI output
- Error handling with troubleshooting hints
- Checks if migration already applied (idempotent)

#### 2. NPM Scripts Added to `package.json`

```json
{
  "scripts": {
    "migrate:230": "node scripts/migrate-230.js",
    "semantic-search:init": "node scripts/semantic-search-init.js",
    "semantic-search:generate": "node scripts/generate-embeddings.ts",
    "semantic-search:test": "ts-node -r tsconfig-paths/register scripts/test-semantic-search.ts"
  }
}
```

---

## Usage

### Run Migration 230

```bash
cd server
npm run migrate:230
```

**Output Example:**
```
[2026-03-03T10:30:00.000Z] [MIGRATE-230] ℹ Starting migration 230...
[2026-03-03T10:30:01.000Z] [MIGRATE-230] ℹ Reading migration file: /path/to/migrations/230_semantic_search_and_knowledge_base_optimization.sql
[2026-03-03T10:30:01.100Z] [MIGRATE-230] ℹ Migration file loaded (9532 bytes)
[2026-03-03T10:30:01.200Z] [MIGRATE-230] ℹ Connecting to database...
[2026-03-03T10:30:02.000Z] [MIGRATE-230] ✓ Database connection established
[2026-03-03T10:30:02.100Z] [MIGRATE-230] ℹ Checking if migration already applied...
[2026-03-03T10:30:02.800Z] [MIGRATE-230] ℹ Executing migration SQL...
[2026-03-03T10:30:02.900Z] [MIGRATE-230] ⚠ This may take a few seconds...
[2026-03-03T10:30:04.200Z] [MIGRATE-230] ✓ Migration completed successfully in 1.40s
[2026-03-03T10:30:04.300Z] [MIGRATE-230] ℹ Verifying migration...
[2026-03-03T10:30:04.500Z] [MIGRATE-230] ✓ All new columns created (embedding, embedding_generated_at, embedding_model, semantic_keywords)
[2026-03-03T10:30:04.600Z] [MIGRATE-230] ✓ New table knowledge_base_entry_relationships created
[2026-03-03T10:30:04.700Z] [MIGRATE-230] ✓ Found 2 embedding indexes
[2026-03-03T10:30:04.800Z] [MIGRATE-230] ✓ Knowledge base: 10 entries (0 with embeddings)

═══════════════════════════════════════════════════════════════════════
[2026-03-03T10:30:04.900Z] [MIGRATE-230] ✓ Migration 230 completed successfully!
═══════════════════════════════════════════════════════════════════════

[2026-03-03T10:30:05.000Z] [MIGRATE-230] ℹ Next steps:
[2026-03-03T10:30:05.100Z] [MIGRATE-230] ℹ 1. Verify environment variable: export VOYAGE_API_KEY=<your-key>
[2026-03-03T10:30:05.200Z] [MIGRATE-230] ℹ 2. Start server: npm run dev
[2026-03-03T10:30:05.300Z] [MIGRATE-230] ℹ 3. Generate embeddings: npm run semantic-search:generate
[2026-03-03T10:30:05.400Z] [MIGRATE-230] ℹ 4. Test: npm run semantic-search:test
```

---

### Environment Variables Required

```bash
# In server/.env or export before running:

# Database connection
DB_HOST=your-supabase-host.supabase.co
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your-password
DB_NAME=postgres
DB_SSL=true  # Set to true for Supabase

# Voyage API key
VOYAGE_API_KEY=your-voyage-api-key
```

**Verify before running:**
```bash
echo "DB_HOST: $DB_HOST"
echo "DB_USER: $DB_USER"
echo "VOYAGE_API_KEY: ${VOYAGE_API_KEY:0:10}..."  # Show first 10 chars
```

---

### What the Script Does

#### Step 1: File Loading
✓ Reads migration SQL file from `migrations/230_semantic_search_and_knowledge_base_optimization.sql`

#### Step 2: Database Connection
✓ Connects to PostgreSQL/Supabase using environment variables

#### Step 3: Idempotent Check
✓ Checks if migration already applied (safe to run multiple times)

#### Step 4: Execution
✓ Executes full migration SQL with:
- Vector column creation
- Table creation
- Index creation
- Seed data insertion
- Trigger creation

#### Step 5: Verification
✓ Validates all components created:
- 4 new columns on `knowledge_base_entries`
- 1 new table `knowledge_base_entry_relationships`
- Embedding indexes created
- 10 KB entries inserted

#### Step 6: Status Report
✓ Shows final state:
- Total KB entries
- Successfully embedded entries
- Next steps

---

## Migration Status Queries

### Check if Migration Applied
```bash
npm run migrate:230
# If already applied, output shows: "Migration 230 already applied! Skipping..."
```

### Check KB Entry Status
```bash
psql -h $DB_HOST -U $DB_USER -d $DB_NAME << 'SQL'
  SELECT COUNT(*) as total, 
         SUM(CASE WHEN embedding IS NOT NULL THEN 1 ELSE 0 END) as with_embeddings
  FROM knowledge_base_entries;
SQL

# Output: (10, 0) -- 10 total entries, 0 with embeddings yet
# After generation: (10, 10) -- all embedded
```

### Check Indexes
```bash
psql -h $DB_HOST -U $DB_USER -d $DB_NAME << 'SQL'
  SELECT indexname FROM pg_indexes 
  WHERE tablename = 'knowledge_base_entries' 
  AND indexname LIKE '%embedding%';
SQL

# Should show 2 indexes:
# idx_kb_entries_embedding
# idx_kb_entries_semantic_keywords
```

---

## Troubleshooting

### Error: "Migration file is empty"
```bash
# Check migration file exists
ls -la server/migrations/230_*.sql

# Should show the file with content
```

### Error: "Database connection failed"
```bash
# Verify environment variables
env | grep -i db_

# Test connection manually
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT version();"
```

### Error: "pgvector extension not available"
```bash
# The migration handles this gracefully
# But if needed, manually enable:
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

---

## Related NPM Scripts

After successful migration, use these scripts:

### Initialize Semantic Search (Generate Embeddings)
```bash
npm run semantic-search:init

# Or directly generate embeddings
npm run semantic-search:generate
```

### Test Semantic Search
```bash
npm run semantic-search:test
```

### Check Database Health
```bash
npm run check-db
```

---

## Full Deployment Sequence

```bash
# 1. Navigate to server directory
cd server

# 2. Export environment variables
export DB_HOST=your-host
export DB_USER=postgres
export DB_PASSWORD=your-password
export DB_NAME=your-db
export DB_SSL=true
export VOYAGE_API_KEY=your-key

# 3. Run migration
npm run migrate:230

# Expected: "Migration 230 completed successfully!"

# 4. Verify migration
psql -h $DB_HOST -U $DB_USER -d $DB_NAME \
  -c "SELECT COUNT(*) FROM knowledge_base_entries;"

# Expected output: 10

# 5. Start server
npm run dev

# 6. Generate embeddings (in another terminal)
npm run semantic-search:init

# 7. Test semantic search
curl -X GET http://localhost:5000/api/admin/semantic-search/status \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## Advanced Options

### Force Re-run Migration
Despite idempotent check, to force re-run:
```bash
# Edit migration file or backup data first
# The script will detect and skip if already applied
# To force: manually drop columns and re-run

psql -h $DB_HOST -U $DB_USER -d $DB_NAME << 'SQL'
  ALTER TABLE knowledge_base_entries 
  DROP COLUMN embedding CASCADE,
  DROP COLUMN embedding_model,
  DROP COLUMN embedding_generated_at,
  DROP COLUMN semantic_keywords;
  
  DROP TABLE IF EXISTS knowledge_base_entry_relationships CASCADE;
SQL

# Then run migration again
npm run migrate:230
```

### Manual Execution
If npm script fails, run manually:
```bash
cd server
node scripts/migrate-230.js
```

---

## Success Criteria

✅ Migration successful when:
- Script exits with code 0
- Output shows "Migration 230 completed successfully!"
- Database shows 10 KB entries
- All new columns exist
- No errors in output

---

## Next Steps After Migration

1. **Verify environment** - VOYAGE_API_KEY is set
2. **Start server** - `npm run dev`
3. **Generate embeddings** - `npm run semantic-search:init`
4. **Test semantic search** - Query endpoints return relevance_score 0.6-0.95
5. **Monitor** - Check logs for any embedding generation issues

---

**Quick Summary:**
- Migration script: `server/scripts/migrate-230.js` (200+ lines)
- NPM command: `npm run migrate:230`
- Execution time: ~2-5 seconds
- Database updated: PostgreSQL/Supabase
- Idempotent: Safe to run multiple times
- Validation: Built-in health checks
- Next: Generate embeddings with `npm run semantic-search:init`
