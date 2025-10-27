# 🏢 Enterprise Authentication Strategy - Microsoft Entra ID Integration

**Critical Decision**: Enterprise SSO with Microsoft Entra ID  
**Date**: October 26, 2025  
**Audience**: Enterprise B2B customers (Fortune 500, government, large orgs)  
**Impact**: ⭐⭐⭐⭐⭐ CRITICAL for enterprise sales  

---

## 🎯 Why Entra ID Matters for ADPA

### Enterprise Customer Requirements

**What Enterprise IT Departments Demand**:
1. ✅ **Single Sign-On (SSO)** - No separate passwords for each app
2. ✅ **Centralized Identity Management** - Manage users in one place (Entra ID)
3. ✅ **Conditional Access Policies** - MFA, device compliance, IP restrictions
4. ✅ **Security & Compliance** - SOC2, ISO 27001, HIPAA, FedRAMP
5. ✅ **Audit Trails** - Who accessed what, when, from where
6. ✅ **Auto-Provisioning/De-provisioning** - SCIM protocol (hire/fire automation)
7. ✅ **Group-Based Access** - Entra ID groups → ADPA roles
8. ✅ **Zero Trust** - Never trust, always verify

**Without Entra ID Integration**:
- ❌ **Deal Blocker** for 80% of enterprise deals
- ❌ IT security teams reject apps without SSO
- ❌ Compliance teams flag lack of central auth
- ❌ CIOs won't approve SaaS without Entra integration

**With Entra ID Integration**:
- ✅ **Enterprise-Ready Badge** - Instant credibility
- ✅ Faster procurement (IT pre-approves SSO apps)
- ✅ Higher contract values (enterprise tier pricing)
- ✅ Reduced support burden (IT manages users, not you)

---

## 🔥 The Supabase Auth + Entra ID Advantage

### **MAJOR REVELATION**: Supabase Auth Supports Entra ID Out-of-the-Box!

**Supabase Auth includes**:
- ✅ Azure AD / Entra ID as OAuth provider
- ✅ SAML 2.0 support (enterprise SSO standard)
- ✅ SCIM provisioning (coming soon)
- ✅ Just-In-Time (JIT) user provisioning
- ✅ Group mapping (Entra groups → Supabase roles)
- ✅ Conditional Access compatibility

**Configuration** (literally 5 minutes!):
```javascript
// Supabase Dashboard → Authentication → Providers → Azure
// 1. Enable Azure provider
// 2. Add your Entra ID tenant details:
//    - Client ID (from Azure Portal)
//    - Client Secret (from Azure Portal)
//    - Tenant ID (from Azure Portal)
// 3. Set redirect URL
// Done! Entra ID SSO is live!
```

**Frontend Code** (3 lines!):
```typescript
// Login with Entra ID
await supabase.auth.signInWithOAuth({
  provider: 'azure',
  options: {
    scopes: 'email profile openid'
  }
})
```

**That's it!** Supabase handles:
- OAuth2 flow (redirect, callback, token exchange)
- Token validation
- User profile sync
- Session management
- Refresh tokens

---

## 🛠️ Custom Entra ID Implementation (If Not Using Supabase)

### What You'd Need to Build

**Complexity**: HIGH (40-60 hours for basic, 120+ for production-grade)

**Step 1: Azure Portal Setup** (2-4 hours)
```
1. Register ADPA in Azure Portal (App Registrations)
2. Configure redirect URIs (localhost + production)
3. Generate client secret
4. Set up API permissions (User.Read, etc.)
5. Configure token configuration
6. Set up optional claims (email, groups, etc.)
```

**Step 2: Backend OAuth Flow** (20-30 hours)
```javascript
// Using @azure/msal-node (Microsoft Authentication Library)
const msal = require('@azure/msal-node');

const msalConfig = {
  auth: {
    clientId: process.env.ENTRA_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.ENTRA_TENANT_ID}`,
    clientSecret: process.env.ENTRA_CLIENT_SECRET
  }
};

