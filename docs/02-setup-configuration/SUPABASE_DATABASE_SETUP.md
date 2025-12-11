# Supabase Database Setup Guide

This guide will help you configure your ADPA application to use the Supabase-hosted PostgreSQL database for local development.

## Your Supabase Database Connection Details

**Connection String (Transaction Mode - Recommended):**
```
postgresql://postgres:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
```

**Connection String (Session Mode):**
```
postgresql://postgres:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
```

**Details:**
- **Host:** `aws-0-[REGION].pooler.supabase.com`
- **Port:** `6543` (Transaction pooler) or `5432` (Session)
- **Database:** `postgres` (default)
- **User:** `postgres`
- **Password:** *The password you set when creating the project*
- **SSL Mode:** `require` (mandatory)

---

## Setup Instructions

### 1. Backend Configuration (`server/.env`)

Create a file `server/.env` with the following content:

```env
# Supabase PostgreSQL Database Configuration
DB_HOST=aws-0-[REGION].pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=[YOUR-PASSWORD]
DB_SSL=true

# Full connection URL (Transaction Mode)
POSTGRES_URL=postgresql://postgres:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true

# Redis Configuration (optional - comment out if not using)
# REDIS_URL=redis://localhost:6379

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-secret-key-here-change-in-production
JWT_EXPIRES_IN=24h

# File Upload Configuration
MAX_FILE_SIZE=50mb
UPLOAD_DIR=./uploads

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Logging Configuration
LOG_LEVEL=info
```

### 2. Frontend Configuration (`.env.local`)

Create a file `.env.local` in the root directory with the following content:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5000

# Supabase PostgreSQL Database Configuration
POSTGRES_URL=postgresql://postgres:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
POSTGRES_PRISMA_URL=postgresql://postgres:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
POSTGRES_URL_NON_POOLING=postgresql://postgres:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here-change-in-production
```

---

## Quick Setup Commands (PowerShell)

Run these commands in PowerShell from your project root (replace placeholders first!):

```powershell
# Create backend .env file
@"
DB_HOST=aws-0-[REGION].pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=[YOUR-PASSWORD]
DB_SSL=true
POSTGRES_URL=postgresql://postgres:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
PORT=5000
NODE_ENV=development
JWT_SECRET=dev-secret-change-in-production
JWT_EXPIRES_IN=24h
MAX_FILE_SIZE=50mb
UPLOAD_DIR=./uploads
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=info
"@ | Out-File -FilePath server\.env -Encoding UTF8

# Create frontend .env.local file
@"
NEXT_PUBLIC_API_URL=http://localhost:5000
POSTGRES_URL=postgresql://postgres:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
POSTGRES_PRISMA_URL=postgresql://postgres:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
POSTGRES_URL_NON_POOLING=postgresql://postgres:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=dev-secret-change-in-production
"@ | Out-File -FilePath .env.local -Encoding UTF8
```

---

## Running the Application

### Start Backend (Terminal 1)

```powershell
cd server
npm run dev
```

### Start Frontend (Terminal 2)

```powershell
npm run dev
```

---

## Important Notes

1. **IPv4 vs IPv6**: Supabase uses IPv6 by default for the direct connection. For better compatibility with some local environments (and Vercel), use the **Supavisor (Pooler)** connection string (port 6543) which supports IPv4.

2. **SSL is Required**: Supabase requires SSL connections. `?sslmode=require` is standard.

3. **Connection Pooling**: Always use the Transaction pooler (port 6543) for serverless environments (like Vercel) to avoid exhausting connections.

4. **Security**: 
   - Never commit `.env` files to version control.
   - Use strong passwords.

---

## Troubleshooting

### Connection Timeout
- Ensure you are using the correct Region URL.
- Check if your network blocks port 6543 or 5432.

### "prepared statement ... already exists"
- This can happen when using Transaction pooling (port 6543). If you encounter this with Prisma or specific raw queries, verify your prepared statement configuration or switch to Session mode (port 5432) for local dev if necessary (though transaction mode is preferred for prod parity).

---

## Additional Resources
- [Supabase Database Documentation](https://supabase.com/docs/guides/database)
- [ADPA Project Documentation](./README.md)
