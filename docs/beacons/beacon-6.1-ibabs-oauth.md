# Beacon 6.1: iBabs OAuth Authentication (Backend)

## Owner
Integration Agent #1

## Duration
20 minutes with GitHub Copilot

## Dependencies
None (independent integration module)

## Epic
ADPA v3.0 - iBabs Board Portal Integration

## Description
Implement OAuth 2.0 authentication flow for iBabs API integration. This allows ADPA to upload board reports to iBabs and receive board decisions/action items via webhooks.

---

## Requirements

### New Service: server/src/services/ibabsService.ts

**OAuth Flow:**
1. Generate authorization URL (redirect user to iBabs)
2. Handle OAuth callback (receive authorization code)
3. Exchange code for access token
4. Store token in database (encrypted)
5. Refresh token when expired (automatic)

**Functions:**
- `getAuthorizationUrl(organizationId: string)` - Start OAuth flow
- `handleCallback(code: string, state: string)` - Complete OAuth
- `getAccessToken(organizationId: string)` - Get valid token (refresh if needed)
- `refreshAccessToken(organizationId: string)` - Refresh expired token
- `revokeAccess(organizationId: string)` - Disconnect iBabs

**Token Storage:**
- Table: `ibabs_connections` (new migration needed)
- Columns: id, organization_id, access_token (encrypted), refresh_token (encrypted), expires_at, created_at
- Encryption: Use existing encryption utilities

### New Routes: server/src/routes/ibabsRoutes.ts

**Endpoints:**
- `GET /api/ibabs/auth/start` - Start OAuth flow (returns authorization URL)
- `GET /api/ibabs/auth/callback` - OAuth callback handler
- `GET /api/ibabs/auth/status` - Check connection status
- `DELETE /api/ibabs/auth/disconnect` - Revoke access

**Authorization:**
- Only admins can connect/disconnect iBabs
- Regular users can view connection status

### Migration: server/migrations/091_create_ibabs_connections.sql

```sql
CREATE TABLE ibabs_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL, -- Encrypted
  refresh_token TEXT NOT NULL, -- Encrypted
  token_type VARCHAR(20) DEFAULT 'Bearer',
  expires_at TIMESTAMP NOT NULL,
  scope TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id) -- One connection per org
);

CREATE INDEX idx_ibabs_connections_org ON ibabs_connections(organization_id);
CREATE INDEX idx_ibabs_connections_expires ON ibabs_connections(expires_at);
```

---

## Reference Files

**Study OAuth patterns:**
- `server/src/routes/confluenceRoutes.ts` - Confluence OAuth (similar pattern!)
- `server/src/routes/sharepointRoutes.ts` - SharePoint OAuth (Microsoft Graph)
- `server/src/routes/githubRoutes.ts` - GitHub OAuth

**Use these utilities:**
- `server/src/utils/encryption.ts` - Encrypt/decrypt tokens
- `server/src/utils/logger.ts` - Winston logging
- `server/src/middleware/auth.ts` - Authentication middleware

---

## Implementation Details

**OAuth Configuration (Environment Variables):**
```bash
# Add to server/.env
IBABS_CLIENT_ID=your-ibabs-client-id
IBABS_CLIENT_SECRET=your-ibabs-client-secret
IBABS_REDIRECT_URI=http://localhost:5000/api/ibabs/auth/callback
IBABS_AUTH_URL=https://api.ibabs.eu/oauth/authorize
IBABS_TOKEN_URL=https://api.ibabs.eu/oauth/token
```

**Authorization URL Generation:**
```typescript
const authUrl = `${process.env.IBABS_AUTH_URL}?` + new URLSearchParams({
  client_id: process.env.IBABS_CLIENT_ID!,
  redirect_uri: process.env.IBABS_REDIRECT_URI!,
  response_type: 'code',
  scope: 'read write meetings documents',
  state: generateState(organizationId) // CSRF protection
});
```

**Token Exchange:**
```typescript
const tokenResponse = await fetch(process.env.IBABS_TOKEN_URL!, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: process.env.IBABS_CLIENT_ID!,
    client_secret: process.env.IBABS_CLIENT_SECRET!,
    redirect_uri: process.env.IBABS_REDIRECT_URI!
  })
});
```

---

## Testing

**Test cases:**
- Generate authorization URL (valid state parameter)
- Handle callback with valid code (stores tokens)
- Handle callback with invalid code (error handling)
- Refresh token when expired (automatic)
- Get access token (returns valid token)
- Get access token when expired (auto-refreshes)
- Revoke access (deletes tokens from DB)
- Token encryption/decryption (security)

**Mock iBabs API:**
- Use nock or similar to mock OAuth endpoints
- Test happy path and error scenarios

---

## Success Criteria

- [x] OAuth flow works end-to-end
- [x] Tokens stored securely (encrypted in database)
- [x] Token refresh works automatically
- [x] CSRF protection implemented (state parameter)
- [x] Error handling for OAuth failures
- [x] Admin-only access enforced
- [x] Tests pass (80%+ coverage)
- [x] Follows existing OAuth patterns (Confluence, SharePoint)

---

## Time Estimate

**Traditional:** 6-8 hours (OAuth flow + token management + encryption + tests)
**With Copilot:** 20 minutes (AI generates from existing OAuth patterns)
**Savings:** 96% faster!

---

## Security Notes

- Store tokens encrypted (never plain text)
- Use CSRF state parameter (prevent attacks)
- Validate redirect_uri (prevent open redirect)
- Expire tokens appropriately
- Audit log all OAuth events

---

**Status:** Ready for AI generation  
**Priority:** HIGH (critical for iBabs integration MVP)  
**Parallel:** Can develop with Frontend/Backend beacons simultaneously