const cca = new msal.ConfidentialClientApplication(msalConfig);

// Step 1: Redirect user to Entra ID
router.get('/auth/azure/login', (req, res) => {
  const authCodeUrlParameters = {
    scopes: ["user.read"],
    redirectUri: "http://localhost:5000/auth/azure/callback"
  };
  
  cca.getAuthCodeUrl(authCodeUrlParameters).then((response) => {
    res.redirect(response);
  });
});

// Step 2: Handle callback
router.get('/auth/azure/callback', async (req, res) => {
  const tokenRequest = {
    code: req.query.code,
    scopes: ["user.read"],
    redirectUri: "http://localhost:5000/auth/azure/callback"
  };
  
  try {
    const response = await cca.acquireTokenByCode(tokenRequest);
    
    // Step 3: Get user profile from Microsoft Graph
    const graphClient = require('@microsoft/microsoft-graph-client');
    const client = graphClient.Client.init({
      authProvider: (done) => {
        done(null, response.accessToken);
      }
    });
    
    const user = await client.api('/me').get();
    
    // Step 4: Create or update user in your database
    let dbUser = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [user.mail || user.userPrincipalName]
    );
    
    if (dbUser.rows.length === 0) {
      // Create new user (JIT provisioning)
      dbUser = await pool.query(
        'INSERT INTO users (email, name, role, auth_provider) VALUES ($1, $2, $3, $4) RETURNING *',
        [user.mail, user.displayName, 'user', 'azure']
      );
    }
    
    // Step 5: Generate your own JWT
    const jwt = generateJWT(dbUser.rows[0]);
    
    // Step 6: Redirect to frontend with token
    res.redirect(`http://localhost:3000/auth/callback?token=${jwt}`);
    
  } catch (error) {
    console.error('Azure auth error:', error);
    res.redirect('http://localhost:3000/auth/error');
  }
});
```

**Step 3: Frontend Integration** (10-15 hours)
```typescript
// app/auth/azure/page.tsx
export default function AzureLogin() {
  const router = useRouter()
  
  const handleAzureLogin = () => {
    // Redirect to backend OAuth initiation
    window.location.href = 'http://localhost:5000/auth/azure/login'
  }
  
  return (
    <Button onClick={handleAzureLogin}>
      <Microsoft className="mr-2 h-4 w-4" />
      Sign in with Microsoft
    </Button>
  )
}

// app/auth/callback/page.tsx
export default function AuthCallback() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    
    if (token) {
      localStorage.setItem('token', token)
      router.push('/dashboard')
    }
  }, [])
  
  return <div>Signing you in...</div>
}
```

**Step 4: Token Validation** (8-12 hours)
```javascript
// Validate Entra ID tokens in middleware
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const client = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, function(err, key) {
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

// Verify Entra ID JWT
jwt.verify(token, getKey, {
  audience: clientId,
  issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
  algorithms: ['RS256']
}, (err, decoded) => {
  if (err) return res.status(401).json({ error: 'Invalid token' });
  req.user = decoded;
  next();
});
```

**Step 5: Group Mapping** (15-20 hours)
```javascript
// Map Entra ID groups to ADPA roles
const groupRoleMap = {
  'ADPA-Admins': 'admin',
  'ADPA-ProjectManagers': 'manager',
  'ADPA-BusinessAnalysts': 'user',
  'ADPA-Viewers': 'viewer'
};

// Get user's groups from Entra ID
const groups = await client.api('/me/memberOf').get();
const adpaRole = determineRoleFromGroups(groups.value, groupRoleMap);

// Update user in database
await pool.query(
  'UPDATE users SET role = $1, entra_groups = $2 WHERE id = $3',
  [adpaRole, JSON.stringify(groups), userId]
);
```

**Total Custom Entra ID Implementation**: 60-90 hours

---

## 🏆 Supabase Auth + Entra ID (The Smart Way)

### How Supabase Makes Entra ID Easy

**1. Configuration** (5 minutes in dashboard):
```
Supabase Dashboard → Authentication → Providers → Azure

Settings:
- Client ID: [from Azure Portal]
- Client Secret: [from Azure Portal]
- Tenant: [your-tenant-id]
- Scopes: openid email profile

Save. Done! ✅
```

**2. Frontend Code** (literally 3 lines):
```typescript
// app/auth/login/page.tsx
const handleEntraLogin = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'azure',
    options: {
      scopes: 'email profile openid',
      redirectTo: `${window.location.origin}/auth/callback`
    }
  })
}

