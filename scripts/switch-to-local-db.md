# Switch ADPA to Local PostgreSQL

## Quick Start

### 1. Install PostgreSQL

**Windows:**
```powershell
# Download installer from:
https://www.postgresql.org/download/windows/

# Install with defaults, remember your postgres password!
```

**Using Chocolatey (Windows):**
```powershell
choco install postgresql
```

### 2. Create Database

```powershell
# Open psql
psql -U postgres

# In psql:
CREATE DATABASE adpa_dev;
CREATE USER adpa_user WITH PASSWORD 'SecurePassword123!';
GRANT ALL PRIVILEGES ON DATABASE adpa_dev TO adpa_user;
ALTER DATABASE adpa_dev OWNER TO adpa_user;
\q
```

### 3. Update Environment Variables

**Edit `server/.env`:**

```env
# Comment out Neon
# DATABASE_URL=postgresql://neondb_owner:...

# Add local PostgreSQL
DATABASE_URL=postgresql://adpa_user:SecurePassword123!@localhost:5432/adpa_dev

# Or use postgres superuser
# DATABASE_URL=postgresql://postgres:YourPostgresPassword@localhost:5432/adpa_dev
```

### 4. Run Migrations

```powershell
cd D:\source\repos\adpa\server

# Run all numbered migrations in order
psql -U adpa_user -d adpa_dev -f migrations/001_compression_quality_assurance.sql
psql -U adpa_user -d adpa_dev -f migrations/007_analytics_tables.sql
psql -U adpa_user -d adpa_dev -f migrations/007_stakeholders.sql
# ... (run all in order)
psql -U adpa_user -d adpa_dev -f migrations/017_baseline_drift_detection.sql

# Or use migration script
node scripts/run-all-migrations.js
```

### 5. Create Initial Data

```powershell
# Create change request template
node scripts/create-change-request-template.js

# Verify tables
psql -U adpa_user -d adpa_dev
\dt
# Should see: users, projects, documents, templates, ai_providers, project_baselines, etc.
\q
```

### 6. Start Backend

```powershell
cd D:\source\repos\adpa\server
npm run dev

# Should see:
# ✅ Database connected successfully
# ✅ All API routes registered
```

---

## Verify Connection

```powershell
# Test connection
psql -U adpa_user -d adpa_dev -c "SELECT version();"

# Check tables
psql -U adpa_user -d adpa_dev -c "\dt"

# Check baseline tables
psql -U adpa_user -d adpa_dev -c "SELECT COUNT(*) FROM project_baselines;"
```

---

## Benefits of Local PostgreSQL

✅ **No Quotas:** Unlimited data transfer  
✅ **Fast:** No network latency  
✅ **Free:** No monthly costs  
✅ **Privacy:** Data stays local  
✅ **Development:** Full control for testing  

---

## Troubleshooting

### Connection Refused

**Problem:** `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solution:**
```powershell
# Check if PostgreSQL is running
Get-Service postgresql*

# Start if stopped
Start-Service postgresql-x64-15  # or your version
```

### Authentication Failed

**Problem:** `password authentication failed for user`

**Solution:**
```powershell
# Edit pg_hba.conf (usually in C:\Program Files\PostgreSQL\15\data\)
# Change 'md5' to 'trust' for localhost (development only!)
# OR: Use correct password from installation
```

### Database Does Not Exist

**Solution:**
```powershell
psql -U postgres
CREATE DATABASE adpa_dev;
GRANT ALL PRIVILEGES ON DATABASE adpa_dev TO adpa_user;
\q
```

---

## Production Considerations

**Keep Neon for Production:**
- Update `DATABASE_URL` in production environment only
- Keep local for development
- Use environment-specific `.env` files

**Multi-Environment Setup:**

```env
# .env.development (local)
DATABASE_URL=postgresql://adpa_user:password@localhost:5432/adpa_dev

