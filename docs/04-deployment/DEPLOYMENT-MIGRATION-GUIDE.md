# Database Migration Guide for New Machines

## Overview
This guide helps you migrate the ADPA database schema to a new machine or environment.

## Prerequisites
- PostgreSQL client (`psql`) installed
- Neon database connection string
- Access to the target database

## Quick Migration

### 1. Run the Complete Migration Script
```bash
psql "your-neon-connection-string" -f migrate-to-neon-complete.sql
```

### 2. Verify Migration Success
```bash
psql "your-neon-connection-string" -c "\dt"
```

## What the Migration Includes

### Core Schema Changes
- ✅ Context bundles table and functionality
- ✅ Document versioning system
- ✅ Template soft delete fields
- ✅ Confluence integration fields
- ✅ SharePoint integration fields
- ✅ OpenAI enhanced provider fields

### AI Providers
- ✅ OpenRouter GPT-OSS-120B provider
- ✅ Claude 3.5 Sonnet provider

### Indexes and Constraints
- ✅ Performance indexes for all new fields
- ✅ Unique constraints where needed
- ✅ GIN indexes for JSONB fields

### Functions and Triggers
- ✅ Automatic timestamp updates
- ✅ Soft delete functionality

## Environment Variables for New Machine

Create a `.env` file in the `server/` directory:

```env
# Backend Environment Variables
NODE_ENV=development
PORT=5000

# Database Configuration (Neon PostgreSQL)
DB_HOST=your-neon-host
DB_PORT=5432
DB_NAME=adpa_db
DB_USER=your-neon-user
DB_PASSWORD=your-neon-password
POSTGRES_URL=your-complete-neon-connection-string

# Redis Configuration
REDIS_URL=redis://localhost:6379

# JWT Secret
JWT_SECRET=your-development-jwt-secret-key-here-make-it-long-and-secure

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Optional: Enable debug logging
DEBUG=*
```

## Verification Steps

### 1. Check Tables
```sql
\dt
```
Should show all tables including:
- context_bundles
- document_versions
- Enhanced ai_providers, templates, projects, documents

### 2. Check AI Providers
```sql
SELECT name, provider_type, is_active FROM ai_providers;
```

### 3. Test Backend Connection
```bash
curl -I http://localhost:5000
```

## Troubleshooting

### Common Issues
1. **Connection refused**: Check Neon connection string
2. **Permission denied**: Verify database user permissions
3. **Table already exists**: Script uses `IF NOT EXISTS` - safe to re-run

### Re-running Migration
The migration script is idempotent - safe to run multiple times:
```bash
psql "your-neon-connection-string" -f migrate-to-neon-complete.sql
```

## Next Steps
1. Update environment variables
2. Start backend: `cd server && npm run dev`
3. Start frontend: `pnpm dev`
4. Test application functionality

## Support
If you encounter issues, check:
- Database connection string format
- Network connectivity to Neon
- PostgreSQL client version compatibility

