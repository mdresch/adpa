# Migration 208: Tasks Scheduling & WBS Import

This guide explains how to apply the migration that creates the task scheduling system with WBS (Work Breakdown Structure) import capabilities.

## Quick Start

### Option 1: Using npm script (Recommended)

```bash
cd server
npm run migrate:208
```

### Option 2: Direct tsx execution

```bash
cd server
npx tsx scripts/migrate-208.ts
```

## What This Migration Creates

### Tables
1. **`project_tasks`** - Main tasks table with planning and tracking
   - Task planning: estimated_hours, estimated_cost, planned dates
   - Actual tracking: actual_hours, actual_cost, percent_complete
   - Variance: hours_variance, cost_variance
   - Hierarchy: WBS code, task number, parent task relationships

2. **`task_dependencies`** - Task relationships and dependencies
   - Predecessor/successor relationships
   - Dependency types: finish-to-start, start-to-start, etc.
   - Lead/lag timing

3. **`task_assignments`** - Resource scheduling on tasks
   - Planned hours and costs per resource
   - Allocation percentage (part-time assignments)
   - Actual hours/costs aggregated from time entries
   - Assignment status tracking

### Views
1. **`task_summary`** - Complete task information with assignments and variance
2. **`resource_workload`** - Resource capacity and utilization by project
3. **`task_variance_report`** - Task variance analysis and status

### Functions & Triggers
1. **`update_task_assignment_actuals()`** - Updates task assignment actuals when time entries are approved
2. **Triggers** - Automatically maintain consistency when time entries change

### Enhanced Tables
1. **`time_entries`** - Added task linkage and billability tracking
   - `task_assignment_id` - Links time entries to scheduled task assignments
   - `billable_hours` - Billable vs non-billable time tracking

## Database Connection

The script uses your environment variables:

```bash
# Using DATABASE_URL (recommended for cloud databases)
DATABASE_URL=postgresql://user:password@host:port/database npm run migrate:208

# OR using individual parameters
DB_HOST=localhost DB_PORT=5432 DB_NAME=adpa_db DB_USER=postgres DB_PASSWORD=password npm run migrate:208
```

## What Happens During Migration

1. **Connection Test** - Verifies database connectivity
2. **SQL Execution** - Executes all migration statements from the file
3. **Verification** - Checks that all tables and views were created successfully
4. **Statistics** - Shows row counts in created tables

## Sample Output

```
╔════════════════════════════════════════════════════════════════╗
║  Migration 208: Tasks Scheduling & WBS Import                  ║
║  Applying to database...                                        ║
╚════════════════════════════════════════════════════════════════╝

📦 Using DATABASE_URL for connection
🔌 Testing database connection...
✅ Database connection successful
📁 Migration file: /path/to/208_tasks_scheduling_wbs_import.sql
📄 Migration file size: 22541 bytes
⏳ Executing migration...
📋 Found 45 SQL statements

[1/45] Executing statement...
  Preview: CREATE EXTENSION IF NOT EXISTS pgcrypto;
  ✅ Statement executed successfully

... (more statements) ...

✅ Migration completed!
   Executed: 42 statements
   Skipped: 3 statements (already exist)
   Total: 45 statements processed

🔍 Verifying migration...
   ✅ project_tasks table exists
   ✅ task_assignments table exists
   ✅ task_summary view exists

📊 Migration Statistics:
   project_tasks: 0 rows
   task_assignments: 0 rows

✅ Migration verified successfully!

✨ All done! The migration has been successfully applied.
```

## Troubleshooting

### Connection Timeout
If you get a connection timeout error, check:
1. Database is running and accessible
2. Host, port, credentials are correct
3. Firewall isn't blocking the connection
4. If using Supabase, you may need to use the connection pooler (port 6543)

### Migration Already Exists
If you see errors about objects already existing, this is normal. The migration uses `CREATE TABLE IF NOT EXISTS` and similar idempotent statements. The script will skip these and continue.

### Partial Migration
If the migration fails partway through:
1. Check the error message carefully
2. Review the migration SQL file manually to see what failed
3. Fix the issue in your database if needed
4. Re-run the migration script (it will skip already-created objects)

## After Migration

### Test the Setup

```bash
# Test from psql
psql $DATABASE_URL -c "SELECT * FROM task_summary;"
psql $DATABASE_URL -c "SELECT * FROM resource_workload;"
psql $DATABASE_URL -c "SELECT * FROM project_tasks LIMIT 5;"
```

### Start Using the API

The API endpoints are now available:

```bash
# Get tasks for a project
curl http://localhost:5000/api/tasks/project/{projectId}

# Get task by ID
curl http://localhost:5000/api/tasks/{taskId}

# Get task cost breakdown
curl http://localhost:5000/api/tasks/{taskId}/cost
```

### Next Steps

1. **Seed test data** (optional)
   ```bash
   npm run seed:financial
   ```

2. **Run the backend**
   ```bash
   npm run dev
   ```

3. **Start the frontend**
   ```bash
   cd ..
   pnpm dev
   ```

## Migration Details

**Migration File**: `server/migrations/208_tasks_scheduling_wbs_import.sql`  
**Script**: `server/scripts/migrate-208.ts`  
**Execution Time**: 2-10 seconds (depending on database size)  
**Reversible**: No (migration is one-way)

## Support

If you encounter issues:
1. Check the error message and logs above
2. Review the migration SQL file directly
3. Check database logs: `psql $DATABASE_URL -c "SHOW pg_log_directory;"`
4. Try running a single statement manually from the SQL file to isolate the issue