# .env.production (Neon or other)
DATABASE_URL=postgresql://neondb_owner:...@neon.tech:5432/neondb
```

---

## Alternative: Supabase (If You Prefer Cloud)

**Free Tier:** More generous than Neon
- 500 MB database
- Unlimited API requests
- 2 GB bandwidth/month
- 50,000 monthly active users

**Setup:**
1. https://supabase.com → Create project
2. Copy connection string from Settings → Database
3. Update `DATABASE_URL` in `server/.env`
4. Run migrations
5. Done!

---

## Cost Comparison

| Provider | Free Tier | Paid (Entry) |
|----------|-----------|--------------|
| **Local PG** | Unlimited | $0/month |
| **Neon** | 5 GB transfer | $19/month (10 GB) |
| **Supabase** | 2 GB bandwidth | $25/month (8 GB) |
| **Railway** | $5 credit | $5/month (pay-as-go) |
| **AWS RDS** | None | ~$15/month (micro) |

**Recommendation:** Local PG for dev, Neon/Supabase for production

---

## Next Steps

1. Install PostgreSQL locally
2. Create `adpa_dev` database
3. Update `server/.env`
4. Run migrations
5. Restart backend
6. Continue development without quota issues!

---

**Quick Help:**
```powershell
# Connection string format
postgresql://username:password@host:port/database

# Local example
postgresql://adpa_user:SecurePass123@localhost:5432/adpa_dev
```


## Quick Start

### 1. Install PostgreSQL

**Windows:**
```powershell
# Download installer from:
https://www.postgresql.org/download/windows/

# Install with defaults, remember your postgres password!
```

**Using Chocolatey (Windows):**
```powershell
choco install postgresql
```

### 2. Create Database

```powershell
# Open psql
psql -U postgres

# In psql:
CREATE DATABASE adpa_dev;
CREATE USER adpa_user WITH PASSWORD 'SecurePassword123!';
GRANT ALL PRIVILEGES ON DATABASE adpa_dev TO adpa_user;
ALTER DATABASE adpa_dev OWNER TO adpa_user;
\q
```

### 3. Update Environment Variables

**Edit `server/.env`:**

```env
# Comment out Neon
# DATABASE_URL=postgresql://neondb_owner:...

# Add local PostgreSQL
DATABASE_URL=postgresql://adpa_user:SecurePassword123!@localhost:5432/adpa_dev

# Or use postgres superuser
# DATABASE_URL=postgresql://postgres:YourPostgresPassword@localhost:5432/adpa_dev
```

### 4. Run Migrations

```powershell
cd D:\source\repos\adpa\server

# Run all numbered migrations in order
psql -U adpa_user -d adpa_dev -f migrations/001_compression_quality_assurance.sql
psql -U adpa_user -d adpa_dev -f migrations/007_analytics_tables.sql
psql -U adpa_user -d adpa_dev -f migrations/007_stakeholders.sql
# ... (run all in order)
psql -U adpa_user -d adpa_dev -f migrations/017_baseline_drift_detection.sql

# Or use migration script
node scripts/run-all-migrations.js
```

### 5. Create Initial Data

```powershell
# Create change request template
node scripts/create-change-request-template.js

# Verify tables
psql -U adpa_user -d adpa_dev
\dt
# Should see: users, projects, documents, templates, ai_providers, project_baselines, etc.
\q
```

### 6. Start Backend

```powershell
cd D:\source\repos\adpa\server
npm run dev

# Should see:
# ✅ Database connected successfully
# ✅ All API routes registered
```

---

## Verify Connection

```powershell
# Test connection
psql -U adpa_user -d adpa_dev -c "SELECT version();"

# Check tables
psql -U adpa_user -d adpa_dev -c "\dt"

# Check baseline tables
psql -U adpa_user -d adpa_dev -c "SELECT COUNT(*) FROM project_baselines;"
```

---

## Benefits of Local PostgreSQL

✅ **No Quotas:** Unlimited data transfer  
✅ **Fast:** No network latency  
✅ **Free:** No monthly costs  
✅ **Privacy:** Data stays local  
✅ **Development:** Full control for testing  

---

## Troubleshooting

### Connection Refused

**Problem:** `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solution:**
```powershell
# Check if PostgreSQL is running
Get-Service postgresql*

# Start if stopped
Start-Service postgresql-x64-15  # or your version
```

### Authentication Failed

**Problem:** `password authentication failed for user`