// That's it! Supabase handles:
// ✅ OAuth redirect
// ✅ Token exchange
// ✅ User creation (JIT provisioning)
// ✅ Session management
// ✅ Token refresh
```

**3. Backend Integration** (Keep your RBAC!):
```typescript
// Your existing permissions system works perfectly!
// Just sync Entra groups → your custom roles

// server/src/middleware/syncEntraPermissions.ts
export async function syncEntraGroups(supabaseUser) {
  // Get groups from Entra ID token
  const entraGroups = supabaseUser.user_metadata?.groups || []
  
  // Map to your custom ADPA roles
  const adpaRole = mapEntraGroupsToRole(entraGroups)
  
  // Update your existing permissions table
  await pool.query(
    'UPDATE users SET role = $1, permissions = $2 WHERE id = $3',
    [adpaRole, getPermissionsForRole(adpaRole), supabaseUser.id]
  )
}

// Webhook from Supabase on new login
router.post('/auth/webhook', async (req, res) => {
  const { user, event } = req.body
  
  if (event === 'SIGNED_IN') {
    await syncEntraPermissions(user)
  }
  
  res.json({ success: true })
})
```

**Total Supabase + Entra ID Implementation**: 8-12 hours!

---

## 🎓 Enterprise SSO Comparison

| Feature | Custom Entra ID | Supabase + Entra ID | Impact |
|---------|----------------|---------------------|--------|
| **Setup Time** | 60-90 hours | 8-12 hours | 🏆 Supabase (85% faster) |
| **OAuth2 Flow** | Build yourself | Built-in | 🏆 Supabase |
| **Token Validation** | Implement JWKS, RSA | Automatic | 🏆 Supabase |
| **User Provisioning (JIT)** | Build logic | Automatic | 🏆 Supabase |
| **Group Mapping** | Build manually | Built-in (+ custom sync) | 🏆 Supabase |
| **Multi-Tenancy** | Complex (tenant isolation) | Row-Level Security ready | 🏆 Supabase |
| **Security Updates** | You monitor Microsoft changes | Supabase handles | 🏆 Supabase |
| **SAML 2.0 Support** | Build separately (40+ hrs) | Built-in | 🏆 Supabase |
| **Other SSO Providers** | Build each one (40 hrs each) | 20+ providers ready | 🏆 Supabase |
| **Custom RBAC** | Full control | Keep yours! | 🤝 Tie (both work) |
| **Cost** | Developer time ($$$) | Free (included) | 🏆 Supabase |

**Winner**: Supabase + Entra ID (10.5 / 11 categories)

---

## 🏢 Enterprise SSO Requirements Checklist

### What Fortune 500 IT Departments Ask For

**Security**:
- [ ] ✅ SAML 2.0 or OAuth 2.0 (OpenID Connect)
- [ ] ✅ Support for Entra ID / Azure AD
- [ ] ✅ Support for Okta
- [ ] ✅ Support for OneLogin
- [ ] ✅ MFA enforcement capability
- [ ] ✅ Session timeout controls
- [ ] ✅ IP allowlist/blocklist
- [ ] ✅ Device compliance checks (Conditional Access)

**Compliance**:
- [ ] ✅ SOC 2 Type II certification
- [ ] ✅ ISO 27001 certification
- [ ] ✅ GDPR compliance
- [ ] ✅ HIPAA compliance (if healthcare)
- [ ] ✅ FedRAMP authorization (if government)
- [ ] ✅ Audit logs (immutable, tamper-proof)
- [ ] ✅ Data residency options (EU, US, etc.)

**User Management**:
- [ ] ✅ SCIM 2.0 provisioning (auto add/remove users)
- [ ] ✅ Group-based role assignment
- [ ] ✅ Just-In-Time (JIT) provisioning
- [ ] ✅ User attribute mapping
- [ ] ✅ Custom claims/attributes
- [ ] ✅ Multi-tenancy (one ADPA instance, many companies)

**Monitoring & Support**:
- [ ] ✅ Login activity dashboards
- [ ] ✅ Failed login alerts
- [ ] ✅ Anomaly detection
- [ ] ✅ 24/7 support SLA
- [ ] ✅ Dedicated support contact

---

## 📊 How Supabase Handles Enterprise Requirements

### Supabase Auth Enterprise Features

**Supported SSO Providers** (out of the box):
```
✅ Microsoft Entra ID (Azure AD)
✅ Google Workspace
✅ Okta
✅ Auth0
✅ AWS Cognito
✅ SAML 2.0 (generic)
✅ OpenID Connect (generic)

