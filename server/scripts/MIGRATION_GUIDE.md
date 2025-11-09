# Database Migration Guide

This guide explains how to run database migrations using the Node.js migration runner.

## Quick Start

```bash
cd server

# Run all pending migrations
npm run migrate

# Run a specific migration by number
npm run migrate 058

# Force re-run all migrations (use with caution)
npm run migrate:all
```

## Migration Files

Migrations are located in `server/migrations/` and follow this naming convention:
```
NNN_migration_name.sql
```

Where `NNN` is a 3-digit number (e.g., `058_add_notification_logs.sql`).

## Agent 3 Migrations

Two new migrations were added for the Quality Control Gate enhancements:

### 058_add_notification_logs.sql
**Purpose:** Tracks email notifications sent by the system  
**Tables Created:**
- `notification_logs` - Audit trail for emails

**Run:**
```bash
npm run migrate 058
```

### 059_add_sla_violations.sql
**Purpose:** Tracks SLA threshold violations  
**Tables Created:**
- `sla_violations` - Quality compliance tracking

**Run:**
```bash
npm run migrate 059
```

## Run Both Agent 3 Migrations

```bash
# Option 1: Run all pending migrations (recommended)
cd server
npm run migrate

# Option 2: Run each migration individually
npm run migrate 058
npm run migrate 059
```

## Migration Tracking

The migration runner automatically:
- ✅ Creates a `schema_migrations` table to track executed migrations
- ✅ Skips already-executed migrations
- ✅ Runs migrations in numerical order
- ✅ Stops on first error
- ✅ Provides detailed output

## Verify Migrations

Check if migrations have been applied:

```bash
# Using Node.js
npx tsx scripts/check-migrations.ts

# Using psql
psql $DATABASE_URL -c "SELECT * FROM schema_migrations ORDER BY migration_number DESC LIMIT 10;"
```

## Troubleshooting

### "Cannot find module" error
Install TypeScript execution tool:
```bash
npm install -D tsx
```

### "Connection refused" error
Check your `.env` file has correct `DATABASE_URL`:
```bash
DATABASE_URL=postgresql://user:pass@host:5432/database
```

### "Migration already executed" but need to re-run
Use force flag (⚠️ use with caution):
```bash
npm run migrate:all
```

### Check migration status
```sql
-- See all executed migrations
SELECT * FROM schema_migrations ORDER BY executed_at DESC;

-- Check if specific tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('notification_logs', 'sla_violations');
```

## Migration Best Practices

1. **Always backup** before running migrations in production
2. **Test migrations** in development first
3. **Run migrations** before deploying new code
4. **Never modify** executed migration files
5. **Create rollback** migrations if needed

## Windows Users

The Node.js migration runner works natively on Windows - no need for WSL or psql installation!

```powershell
# PowerShell
cd server
npm run migrate
```

## Example Output

```
🚀 Database Migration Runner

============================================================
🔌 Testing database connection...
✅ Database connected successfully

📋 Setting up migrations tracking...
✅ Migrations tracking ready

📁 Found 59 migration files

⏭️  Skipping 001_initial_schema.sql (already executed)
⏭️  Skipping 002_add_users.sql (already executed)
...

🔄 Running migration: 058_add_notification_logs.sql
✅ Successfully executed: 058_add_notification_logs.sql

🔄 Running migration: 059_add_sla_violations.sql
✅ Successfully executed: 059_add_sla_violations.sql

============================================================
📊 Migration Summary:

✅ Executed: 2
⏭️  Skipped:  57
❌ Failed:   0

🎉 All migrations completed successfully!
```

## Need Help?

- Check `server/migrations/` for all available migrations
- Review `server/.env` for database configuration
- See `AGENT_3_IMPLEMENTATION_SUMMARY.md` for Agent 3 specifics
- Contact the development team for production migrations