**Solution:**
```powershell
# Edit pg_hba.conf (usually in C:\Program Files\PostgreSQL\15\data\)
# Change 'md5' to 'trust' for localhost (development only!)
# OR: Use correct password from installation
```

### Database Does Not Exist

**Solution:**
```powershell
psql -U postgres
CREATE DATABASE adpa_dev;
GRANT ALL PRIVILEGES ON DATABASE adpa_dev TO adpa_user;
\q
```

---

## Production Considerations

**Keep Neon for Production:**
- Update `DATABASE_URL` in production environment only
- Keep local for development
- Use environment-specific `.env` files

**Multi-Environment Setup:**

```env
# .env.development (local)
DATABASE_URL=postgresql://adpa_user:password@localhost:5432/adpa_dev

# .env.production (Neon or other)
DATABASE_URL=postgresql://neondb_owner:...@neon.tech:5432/neondb
```

---

## Alternative: Supabase (If You Prefer Cloud)

**Free Tier:** More generous than Neon
- 500 MB database
- Unlimited API requests
- 2 GB bandwidth/month
- 50,000 monthly active users

**Setup:**
1. https://supabase.com → Create project
2. Copy connection string from Settings → Database
3. Update `DATABASE_URL` in `server/.env`
4. Run migrations
5. Done!

---

## Cost Comparison

| Provider | Free Tier | Paid (Entry) |
|----------|-----------|--------------|
| **Local PG** | Unlimited | $0/month |
| **Neon** | 5 GB transfer | $19/month (10 GB) |
| **Supabase** | 2 GB bandwidth | $25/month (8 GB) |
| **Railway** | $5 credit | $5/month (pay-as-go) |
| **AWS RDS** | None | ~$15/month (micro) |

**Recommendation:** Local PG for dev, Neon/Supabase for production

---

## Next Steps

1. Install PostgreSQL locally
2. Create `adpa_dev` database
3. Update `server/.env`
4. Run migrations
5. Restart backend
6. Continue development without quota issues!

---

**Quick Help:**
```powershell
# Connection string format
postgresql://username:password@host:port/database

# Local example
postgresql://adpa_user:SecurePass123@localhost:5432/adpa_dev
```


## Quick Start

### 1. Install PostgreSQL

**Windows:**
```powershell
# Download installer from:
https://www.postgresql.org/download/windows/

# Install with defaults, remember your postgres password!
```

**Using Chocolatey (Windows):**
```powershell
choco install postgresql
```

### 2. Create Database

```powershell
# Open psql
psql -U postgres

# In psql:
CREATE DATABASE adpa_dev;
CREATE USER adpa_user WITH PASSWORD 'SecurePassword123!';
GRANT ALL PRIVILEGES ON DATABASE adpa_dev TO adpa_user;
ALTER DATABASE adpa_dev OWNER TO adpa_user;
\q
```

### 3. Update Environment Variables

**Edit `server/.env`:**

```env
# Comment out Neon
# DATABASE_URL=postgresql://neondb_owner:...

# Add local PostgreSQL
DATABASE_URL=postgresql://adpa_user:SecurePassword123!@localhost:5432/adpa_dev

# Or use postgres superuser
# DATABASE_URL=postgresql://postgres:YourPostgresPassword@localhost:5432/adpa_dev
```

### 4. Run Migrations

```powershell
cd D:\source\repos\adpa\server

# Run all numbered migrations in order
psql -U adpa_user -d adpa_dev -f migrations/001_compression_quality_assurance.sql
psql -U adpa_user -d adpa_dev -f migrations/007_analytics_tables.sql
psql -U adpa_user -d adpa_dev -f migrations/007_stakeholders.sql
# ... (run all in order)
psql -U adpa_user -d adpa_dev -f migrations/017_baseline_drift_detection.sql

# Or use migration script
node scripts/run-all-migrations.js
```

### 5. Create Initial Data

```powershell
# Create change request template
node scripts/create-change-request-template.js

# Verify tables
psql -U adpa_user -d adpa_dev
\dt
# Should see: users, projects, documents, templates, ai_providers, project_baselines, etc.
\q
```

### 6. Start Backend

```powershell
cd D:\source\repos\adpa\server
npm run dev

# Should see:
# ✅ Database connected successfully
# ✅ All API routes registered
```