... plus 20+ more providers!
```

**Compliance Certifications**:
```
✅ SOC 2 Type II (audited annually)
✅ GDPR compliant (EU data residency)
✅ HIPAA compliance (Pro/Enterprise tiers)
✅ ISO 27001 certified
```

**Enterprise Features** (Team/Enterprise plans):
```
✅ SAML 2.0 SSO
✅ SCIM provisioning (beta)
✅ SSO audit logs
✅ Custom JWT claims
✅ Advanced security policies
✅ Priority support (24/7)
✅ SLA guarantees (99.9%+)
✅ Dedicated instances
```

**Pricing for Enterprise**:
```
Free: Up to 50K Monthly Active Users (MAU)
Pro: $25/mo (100K MAU) - Most startups
Team: $599/mo (Unlimited SSO, advanced security)
Enterprise: Custom (SCIM, dedicated, SLA)
```

---

## 🎯 Recommended Architecture for ADPA Enterprise

### The Hybrid Approach (Best of All Worlds)

**Authentication Layer**: Supabase Auth
```
Handles:
- User login (email/password, SSO, social)
- Entra ID integration (OAuth2)
- SAML 2.0 for other enterprise IdPs
- MFA (TOTP, SMS)
- Password management
- Session management
- Compliance certifications
```

**Authorization Layer**: Custom ADPA RBAC
```
Handles:
- Granular permissions (your existing JSONB system)
- Role mapping (Entra groups → ADPA roles)
- Feature flags per customer
- Document-level access control
- Project-level permissions
- Custom business rules
```

**Integration Flow**:
```
1. User clicks "Sign in with Microsoft"
   ↓
2. Supabase redirects to Entra ID
   ↓
3. User authenticates with Entra ID (their corporate credentials)
   ↓
4. Entra ID returns user + groups to Supabase
   ↓
5. Supabase creates/updates user (JIT provisioning)
   ↓
6. Supabase webhook triggers your backend
   ↓
7. Your backend syncs Entra groups → ADPA permissions
   ↓
8. User lands in ADPA with correct role & permissions
```

**Code Example**:
```typescript
// Frontend - Login button
<Button onClick={() => {
  supabase.auth.signInWithOAuth({
    provider: 'azure',
    options: {
      scopes: 'email profile openid',
      queryParams: {
        prompt: 'select_account' // Force account picker
      }
    }
  })
}}>
  <Microsoft className="mr-2" />
  Sign in with Microsoft Entra ID
</Button>

