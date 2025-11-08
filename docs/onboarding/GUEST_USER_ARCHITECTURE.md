# Guest User Architecture - Security & Permissions

## 🎯 Overview

The ADPA onboarding system uses a **system guest user** (`onboarding-guest@system.local`) to allow potential clients to upload documents and get assessments without creating accounts.

## ⚠️ Two Critical Issues - FIXED

### Issue #1: Document Access in Guest-Created Projects

**Problem:**
- Guest uploads create a project owned by `onboarding-guest@system.local`
- Project appears in admin's project list
- But when admin clicks on the project, documents are **not visible**
- Permission check blocks access because admin ≠ guest user

**Root Cause:**
```typescript
// Old permission check
WHERE project_id = $1 AND (owner_id = $2 OR created_by = $2)
// ❌ Blocks admins from viewing guest-created projects
```

**Solution:**
```typescript
// New permission check
WHERE project_id = $1 AND (
  owner_id = $2 
  OR created_by = $2 
  OR team_members ? $2::text
  OR creator.email = 'onboarding-guest@system.local'  // ✅ Allow all logged-in users to view onboarding projects
)
```

**What Changed:**
- `server/src/routes/documents.ts` - Updated permission checks
- `server/src/routes/documentGeneration.ts` - Updated permission checks (already done earlier)
- Admins can now view and manage documents in guest-created projects

---

### Issue #2: AI Provider Configuration - Security Risk! 🚨

**Problem:**
- AI provider routes had **NO AUTHENTICATION**
- Guest users could configure system-wide AI providers
- If guest configured Mistral with their key, it would affect all users
- Major security and billing risk!

**Root Cause:**
```typescript
// Old routes
router.post('/api/ai-providers', async (req, res) => {
  // ❌ No authentication check!
  // ❌ Anyone can add providers!
})
```

**Solution:**
```typescript
// Middleware to require admin role
const requireAdmin = (req, res, next) => {
  if (user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Admin access required',
      message: 'AI provider configuration is admin-only.'
    });
  }
  next();
};

// Secured routes
router.post('/api/ai-providers', authenticateToken, requireAdmin, async (req, res) => {
  // ✅ Only admins can create providers
});

router.delete('/api/ai-providers/:id', authenticateToken, requireAdmin, async (req, res) => {
  // ✅ Only admins can delete providers
});
```

**What Changed:**
- `server/src/routes/ai-providers.ts` - Added `authenticateToken` + `requireAdmin` middleware
- `POST /ai-providers` - Admin only
- `DELETE /ai-providers/:id` - Admin only
- `GET /ai-providers` - Still public (API keys are masked)

---

## 🏗️ Architecture Clarifications

### 1. **Guest User is System-Wide, Not Per-Session**

**How It Works:**
```
Guest Upload #1 → Creates "onboarding-guest@system.local" user
Guest Upload #2 → Reuses SAME guest user
Guest Upload #3 → Reuses SAME guest user
```

**Benefits:**
- ✅ Single guest user ID (no foreign key issues)
- ✅ All guest projects stored together
- ✅ Easy to query all onboarding assessments

**Important:**
- Guest projects are tied to ONE system account
- All logged-in admins can view ALL guest projects
- Guest cannot configure AI providers (admin-only)

---

### 2. **AI Providers are System-Wide Configuration**

**Scope:** **ALL USERS** (not user-specific)

```
AI Providers Table (System-Wide):
├── Mistral AI (Priority 1, Active)
├── OpenAI (Priority 2, Active)
└── Google AI (Priority 3, Active)

Used by:
├── Admin user documents
├── Guest user assessments  ← Uses same providers!
└── Regular user documents
```

**Security Model:**
- ✅ **Admin**: Can add/edit/delete providers via UI
- ✅ **Regular Users**: Can USE providers, cannot configure
- ❌ **Guest Users**: Can USE providers, cannot access AI provider UI

