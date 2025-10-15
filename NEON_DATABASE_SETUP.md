# Neon Database Setup Guide

This guide will help you configure your ADPA application to use the Neon-hosted PostgreSQL database for local development.

## Your Neon Database Connection Details

**Connection String:**
```
postgresql://neondb_owner:npg_6H1YnZiDleEV@ep-royal-morning-a9j6aaq0-pooler.gwc.azure.neon.tech/adpa_db?sslmode=require
```

**Parsed Details:**
- **Host:** `ep-royal-morning-a9j6aaq0-pooler.gwc.azure.neon.tech`
- **Port:** `5432` (default PostgreSQL port)
- **Database:** `adpa_db`
- **User:** `neondb_owner`
- **Password:** `npg_6H1YnZiDleEV`
- **SSL Mode:** `require` (mandatory for Neon)

---

## Setup Instructions

### 1. Backend Configuration (`server/.env`)

Create a file `server/.env` with the following content:

```env
# Neon PostgreSQL Database Configuration
DB_HOST=ep-royal-morning-a9j6aaq0-pooler.gwc.azure.neon.tech
DB_PORT=5432
DB_NAME=adpa_db
DB_USER=neondb_owner
DB_PASSWORD=npg_6H1YnZiDleEV
DB_SSL=true

# Full connection URL
POSTGRES_URL=postgresql://neondb_owner:npg_6H1YnZiDleEV@ep-royal-morning-a9j6aaq0-pooler.gwc.azure.neon.tech/adpa_db?sslmode=require

# Redis Configuration (optional - comment out if not using)
# REDIS_URL=redis://localhost:6379

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-secret-key-here-change-in-production
JWT_EXPIRES_IN=24h

# AI Provider API Keys (add your keys as needed)
# OPENAI_API_KEY=
# GOOGLE_AI_API_KEY=
# ANTHROPIC_API_KEY=
# MISTRAL_API_KEY=

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

# Neon PostgreSQL Database Configuration
POSTGRES_URL=postgresql://neondb_owner:npg_6H1YnZiDleEV@ep-royal-morning-a9j6aaq0-pooler.gwc.azure.neon.tech/adpa_db?sslmode=require
POSTGRES_PRISMA_URL=postgresql://neondb_owner:npg_6H1YnZiDleEV@ep-royal-morning-a9j6aaq0-pooler.gwc.azure.neon.tech/adpa_db?sslmode=require&pgbouncer=true&connect_timeout=15
POSTGRES_URL_NON_POOLING=postgresql://neondb_owner:npg_6H1YnZiDleEV@ep-royal-morning-a9j6aaq0-pooler.gwc.azure.neon.tech/adpa_db?sslmode=require

# Redis Configuration (optional)
# REDIS_URL=redis://localhost:6379

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here-change-in-production
```

---

## Quick Setup Commands (PowerShell)

Run these commands in PowerShell from your project root:

```powershell
# Create backend .env file
@"
DB_HOST=ep-royal-morning-a9j6aaq0-pooler.gwc.azure.neon.tech
DB_PORT=5432
DB_NAME=adpa_db
DB_USER=neondb_owner
DB_PASSWORD=npg_6H1YnZiDleEV
DB_SSL=true
POSTGRES_URL=postgresql://neondb_owner:npg_6H1YnZiDleEV@ep-royal-morning-a9j6aaq0-pooler.gwc.azure.neon.tech/adpa_db?sslmode=require
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
POSTGRES_URL=postgresql://neondb_owner:npg_6H1YnZiDleEV@ep-royal-morning-a9j6aaq0-pooler.gwc.azure.neon.tech/adpa_db?sslmode=require
POSTGRES_PRISMA_URL=postgresql://neondb_owner:npg_6H1YnZiDleEV@ep-royal-morning-a9j6aaq0-pooler.gwc.azure.neon.tech/adpa_db?sslmode=require&pgbouncer=true&connect_timeout=15
POSTGRES_URL_NON_POOLING=postgresql://neondb_owner:npg_6H1YnZiDleEV@ep-royal-morning-a9j6aaq0-pooler.gwc.azure.neon.tech/adpa_db?sslmode=require
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

You should see:
```
✅ Database connection established successfully via Environment hostname
🚀 Server is running on port 5000
```

### Start Frontend (Terminal 2)

```powershell
npm run dev
```

You should see:
```
▲ Next.js 14.2.30
- Local:        http://localhost:3000
```

---

## Verification

### Test Database Connection

Run this command to test the database connection:

```powershell
cd server
node -e "require('dotenv').config(); const { Pool } = require('pg'); const pool = new Pool({ connectionString: process.env.POSTGRES_URL, ssl: { rejectUnauthorized: false } }); pool.query('SELECT NOW()', (err, res) => { if (err) { console.error('Error:', err); } else { console.log('✅ Database connected! Server time:', res.rows[0].now); } pool.end(); });"
```

---

## Important Notes

1. **SSL is Required**: Neon requires SSL connections. The connection configuration already includes SSL settings.

2. **Redis (Optional)**: If you're not using Redis locally, you can comment out or remove the `REDIS_URL` line. The application will start without Redis, but some features (like job queues and caching) may not work.

3. **Connection Pooling**: Neon uses connection pooling via PgBouncer. The backend is configured to handle this automatically.

4. **Security**: 
   - The credentials in this file are for development. Never commit `.env` files to version control.
   - Change `JWT_SECRET` in production to a strong, random value.

5. **Database Migrations**: If your database is empty, you may need to run migrations:
   ```powershell
   # Run migrations from server directory
   cd server
   # If you have migration scripts
   npm run migrate
   # Or manually run SQL files
   psql 'postgresql://neondb_owner:npg_6H1YnZiDleEV@ep-royal-morning-a9j6aaq0-pooler.gwc.azure.neon.tech/adpa_db?sslmode=require' -f migrations/your-migration.sql
   ```

---

## Troubleshooting

### Connection Timeout

If you get connection timeout errors:
- Check your internet connection
- Verify Neon dashboard shows the database is active
- Check if your IP is allowed (Neon has no IP restrictions by default)

### SSL Certificate Errors

If you get SSL errors, ensure the connection string includes `sslmode=require`:
```
?sslmode=require
```

### Authentication Failed

If you get "password authentication failed":
- Verify the password hasn't changed in Neon dashboard
- Make sure you're using the correct user (`neondb_owner`)

---

## Next Steps

1. Create the `.env` files using the commands above
2. Start the backend server
3. Start the frontend development server
4. Open http://localhost:3000 in your browser
5. Check the backend logs to confirm database connection

---

## Additional Resources

- [Neon Documentation](https://neon.tech/docs)
- [PostgreSQL Connection Strings](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING)
- [ADPA Project Documentation](./README.md)

