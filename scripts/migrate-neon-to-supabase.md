# Migrate All Data from Neon to Supabase
**Preserve All Templates, Documents, and Compliance Data**

---

## 🚨 **CRITICAL: Your Data Needs Migration**

You have valuable data in Neon:
- Templates (100+ templates with compliance reviews)
- Documents (generated documents, uploaded files)
- Projects (with metadata, settings)
- Stakeholders
- AI provider configurations
- Analytics data
- Audit logs

**This data MUST be migrated to Supabase!**

---

## ⏰ **Check Neon Quota Reset Date**

1. Go to: https://console.neon.tech
2. Select your project: ep-royal-morning-a9j6aaq0-pooler
3. Go to **Usage** tab
4. Check **"Next reset date"**

**If reset is within 1-3 days:** WAIT and export immediately when quota resets
**If reset is weeks away:** Contact Neon support for emergency data export

---

## 📦 **Migration Method 1: Full Database Dump (When Quota Allows)**

### Step 1: Export from Neon (When Quota Resets)

**IMMEDIATELY when quota resets, run:**

```powershell
# Set Neon connection string temporarily
$NEON_URL = "postgresql://neondb_owner:YOUR_NEON_PASSWORD@ep-royal-morning-a9j6aaq0-pooler.gwc.azure.neon.tech:5432/neondb_owner?sslmode=require"

# Export complete database
pg_dump "$NEON_URL" `
  --no-owner `
  --no-privileges `
  --clean `
  --if-exists `
  --file=neon-full-backup-$(Get-Date -Format 'yyyyMMdd').sql

# Should create: neon-full-backup-20251020.sql
```

**This exports:**
- ✅ All table schemas
- ✅ All data (users, projects, documents, templates)
- ✅ All relationships
- ✅ All indexes

### Step 2: Import to Supabase

```powershell
# Import to Supabase
$SUPABASE_URL = "postgresql://postgres:QueIQ4Klopman$@db.blxzjbxczpmmgiwbtmdo.supabase.co:5432/postgres"

psql "$SUPABASE_URL" -f neon-full-backup-20251020.sql

# Or using Node.js
node scripts/import-neon-backup.js neon-full-backup-20251020.sql
```

---

## 📦 **Migration Method 2: Selective Table Export**

**Export specific tables (when quota allows):**

```powershell
$NEON_URL = "postgresql://neondb_owner:...@ep-royal-morning-a9j6aaq0-pooler.gwc.azure.neon.tech:5432/neondb_owner?sslmode=require"

# Export templates (most critical!)
pg_dump "$NEON_URL" --table=templates --data-only > templates-data.sql

# Export documents
pg_dump "$NEON_URL" --table=documents --data-only > documents-data.sql

# Export projects
pg_dump "$NEON_URL" --table=projects --data-only > projects-data.sql

# Export users
pg_dump "$NEON_URL" --table=users --data-only > users-data.sql

# Export stakeholders
pg_dump "$NEON_URL" --table=stakeholders --data-only > stakeholders-data.sql

# Export AI providers
pg_dump "$NEON_URL" --table=ai_providers --data-only > ai-providers-data.sql
```

**Then import to Supabase:**

```powershell
$SUPABASE_URL = "postgresql://postgres:QueIQ4Klopman$@db.blxzjbxczpmmgiwbtmdo.supabase.co:5432/postgres"

psql "$SUPABASE_URL" -f templates-data.sql
psql "$SUPABASE_URL" -f documents-data.sql
psql "$SUPABASE_URL" -f projects-data.sql
psql "$SUPABASE_URL" -f users-data.sql
psql "$SUPABASE_URL" -f stakeholders-data.sql
psql "$SUPABASE_URL" -f ai-providers-data.sql
```

---

## 📦 **Migration Method 3: Emergency Data Extract (If Quota Won't Reset Soon)**

### Contact Neon Support

1. Go to: https://neon.tech/docs/introduction/support
2. Open support ticket: "Emergency data export request - quota exceeded"
3. Request: Database dump file via secure download link
4. They typically respond within 24 hours for data access issues

### Alternative: Use Neon CLI (May work even over quota)

```powershell
# Install Neon CLI
npm install -g neonctl