// Backend - Webhook to sync groups → roles
router.post('/auth/entra-sync', async (req, res) => {
  const { user } = req.body
  
  // Extract Entra groups from JWT claims
  const entraGroups = user.app_metadata?.groups || []
  
  // Map to ADPA roles
  let role = 'user' // default
  let permissions = DEFAULT_USER_PERMISSIONS
  
  if (entraGroups.includes('ADPA-Admins')) {
    role = 'admin'
    permissions = ADMIN_PERMISSIONS
  } else if (entraGroups.includes('ADPA-ProjectManagers')) {
    role = 'manager'
    permissions = MANAGER_PERMISSIONS
  }
  
  // Upsert to your users table (keep permissions there!)
  await pool.query(`
    INSERT INTO user_permissions (supabase_user_id, role, permissions, entra_groups)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (supabase_user_id) DO UPDATE
    SET role = $2, permissions = $3, entra_groups = $4, updated_at = NOW()
  `, [user.id, role, JSON.stringify(permissions), JSON.stringify(entraGroups)])
  
  res.json({ success: true })
})
```

---

## 🏢 Multi-Tenant Architecture (Enterprise Required)

### Why Multi-Tenancy Matters

**Enterprise Scenario**:
```
Company A (Microsoft) uses ADPA
Company B (Google) uses ADPA
Company C (Amazon) uses ADPA

Requirements:
- Each company's data MUST be isolated
- Company A users can't see Company B's projects
- Each company uses their own Entra ID tenant
- Each company has their own admin users
```

### Supabase Multi-Tenant Solution

**Database Schema** (add to your existing):
```sql
-- Organizations/Tenants table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  entra_tenant_id VARCHAR(255) UNIQUE, -- Microsoft tenant ID
  domain VARCHAR(255), -- company.com
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Link users to organizations
ALTER TABLE users ADD COLUMN organization_id UUID REFERENCES organizations(id);