---

## Verify Connection

```powershell
# Test connection
psql -U adpa_user -d adpa_dev -c "SELECT version();"

# Check tables
psql -U adpa_user -d adpa_dev -c "\dt"

# Check baseline tables
psql -U adpa_user -d adpa_dev -c "SELECT COUNT(*) FROM project_baselines;"
```

---

## Benefits of Local PostgreSQL

✅ **No Quotas:** Unlimited data transfer  
✅ **Fast:** No network latency  
✅ **Free:** No monthly costs  
✅ **Privacy:** Data stays local  
✅ **Development:** Full control for testing  

---

## Troubleshooting

### Connection Refused

**Problem:** `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solution:**
```powershell
# Check if PostgreSQL is running
Get-Service postgresql*

# Start if stopped
Start-Service postgresql-x64-15  # or your version
```

### Authentication Failed

**Problem:** `password authentication failed for user`

**Solution:**
```powershell
# Edit pg_hba.conf (usually in C:\Program Files\PostgreSQL\15\data\)
# Change 'md5' to 'trust' for localhost (development only!)
# OR: Use correct password from installation
```

### Database Does Not Exist

**Solution:**
```powershell
psql -U postgres
CREATE DATABASE adpa_dev;
GRANT ALL PRIVILEGES ON DATABASE adpa_dev TO adpa_user;
\q
```

---

## Production Considerations

**Keep Neon for Production:**
- Update `DATABASE_URL` in production environment only
- Keep local for development
- Use environment-specific `.env` files

**Multi-Environment Setup:**

```env
# .env.development (local)
DATABASE_URL=postgresql://adpa_user:password@localhost:5432/adpa_dev

# .env.production (Neon or other)
DATABASE_URL=postgresql://neondb_owner:...@neon.tech:5432/neondb
```

---

## Alternative: Supabase (If You Prefer Cloud)

**Free Tier:** More generous than Neon
- 500 MB database
- Unlimited API requests
- 2 GB bandwidth/month
- 50,000 monthly active users

**Setup:**
1. https://supabase.com → Create project
2. Copy connection string from Settings → Database
3. Update `DATABASE_URL` in `server/.env`
4. Run migrations
5. Done!

---

## Cost Comparison

| Provider | Free Tier | Paid (Entry) |
|----------|-----------|--------------|
| **Local PG** | Unlimited | $0/month |
| **Neon** | 5 GB transfer | $19/month (10 GB) |
| **Supabase** | 2 GB bandwidth | $25/month (8 GB) |
| **Railway** | $5 credit | $5/month (pay-as-go) |
| **AWS RDS** | None | ~$15/month (micro) |

**Recommendation:** Local PG for dev, Neon/Supabase for production

---

## Next Steps

1. Install PostgreSQL locally
2. Create `adpa_dev` database
3. Update `server/.env`
4. Run migrations
5. Restart backend
6. Continue development without quota issues!

---

**Quick Help:**
```powershell
# Connection string format
postgresql://username:password@host:port/database

# Local example
postgresql://adpa_user:SecurePass123@localhost:5432/adpa_dev
```


## Quick Start

### 1. Install PostgreSQL

**Windows:**
```powershell
# Download installer from:
https://www.postgresql.org/download/windows/

# Install with defaults, remember your postgres password!
```

**Using Chocolatey (Windows):**
```powershell
choco install postgresql
```

### 2. Create Database

```powershell
# Open psql
psql -U postgres

# In psql:
CREATE DATABASE adpa_dev;
CREATE USER adpa_user WITH PASSWORD 'SecurePassword123!';
GRANT ALL PRIVILEGES ON DATABASE adpa_dev TO adpa_user;
ALTER DATABASE adpa_dev OWNER TO adpa_user;
\q
```

### 3. Update Environment Variables

**Edit `server/.env`:**

```env
# Comment out Neon
# DATABASE_URL=postgresql://neondb_owner:...

# Add local PostgreSQL
DATABASE_URL=postgresql://adpa_user:SecurePassword123!@localhost:5432/adpa_dev