# Login
neonctl auth

# List branches
neonctl branches list --project-id YOUR_PROJECT_ID

# Export using CLI (may bypass quota for exports)
neonctl connection-string --project-id YOUR_PROJECT_ID | pg_dump > neon-backup.sql
```

---

## 📦 **Migration Method 4: Read-Only Access via Neon Console**

Sometimes Neon allows read-only access even over quota:

1. Go to: https://console.neon.tech
2. Select project
3. SQL Editor
4. Try running: `SELECT * FROM templates LIMIT 10`
5. If it works, export via SQL Editor (copy/paste for small datasets)

---

## 🛡️ **Data Preservation Priority**

### Critical Data (MUST migrate):
1. **Templates** (100+ templates, compliance-reviewed)
2. **Documents** (generated docs, uploaded files)
3. **Projects** (with metadata, settings, stakeholders)
4. **AI Providers** (configurations)

### Less Critical (Can rebuild):
1. Analytics data (will regenerate)
2. Audit logs (for reference only)
3. Job history (historical)

---

## 🎯 **Immediate Action Plan**

### Today (While Over Quota):

**1. Check Neon Reset Date**
```
https://console.neon.tech → Usage tab → Next reset date
```

**2. Prepare Migration Scripts**
```powershell
# I'll create automated migration scripts ready to run
# when quota resets
```

**3. Set Up Supabase (Already Done!)**
- ✅ Database created
- ✅ Schema applied
- ✅ Baseline tables created
- ✅ Waiting for data import

### When Quota Resets (or Neon Provides Export):

**1. Export Immediately (within first hour)**
```powershell
node scripts/export-from-neon.js
```

**2. Import to Supabase**
```powershell
node scripts/import-to-supabase.js
```

**3. Verify Data**
```powershell
node scripts/verify-migration.js
```

**4. Update Production**
```powershell
# Update Railway with Supabase DATABASE_URL
railway variables --set "DATABASE_URL=postgresql://postgres:QueIQ4Klopman$@db.blxzjbxczpmmgiwbtmdo.supabase.co:5432/postgres"
```

---

## 📋 **Migration Checklist**

**Before Migration:**
- [ ] Check Neon quota reset date
- [ ] Prepare export scripts
- [ ] Supabase database ready (✅ DONE)
- [ ] Backup current Neon data (when quota allows)

**During Migration:**
- [ ] Export all tables from Neon
- [ ] Verify export file integrity
- [ ] Import to Supabase
- [ ] Verify row counts match
- [ ] Test critical queries

**After Migration:**
- [ ] Update Railway DATABASE_URL
- [ ] Update Vercel environment variables
- [ ] Test all features
- [ ] Verify templates load
- [ ] Verify documents display
- [ ] Confirm stakeholder access

---

## ⏰ **Timeline Estimate**

| Action | Duration | When |
|--------|----------|------|
| Wait for Neon quota reset | 1-30 days | Check console |
| Export from Neon | 5-10 minutes | When quota resets |
| Import to Supabase | 10-15 minutes | Immediately after export |
| Verify data | 15-20 minutes | After import |
| Update production | 5 minutes | After verification |
| **TOTAL** | **~1 hour** | **When quota allows** |

---

## 🆘 **Emergency: Can't Wait for Reset?**

### Option A: Upgrade Neon Temporarily

**Cost:** $19/month (cancel after migration)

1. https://console.neon.tech → Billing → Upgrade
2. Select Launch plan ($19/month)
3. Immediately export data
4. Import to Supabase
5. Cancel Neon subscription
6. **Total cost:** ~$19 for peace of mind

### Option B: Contact Neon Support for Emergency Export

They can provide a database dump even over quota (for migration purposes).

---

## 📊 **What You Have Now**

**Supabase:** Clean database with schema, ZERO data (waiting for migration)
**Neon:** All your valuable data, but over quota (can't access)

**Next Step:** Check Neon reset date and prepare for migration!

---

Let me know:
1. **When does Neon quota reset?**
2. **Can you upgrade Neon temporarily for $19 to export immediately?**
3. **Should I create automated migration scripts now (ready when quota resets)?**