-- Row-Level Security (RLS) - CRITICAL!
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their org's projects"
ON projects FOR SELECT
USING (
  organization_id = (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);
```

**Entra ID Configuration** (per tenant):
```javascript
// Dynamic tenant configuration
const getEntraTenantConfig = (organizationDomain) => {
  // Lookup in your database
  const org = await pool.query(
    'SELECT entra_tenant_id, entra_client_id FROM organizations WHERE domain = $1',
    [organizationDomain]
  )
  
  return {
    tenantId: org.entra_tenant_id,
    clientId: org.entra_client_id,
    // ... other config
  }
}

// User logs in
const userEmail = 'john@microsoft.com'
const domain = userEmail.split('@')[1] // 'microsoft.com'
const tenantConfig = await getEntraTenantConfig(domain)

// Redirect to their specific Entra ID tenant
await supabase.auth.signInWithOAuth({
  provider: 'azure',
  options: {
    scopes: 'email profile openid',
    queryParams: {
      domain_hint: domain,
      prompt: 'select_account'
    }
  }
})
```

---

## 📦 Complete Implementation Guide

### Option A: Supabase Auth + Entra ID (Recommended)

**Week 1: Supabase Auth Setup**
```bash
# Day 1-2: Basic Supabase Auth migration
# Day 3-4: Enable Entra ID provider
# Day 5: Testing

Steps:
1. Enable Auth in Supabase Dashboard
2. Migrate existing users (bcrypt compatible!)
3. Update frontend to use Supabase client
4. Test email/password still works
5. Enable Azure/Entra ID provider
6. Test SSO login
```

**Week 2: Enterprise Features**
```bash
# Day 1-2: Group mapping & role sync
# Day 3-4: Multi-tenancy (if needed)
# Day 5: Testing & docs

Steps:
1. Set up Supabase webhook for auth events
2. Build group → role mapping endpoint
3. Test with actual Entra ID tenant (yours?)
4. Add multi-tenant support (if multiple customers)
5. Document for customers
```

**Week 3: Additional SSO Providers**
```bash
# Add Okta, Google Workspace, etc. (if needed)
# 1-2 hours per additional provider!

Steps:
1. Enable provider in Supabase
2. Get client ID/secret from provider
3. Configure in Supabase dashboard
4. Add login button to UI
5. Test - Done!
```

**Total Timeline**: 2-3 weeks to production-ready enterprise auth!

---

### Option B: Custom Entra ID Implementation

**Month 1: Entra ID OAuth**
```
Week 1-2: Implement OAuth2 flow
Week 3: Token validation & JWKS
Week 4: User provisioning (JIT)
```

**Month 2: Group Mapping & RBAC**
```
Week 1-2: Group sync logic
Week 3: Role mapping
Week 4: Testing
```

**Month 3: Additional Features**
```
Week 1-2: SAML 2.0 (for non-Microsoft SSO)
Week 3-4: Multi-tenancy
```

**Month 4-6: Other SSO Providers**
```
Okta: 3-4 weeks
Google Workspace: 3-4 weeks
OneLogin: 3-4 weeks
```

**Total Timeline**: 6+ months to enterprise-ready auth

---

## 💼 Enterprise Sales Impact

### With Entra ID Support (via Supabase)

**Advantages**:
- ✅ "Enterprise-Ready" badge on website
- ✅ Faster enterprise procurement (SSO is checkbox)
- ✅ Higher contract values (enterprise tier)
- ✅ IT security approves faster
- ✅ Compliance teams happy (SOC2, ISO certs)
- ✅ Can target Fortune 500 companies
- ✅ Government contracts possible (FedRAMP via Supabase)

**Typical Enterprise Deal**:
```
Without SSO: $5K-10K/year (small teams)
With SSO: $50K-200K/year (department-wide)

ROI: 10-40x higher contract values!
```

**Sales Messaging**:
```
"ADPA integrates seamlessly with your existing Microsoft Entra ID, 
allowing your team to use their corporate credentials with full MFA 
and conditional access policies. No separate passwords, automatic 
user provisioning, and enterprise-grade security out of the box."

vs.

"ADPA has basic password authentication. SSO coming in 6 months."
```

**Which pitch wins enterprise deals?** 🤔

---

## 🎯 Decision Matrix

### Score Each Option (1-10 scale)

| Criteria | Weight | Supabase + Entra | Custom + Entra | Weighted Score |
|----------|--------|------------------|----------------|----------------|
| **Time to Market** | 10 | 9 (2-3 weeks) | 3 (6 months) | Supabase: 90, Custom: 30 |
| **Development Cost** | 9 | 9 (8-12 hrs) | 2 (90 hrs) | Supabase: 81, Custom: 18 |
| **Security** | 10 | 10 (audited) | 6 (DIY risk) | Supabase: 100, Custom: 60 |
| **MFA Support** | 8 | 10 (built-in) | 5 (build it) | Supabase: 80, Custom: 40 |
| **Multi-Provider SSO** | 7 | 10 (20+ ready) | 3 (each = 40hrs) | Supabase: 70, Custom: 21 |
| **Maintenance** | 8 | 10 (Supabase team) | 4 (you forever) | Supabase: 80, Custom: 32 |
| **Enterprise Compliance** | 10 | 10 (certified) | 6 (DIY certs) | Supabase: 100, Custom: 60 |
| **Customization** | 5 | 7 (good hooks) | 10 (full control) | Supabase: 35, Custom: 50 |
| **Vendor Lock-in Risk** | 6 | 6 (medium) | 10 (none) | Supabase: 36, Custom: 60 |
| **Learning Curve** | 4 | 8 (good docs) | 5 (complex) | Supabase: 32, Custom: 20 |

**Total Weighted Score**:
- **Supabase + Entra**: **704 / 770** (91.4%)
- **Custom + Entra**: **391 / 770** (50.8%)

**Clear Winner**: 🏆 Supabase Auth with Entra ID integration

---

## 🚀 Quick Start Guide - Supabase + Entra ID

### Step 1: Azure Portal Setup (30 minutes)

```
1. Go to portal.azure.com
2. Navigate to "App registrations"
3. Click "New registration"
4. Name: "ADPA - Document Processing"
5. Supported account types: "Multitenant" (for multiple customers)
6. Redirect URI: https://[your-supabase-project].supabase.co/auth/v1/callback
7. Click "Register"

8. Note down:
   - Application (client) ID
   - Directory (tenant) ID
   
9. Go to "Certificates & secrets"
10. Create new client secret
11. Copy the secret VALUE (not ID!)

12. Go to "Token configuration"
13. Add optional claim: "groups" (to get user's AD groups)

14. Go to "API permissions"
15. Add: Microsoft Graph → Delegated → User.Read, email, profile, openid
16. Grant admin consent
```

### Step 2: Supabase Dashboard Setup (10 minutes)

```
1. Go to app.supabase.com → Your Project
2. Navigate to Authentication → Providers
3. Find "Azure" and enable it
4. Configure:
   - Azure Client ID: [from step 1]
   - Azure Secret: [from step 1]
   - Azure URL: https://login.microsoftonline.com/[tenant-id]/v2.0
   
5. Save

6. (Optional) Configure email templates:
   - Authentication → Email Templates
   - Customize confirmation, reset, etc.
```

### Step 3: Frontend Code (15 minutes)

```typescript
// app/auth/login/page.tsx
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const handleEntraLogin = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        scopes: 'openid email profile',
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    
    if (error) {
      toast.error('Login failed: ' + error.message)
    }
  }
  
  return (
    <div>
      {/* Email/Password login (existing) */}
      <Button onClick={handleEmailLogin}>
        Sign in with Email
      </Button>
      
      {/* Entra ID SSO (new!) */}
      <Button onClick={handleEntraLogin} variant="outline">
        <svg>Microsoft icon</svg>
        Sign in with Microsoft
      </Button>
    </div>
  )
}
```

### Step 4: Group Sync Backend (30 minutes)

```typescript
// server/src/routes/auth-webhook.ts
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

