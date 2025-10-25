# Beacon 1.1: Program Data Model

## Owner
Backend Team / AI Assistant

## Duration
1-2 days with GitHub Copilot assistance

## Dependencies
None (can start immediately)

## Epic
ADPA v3.0 - Program Management Foundation

## Description
Create PostgreSQL migration for a 'programs' table that groups multiple related projects for portfolio-level management and reporting.

---

## Requirements

### Database Table: programs

**Columns:**
- `id`: UUID PRIMARY KEY (use `gen_random_uuid()`)
- `name`: VARCHAR(255) NOT NULL
- `description`: TEXT (optional)
- `budget`: DECIMAL(15,2) with CHECK constraint (budget >= 0)
- `currency`: VARCHAR(3) DEFAULT 'USD'
- `start_date`: DATE NOT NULL
- `end_date`: DATE NOT NULL
- `status`: VARCHAR(10) NOT NULL DEFAULT 'green'
- `owner_id`: UUID NOT NULL (foreign key to users.id)
- `created_by`: UUID (foreign key to users.id, nullable)
- `created_at`: TIMESTAMP NOT NULL DEFAULT NOW()
- `updated_at`: TIMESTAMP NOT NULL DEFAULT NOW()

**Constraints:**
- CHECK: `budget >= 0`
- CHECK: `end_date >= start_date`
- CHECK: `status IN ('green', 'amber', 'red')`
- FOREIGN KEY: `owner_id` REFERENCES users(id) ON DELETE RESTRICT
- FOREIGN KEY: `created_by` REFERENCES users(id) ON DELETE SET NULL

**Indexes:**
- `idx_programs_owner_id` ON owner_id
- `idx_programs_status` ON status
- `idx_programs_start_date` ON start_date
- `idx_programs_end_date` ON end_date
- `idx_programs_search` (GIN full-text search on name + description)

**Comments:**
- Table: "Programs group related projects for portfolio management"
- status column: "RAG status: green (on track), amber (at risk), red (critical)"

---

### Relationship to Projects Table

**Add Foreign Key Column:**
- Add `program_id UUID` to existing `projects` table
- REFERENCES programs(id) ON DELETE SET NULL
- Create index `idx_projects_program_id` on program_id

**Reasoning:**
- ON DELETE SET NULL: Projects can survive program deletion
- Nullable: Projects can exist without a program (backwards compatibility)

---

## Reference Files

**Study these first:**
- `server/migrations/050_create_projects_table.sql` - Table creation pattern
- `server/migrations/055_add_project_metadata.sql` - ALTER TABLE pattern
- `server/database/schema.sql` - Overall schema design

**Follow these conventions:**
- File naming: `###_description.sql` (3-digit number)
- Comments: Document purpose, author, date
- UP/DOWN: Always include rollback migration
- Constraints: Use named constraints for clarity
- Indexes: Add for foreign keys and query fields

---

## Output Files

1. `server/migrations/090_create_programs_table.sql`
   - UP migration: CREATE TABLE + indexes + foreign key
   - DOWN migration: DROP TABLE + remove column

---

## Testing

**Manual Testing:**
```sql
-- Test migration up
psql $DATABASE_URL -f server/migrations/090_create_programs_table.sql

-- Verify table structure
\d programs

-- Verify projects.program_id added
\d projects

-- Test migration down (rollback)
-- (Append DROP statements, or create separate down script)
```

**Automated Testing (Beacon 1.2):**
- Unit tests will be created in next beacon
- Integration tests will validate constraints

---

## Success Criteria

- [x] Migration file created following existing pattern
- [x] Programs table created with all required columns
- [x] All CHECK constraints enforced
- [x] All indexes created
- [x] program_id added to projects table
- [x] Foreign key relationships established
- [x] Table and column comments added
- [x] DOWN migration included for rollback
- [x] Migration runs without errors
- [x] Rollback works correctly

---

## Time Estimate

**Traditional Development:**
- Research existing patterns: 1 hour
- Write migration SQL: 2-3 hours
- Test migration: 1 hour
- Debug issues: 1-2 hours
- **Total: 5-7 hours** (most of 1 day)

**With GitHub Copilot:**
- Copilot studies patterns: 30 seconds (automatic)
- Generate migration: 1 minute (AI-assisted)
- Review generated code: 5 minutes
- Test migration: 2 minutes
- **Total: 8 minutes** (43x faster!)

---

## Next Beacons

**Dependencies (blocks these):**
- Beacon 1.2: Program CRUD API (needs this table)
- Beacon 1.3: Program-Project Linking (needs this foreign key)
- Beacon 2.1: Program List UI (needs API from 1.2)

**Can run in parallel:**
- Beacon 3.1: Dependencies data model (different table)
- Beacon 6.1: iBabs OAuth (different service)

---

## Notes

This is the foundation for ADPA's multi-project program management capability. Once this migration is complete, we can build the API layer (Beacon 1.2) and UI (Beacon 2.1).

The `status` field uses RAG (Red/Amber/Green) terminology familiar to executives and boards. This will integrate with iBabs board portal reporting.

---

**Status:** Ready for development
**Priority:** HIGH (foundational beacon)
**Assigned:** AI Assistant + Human Review