# Or use postgres superuser
# DATABASE_URL=postgresql://postgres:YourPostgresPassword@localhost:5432/adpa_dev
```

### 4. Run Migrations

```powershell
cd D:\source\repos\adpa\server

# Run all numbered migrations in order
psql -U adpa_user -d adpa_dev -f migrations/001_compression_quality_assurance.sql
psql -U adpa_user -d adpa_dev -f migrations/007_analytics_tables.sql
psql -U adpa_user -d adpa_dev -f migrations/007_stakeholders.sql
# ... (run all in order)
psql -U adpa_user -d adpa_dev -f migrations/017_baseline_drift_detection.sql

# Or use migration script
node scripts/run-all-migrations.js
```

### 5. Create Initial Data

```powershell
# Create change request template
node scripts/create-change-request-template.js

# Verify tables
psql -U adpa_user -d adpa_dev
\dt
# Should see: users, projects, documents, templates, ai_providers, project_baselines, etc.
\q
```

### 6. Start Backend

```powershell
cd D:\source\repos\adpa\server
npm run dev

# Should see:
# ✅ Database connected successfully
# ✅ All API routes registered
```

---

## Verify Connection

```powershell
# Test connection
psql -U adpa_user -d adpa_dev -c "SELECT version();"

# Check tables
psql -U adpa_user -d adpa_dev -c "\dt"

# Check baseline tables
psql -U adpa_user -d adpa_dev -c "SELECT COUNT(*) FROM project_baselines;"
```

---

## Benefits of Local PostgreSQL

✅ **No Quotas:** Unlimited data transfer  
✅ **Fast:** No network latency  
✅ **Free:** No monthly costs  
✅ **Privacy:** Data stays local  
✅ **Development:** Full control for testing  

---

## Troubleshooting

### Connection Refused

**Problem:** `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solution:**
```powershell
# Check if PostgreSQL is running
Get-Service postgresql*

# Start if stopped
Start-Service postgresql-x64-15  # or your version
```

### Authentication Failed

**Problem:** `password authentication failed for user`

**Solution:**
```powershell
# Edit pg_hba.conf (usually in C:\Program Files\PostgreSQL\15\data\)
# Change 'md5' to 'trust' for localhost (development only!)
# OR: Use correct password from installation
```

### Database Does Not Exist

**Solution:**
```powershell
psql -U postgres
CREATE DATABASE adpa_dev;
GRANT ALL PRIVILEGES ON DATABASE adpa_dev TO adpa_user;
\q
```

---

## Production Considerations

**Keep Neon for Production:**
- Update `DATABASE_URL` in production environment only
- Keep local for development
- Use environment-specific `.env` files

**Multi-Environment Setup:**

```env
# .env.development (local)
DATABASE_URL=postgresql://adpa_user:password@localhost:5432/adpa_dev

# .env.production (Neon or other)
DATABASE_URL=postgresql://neondb_owner:...@neon.tech:5432/neondb
```

---

## Alternative: Supabase (If You Prefer Cloud)

**Free Tier:** More generous than Neon
- 500 MB database
- Unlimited API requests
- 2 GB bandwidth/month
- 50,000 monthly active users

**Setup:**
1. https://supabase.com → Create project
2. Copy connection string from Settings → Database
3. Update `DATABASE_URL` in `server/.env`
4. Run migrations
5. Done!

---

## Cost Comparison

| Provider | Free Tier | Paid (Entry) |
|----------|-----------|--------------|
| **Local PG** | Unlimited | $0/month |
| **Neon** | 5 GB transfer | $19/month (10 GB) |
| **Supabase** | 2 GB bandwidth | $25/month (8 GB) |
| **Railway** | $5 credit | $5/month (pay-as-go) |
| **AWS RDS** | None | ~$15/month (micro) |

**Recommendation:** Local PG for dev, Neon/Supabase for production

---

## Next Steps

1. Install PostgreSQL locally
2. Create `adpa_dev` database
3. Update `server/.env`
4. Run migrations
5. Restart backend
6. Continue development without quota issues!

---

**Quick Help:**
```powershell
# Connection string format
postgresql://username:password@host:port/database

# Local example
postgresql://adpa_user:SecurePass123@localhost:5432/adpa_dev
```