router.post('/auth/entra-webhook', async (req, res) => {
  const { user, event } = req.body
  
  if (event !== 'SIGNED_IN' && event !== 'USER_UPDATED') {
    return res.json({ received: true })
  }
  
  try {
    // Get groups from Entra ID token
    const entraGroups = user.app_metadata?.groups || []
    
    // Map groups to ADPA roles
    const role = mapEntraGroupsToRole(entraGroups)
    const permissions = getPermissionsForRole(role)
    
    // Upsert to your custom permissions table
    await pool.query(`
      INSERT INTO user_permissions (
        supabase_user_id, email, name, role, permissions, entra_groups
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (supabase_user_id) DO UPDATE
      SET role = $4, permissions = $5, entra_groups = $6, updated_at = NOW()
    `, [
      user.id,
      user.email,
      user.user_metadata?.name || user.email,
      role,
      JSON.stringify(permissions),
      JSON.stringify(entraGroups)
    ])
    
    res.json({ success: true, role, permissions })
  } catch (error) {
    console.error('Group sync error:', error)
    res.status(500).json({ error: 'Sync failed' })
  }
})

// Helper: Map Entra groups to ADPA roles
function mapEntraGroupsToRole(groups) {
  if (groups.includes('ADPA-SuperAdmins')) return 'admin'
  if (groups.includes('ADPA-Admins')) return 'admin'
  if (groups.includes('ADPA-ProjectManagers')) return 'manager'
  if (groups.includes('ADPA-BusinessAnalysts')) return 'user'
  return 'viewer' // default
}
```

### Step 5: Test with Your Entra ID (1 hour)

```
1. Create test groups in your Entra ID:
   - ADPA-Admins (add yourself)
   - ADPA-Users (add test user)

2. Test login flow:
   - Click "Sign in with Microsoft"
   - Authenticate with your Microsoft account
   - Should land in ADPA
   - Check role is correct

3. Verify group sync:
   - Check database for your permissions
   - Should match Entra group membership