**Why Guest Can't Configure:**
- AI providers cost money (API keys = billing)
- One malicious guest could add invalid/expensive provider
- Would affect all users (system-wide)
- Security risk (key theft, rate limit abuse)

---

## 🔒 Permission Matrix

| Action | Admin | Regular User | Guest User |
|--------|-------|--------------|------------|
| **Upload documents** | ✅ | ✅ | ✅ |
| **View own assessments** | ✅ | ✅ | ✅ |
| **View guest-created projects** | ✅ | ✅ | ❌ |
| **Configure AI providers** | ✅ | ❌ | ❌ |
| **View AI provider list** | ✅ | ✅ | ✅ (masked keys) |
| **Use AI for quality audits** | ✅ (system providers) | ✅ (system providers) | ✅ (system providers) |

---

## 💡 Best Practices

### For Guest Onboarding Assessments:

**1. Admin Configures Providers Once:**
```
Admin logs in → /app/ai-providers → Adds Mistral AI (priority 1)
```

**2. All Guests Use Same Config:**
```
Guest #1 uploads → Uses Mistral
Guest #2 uploads → Uses Mistral
Guest #3 uploads → Uses Mistral (if Mistral fails → auto-fallback to OpenAI)
```

**3. Admin Reviews Guest Assessments:**
```
Admin → /projects → See guest-created projects
Admin → Click project → See all guest documents ✅
Admin → View quality scores, gaps, recommendations
Admin → Follow up with potential client
```

---

## 🎯 Workflow Example

### Guest User Flow:
```
1. Visit /onboarding/upload (no login)
2. Upload 5 documents
3. System uses admin-configured AI providers
   → Try Mistral (priority 1)
   → If fails → Try OpenAI (priority 2)
4. Assessment generates automatically
5. View results (no sensitive data exposed)
6. Download PDF report
```

### Admin Follow-Up Flow:
```
1. Admin logs in
2. Go to /projects → See "AGILE Governance Methodology" (guest-created)
3. Click project → View all 7 documents ✅ (now works!)
4. Review quality scores and gaps
5. Contact client (email from assessment metadata)
6. Convert to sales opportunity
```

---

## 🛠️ Technical Implementation

### Files Modified:

**1. `server/src/routes/documents.ts`**
- Updated permission checks to allow viewing guest-created project documents
- Added check: `OR u.email = 'onboarding-guest@system.local'`

**2. `server/src/routes/ai-providers.ts`**
- Added `authenticateToken` middleware
- Added `requireAdmin` middleware
- Secured POST and DELETE endpoints
- Added 'mistral' and 'groq' to valid provider types

**3. `server/scripts/fix-guest-project-permissions.sql`**
- Optional SQL script to transfer guest project ownership to admin
- Alternative: Add `is_onboarding_project` flag

---

## ✅ Summary

### What Works Now:

**Guest Users:**
- ✅ Can upload documents without login
- ✅ Get instant assessments
- ✅ Use system-configured AI providers (whatever admin set up)
- ❌ Cannot configure AI providers
- ❌ Cannot access AI provider management UI

**Admins:**
- ✅ Can view ALL guest-created projects
- ✅ Can see documents in guest projects
- ✅ Can configure AI providers for entire system
- ✅ One-time setup benefits all guests

**AI Providers:**
- ✅ System-wide (not user-specific)
- ✅ Admin-only configuration
- ✅ All users (including guests) use same providers
- ✅ Automatic failover works for everyone

---

## 🚀 Recommended Setup

**Admin One-Time Setup:**
1. Log in as admin
2. Go to `/app/ai-providers`
3. Add **Mistral AI** (priority 1, free tier)
4. Add **OpenAI** (priority 2, paid tier)
5. Save and forget!

**Result:**
- All guest uploads use Mistral first
- If Mistral quota exceeded → auto-fallback to OpenAI
- Admin doesn't need to reconfigure for each guest
- Costs are predictable and monitored via AI Analytics

---

**Built with security and scalability in mind!** 🔒

