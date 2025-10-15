# 🔐 ADPA Login Credentials

## Production Environment

**Frontend URL:** https://adpa.vercel.app

---

## Demo User Account

Perfect for testing standard user features:

```
Email:    demo@adpa.com
Password: demo123
```

**Permissions:**
- ✅ Create and update projects
- ✅ Create and update documents
- ✅ Create and update templates
- ✅ Generate AI content

---

## Admin Account

Full system access with all permissions:

```
Email:    admin@adpa.com
Password: admin123
```

**Permissions:**
- ✅ All demo user permissions
- ✅ User management (create, update, delete)
- ✅ AI configuration
- ✅ System analytics
- ✅ Security management
- ✅ Integrations management
- ✅ Job queue administration

---

## Login Instructions

### Method 1: Web Interface

1. Go to: https://adpa.vercel.app
2. Click "Sign In" or navigate to login page
3. Enter credentials (demo or admin)
4. Click "Login"

### Method 2: API Direct

```powershell
# Demo user login
$body = @{
  email = "demo@adpa.com"
  password = "demo123"
} | ConvertTo-Json

$response = Invoke-RestMethod `
  -Uri "https://adpa-production.up.railway.app/api/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body

# Response will include:
# - user: { id, email, name, role, permissions }
# - token: JWT token for authentication
```

---

## Troubleshooting

### "Failed to fetch" Error

**Issue:** Browser can't connect to backend

**Solution:** Backend CORS is now configured to allow `https://adpa.vercel.app`

**Verify:**
```powershell
railway variables --kv | Select-String "FRONTEND_URL"
# Should show: FRONTEND_URL=https://adpa.vercel.app
```

### "Invalid credentials" Error

**Issue:** Demo users don't exist in database

**Solution:** Run the seed script:
```powershell
cd server
npx tsx src/database/seed.ts
```

Or manually execute:
```powershell
psql "postgresql://neondb_owner@ep-royal-morning-a9j6aaq0-pooler.gwc.azure.neon.tech/adpa_db?sslmode=require" `
  -f server/create-demo-user.sql
```

### 401 Unauthorized

**Issue:** Wrong password or email

**Solution:** Double-check credentials:
- Demo: `demo@adpa.com` / `demo123`
- Admin: `admin@adpa.com` / `admin123`

---

## Security Notes

⚠️ **Important for Production:**

1. **Change these passwords immediately** before going live with real users
2. Demo credentials are for testing only
3. Use strong, unique passwords in production
4. Consider implementing:
   - Password complexity requirements
   - Two-factor authentication
   - Account lockout after failed attempts
   - Password rotation policies

---

## Testing Checklist

After logging in, verify these features work:

### As Demo User
- [ ] View dashboard
- [ ] Create a new project
- [ ] Upload a document
- [ ] Use a template
- [ ] Generate AI content
- [ ] View analytics

### As Admin
- [ ] All demo user features
- [ ] View all users
- [ ] Create new user
- [ ] Configure AI providers
- [ ] View system analytics
- [ ] Manage integrations
- [ ] View job queue status

---

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - New user registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user info

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Documents
- `GET /api/documents` - List all documents
- `POST /api/documents` - Create/upload document
- `GET /api/documents/:id` - Get document
- `PUT /api/documents/:id` - Update document
- `DELETE /api/documents/:id` - Delete document

---

## Database Status

✅ **Users Created:**
- Admin user (admin@adpa.com)
- Demo user (demo@adpa.com)

✅ **Database Connected:**
- Provider: Neon PostgreSQL
- SSL: Enabled
- Status: Connected

✅ **Redis Connected:**
- Provider: Upstash
- TLS: Enabled
- Status: Connected

---

## Support

If you encounter any issues:

1. Check Railway logs:
   ```powershell
   railway logs --tail 100
   ```

2. Verify health endpoint:
   ```powershell
   Invoke-WebRequest https://adpa-production.up.railway.app/health
   ```

3. Check CORS configuration:
   ```powershell
   railway variables --kv | Select-String "FRONTEND_URL|CORS"
   ```

---

**Last Updated:** October 15, 2025  
**Status:** ✅ Production Ready