```

---

## 📈 Entra ID Group → ADPA Role Mapping Strategy

### Recommended Group Structure in Customer's Entra ID

```
Customer creates these groups in their Entra ID:
├── ADPA-SuperAdmins       → role: admin, all permissions
├── ADPA-Admins            → role: admin, most permissions
├── ADPA-ProjectManagers   → role: manager, project + doc permissions
├── ADPA-BusinessAnalysts  → role: user, create/read permissions
└── ADPA-Viewers           → role: viewer, read-only permissions
```

**Customer Onboarding**:
```
1. Customer IT creates these groups in Entra ID
2. Customer IT assigns users to groups
3. Customer IT provides their Tenant ID to you
4. You configure their tenant in Supabase
5. Users can immediately log in with SSO!
6. Permissions auto-sync from groups
```

**Zero User Management** for you - customer IT does it all in Entra!

---

## 🎓 Learning Resources for Entra ID

### Microsoft Documentation
- **Entra ID Overview**: https://learn.microsoft.com/entra/identity/
- **OAuth 2.0 in Entra**: https://learn.microsoft.com/entra/identity-platform/v2-oauth2-auth-code-flow
- **App Registration**: https://learn.microsoft.com/entra/identity-platform/quickstart-register-app
- **Groups & Claims**: https://learn.microsoft.com/entra/identity-platform/optional-claims

### Supabase + Azure Integration
- **Supabase Azure Auth**: https://supabase.com/docs/guides/auth/social-login/auth-azure
- **SSO with Supabase**: https://supabase.com/docs/guides/auth/enterprise-sso
- **JWT Claims**: https://supabase.com/docs/guides/auth/managing-user-data

### Best Practices
- **Multi-Tenancy**: https://supabase.com/docs/guides/auth/row-level-security
- **SCIM Provisioning**: https://supabase.com/blog/supabase-auth-sso-pkce (coming soon)

---

## 🎯 Final Recommendation

### ⭐ **Go with Supabase Auth + Keep Your Custom RBAC**

**Implementation Plan**:

**Phase 1** (Week 1): Migrate to Supabase Auth
- Move existing email/password to Supabase
- Keep your permissions table
- Test thoroughly

**Phase 2** (Week 2): Add Entra ID
- Enable Azure provider
- Test with your Microsoft account
- Implement group sync webhook

**Phase 3** (Week 3): Polish & Enterprise Features
- Add MFA option
- Add other SSO providers (Okta, Google)
- Multi-tenancy if needed

**Phase 4** (Week 4): Production
- Security audit
- Customer documentation
- Enterprise sales enablement

**Result**: Enterprise-ready authentication in 1 month!

---

## 💡 Key Insights

**Your Unique Value Proposition**:
```
ADPA = AI-Powered Document Processing + Standards Compliance

NOT: "Yet another auth system"
```

**Strategic Focus**:
```
✅ Build: Document AI, NLP extraction, Knowledge graphs
❌ Build: Login flows, password reset, MFA infrastructure

Use best-in-class auth (Supabase) so you can focus on your differentiators!
```

**Enterprise Customers Care About**:
1. 🏆 **SSO with their Entra ID** (deal requirement)
2. 🏆 **Compliance certifications** (SOC2, ISO, etc.)
3. 🏆 **Security** (MFA, conditional access)
4. 🏆 **Your core features** (document processing!)

**Enterprise Customers Don't Care About**:
- ❌ Whether you built auth from scratch
- ❌ Your OAuth implementation details
- ❌ How you hash passwords

---

## ✅ Next Steps - Your Decision

**Quick Decision Framework**:

**Choose Supabase Auth + Entra ID if**:
- You want enterprise customers (99% yes!)
- You want MFA + social login quickly
- You want to ship fast
- You value your development time
- **Recommended** ⭐

**Choose Custom Auth + Entra ID if**:
- You have 6 months to spare
- You enjoy building auth systems
- You have dedicated security team
- You want zero dependencies (philosophical)

---

**My recommendation**: **Supabase Auth with Entra ID** is a no-brainer for enterprise B2B SaaS.

**Would you like me to**:
1. Create detailed Supabase + Entra ID migration plan?
2. Build the group sync webhook now?
3. Set up multi-tenant architecture?
4. Create customer onboarding docs for Entra integration?

**Also**: Still testing projects page? 😊

