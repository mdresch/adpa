# Encryption Key Management

## Overview

This document describes the **envelope encryption** system used in ADPA for securing sensitive data such as AI Gateway API keys.

## Evolution of Security

### ❌ v1.0 (Original Problem)
The `ENCRYPTION_KEY` was randomly generated at each server startup, causing data loss after restarts.

### ⚠️ v1.1 (First Fix - Basic Persistence)
Master key stored in database unencrypted. **Security Risk**: Database compromise = total key exposure.

### ✅ v2.0 (Current - Envelope Encryption)
**Two-layer protection** using a Key Encryption Key (KEK):
- **KEK** (stored in environment/vault) encrypts the **Master Key**
- **Master Key** (encrypted in database) encrypts **API keys and sensitive data**

**Benefit**: Attacker needs **both** database access **and** KEK to decrypt data.

## The Solution: Envelope Encryption

The encryption key management now uses **defense-in-depth** with envelope encryption:

1. **KEK from Environment** (PRODUCTION - Most Secure):
   - Set `ENCRYPTION_KEK` environment variable
   - KEK never stored in database
   - Master key encrypted with KEK before database storage
   
2. **KEK from Database** (DEVELOPMENT Fallback):
   - Auto-generated KEK stored in `system_settings.kek_master`
   - Warning logged on every startup
   - **Not recommended for production**
   
3. **Master Key Management**:
   - Master key generated on first run
   - Encrypted with KEK before storage
   - Stored in `system_settings.master_encryption_key` (encrypted)
   - Decrypted on startup using KEK

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     ENVELOPE ENCRYPTION                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  KEK (Environment)  ────────────────┐                       │
│  Never in DB        256-bit key     │                       │
│                                      ▼                       │
│                            ┌──────────────────┐             │
│                            │ Encrypt/Decrypt  │             │
│                            └──────────────────┘             │
│                                      │                       │
│                                      ▼                       │
│  Database stores:          Master Encryption Key            │
│  ├─ Encrypted Master Key   (Encrypted with KEK)            │
│  ├─ Encrypted API Keys     ────────┐                       │
│  └─ Application Data               │                       │
│                                     ▼                       │
│                            ┌──────────────────┐             │
│                            │ Encrypt/Decrypt  │             │
│                            └──────────────────┘             │
│                                     │                       │
│                                     ▼                       │
│                            AI Gateway API Key               │
│                            (Plaintext in memory only)       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Production Setup (REQUIRED)

### Step 1: Generate a Secure KEK

Use the provided script to generate a cryptographically secure KEK:

```bash
# Using Node.js/TypeScript
npx tsx server/scripts/generate-kek.ts

# Or using PowerShell
pwsh server/scripts/generate-kek.ps1
```

This will generate a 256-bit (32-byte) KEK and display setup instructions.

**Example output:**
```
🔐 KEK (Key Encryption Key) Generator
=====================================

Generated KEK (keep this secure!):

  a3f5c8e2d1b9047a6e3c2d8f1a5b7c4e9d2f1a8b3c6e5d4f7a9b2c1e8d3f6a5b
```

### Step 2: Set the KEK in Your Environment

#### Railway (Recommended for Production)

1. Go to your Railway project settings
2. Navigate to **Variables** tab
3. Add a new variable:
   - **Name**: `ENCRYPTION_KEK`
   - **Value**: `<your_generated_kek_from_step_1>`
4. **Important**: Do NOT set `ENCRYPTION_KEY` (deprecated, insecure)

#### Vercel (if using Vercel Functions)

```bash
vercel env add ENCRYPTION_KEK
# Paste your KEK when prompted
```

#### Docker / Docker Compose

Add to your `docker-compose.yml`:

```yaml
services:
  backend:
    environment:
      - ENCRYPTION_KEK=<your_generated_kek>
```

Or in `.env` file:

```bash
ENCRYPTION_KEK=<your_generated_kek>
```

#### AWS / Azure / GCP

**Best Practice**: Use a secrets manager:

- **AWS**: AWS Secrets Manager or Parameter Store
- **Azure**: Azure Key Vault
- **GCP**: Google Secret Manager

Example with AWS Secrets Manager:
```bash
aws secretsmanager create-secret \
  --name adpa/encryption-kek \
  --secret-string "<your_generated_kek>"
```

Then in your application startup, retrieve it:
```typescript
const kek = await getSecretValue('adpa/encryption-kek')
process.env.ENCRYPTION_KEK = kek
```

### Step 3: Restart and Verify

After setting `ENCRYPTION_KEK`, restart your backend server:

```bash
# The server will log:
✅ Using ENCRYPTION_KEK from environment variable (secure)
✅ Generated new master encryption key and encrypted it with KEK
# or
✅ Loaded and decrypted master encryption key from database
```

**Success indicators:**
- ✅ No "CRITICAL" warnings in logs
- ✅ No "temporary KEK" warnings
- ✅ AI Gateway settings save and load correctly

### Development Fallback (NOT for Production)

If `ENCRYPTION_KEK` is not set, the system will:

1. Generate a KEK on first startup
2. Store it in `system_settings.kek_master` (unencrypted)
3. Use it to encrypt the master key
4. Log a warning on every startup

**⚠️ This is ONLY suitable for local development!**

## Migration

Run the migration to create the `system_settings` table:

```bash
psql $DATABASE_URL -f server/migrations/009_create_system_settings.sql
```

## Key Rotation

To rotate the encryption key (e.g., for security compliance):

1. **Export existing encrypted data** (decrypt with old key)
2. **Update the `ENCRYPTION_KEY`** environment variable or database entry
3. **Re-encrypt all data** with the new key
4. **Restart the server**

**Warning**: Simply changing the key without re-encrypting data will make all existing encrypted data unreadable!

## Security Best Practices

### Critical Do's ✅

1. **Always set `ENCRYPTION_KEK` in production** (never use database fallback)
2. **Use a secrets manager** for enterprise deployments:
   - AWS Secrets Manager
   - Azure Key Vault
   - Google Secret Manager
   - HashiCorp Vault
3. **Never commit KEK** to version control (add to `.gitignore`)
4. **Backup both**:
   - Database (contains encrypted master key)
   - KEK (stored separately in secrets manager)
5. **Monitor logs** for encryption errors:
   - "KEK mismatch" = KEK changed/lost
   - "CRITICAL" warnings = insecure fallback in use
6. **Rotate keys periodically** (see Key Rotation section below)

### Critical Don'ts ❌

1. **Never store KEK in database** in production
2. **Never log or print the KEK** in application code
3. **Never share KEK via email/chat** (use secure channels only)
4. **Never use the same KEK** across different environments (dev/staging/prod)
5. **Never store KEK in code** or config files committed to git

### Threat Model

This envelope encryption protects against:

| Threat | Protected? | How |
|--------|-----------|-----|
| **Database compromise** | ✅ Yes | Master key encrypted; attacker needs KEK |
| **Code repository leak** | ✅ Yes | KEK in environment, not in code |
| **SQL injection** | ✅ Yes | Can't decrypt without KEK |
| **Database backup theft** | ✅ Yes | Master key encrypted in backups |
| **Insider threat (DB access only)** | ✅ Yes | Can't decrypt without KEK from environment |
| **Server memory dump** | ⚠️ Partial | Plaintext keys in memory during use |
| **Compromised env + DB** | ❌ No | Attacker has both components |
| **Key logger on server** | ❌ No | Can capture KEK from environment |

**Defense-in-depth**: Use additional controls (network isolation, MFA, audit logs, intrusion detection)

## Troubleshooting

### "KEK mismatch - cannot decrypt master key" Error

**Cause**: The `ENCRYPTION_KEK` has changed since the master key was encrypted.

**Solution**:
1. **Restore the original KEK** from your secrets manager or backup
2. If KEK is permanently lost:
   - ⚠️ All encrypted data is **unrecoverable**
   - You must re-enter all API keys manually
   - Generate a new KEK and restart

### "Failed to decrypt AI Gateway API key" Error

**Cause**: Master encryption key or KEK has changed.

**Solutions**:
1. Verify `ENCRYPTION_KEK` is set correctly in environment
2. Check server logs for "KEK mismatch" warnings
3. Ensure KEK hasn't been rotated without re-encrypting data
4. If keys are lost, re-enter API keys in settings

### "⚠️ Using KEK from database (development only)" Warning

**Cause**: `ENCRYPTION_KEK` environment variable not set; using database fallback.

**Impact**: 
- Development: OK ✅
- Production: **Security risk** ❌

**Solution**:
1. Generate a KEK: `pwsh server/scripts/generate-kek.ps1`
2. Set `ENCRYPTION_KEK` in your environment (Railway/Vercel/Docker)
3. Restart server
4. Warning will disappear

### "🚨 CRITICAL: Using temporary KEK" Error

**Cause**: Could not initialize KEK from environment or database.

**Impact**: All encrypted data will be **lost on restart**!

**Solution**:
1. **Immediately** set `ENCRYPTION_KEK` environment variable
2. Verify database connectivity
3. Run the system_settings migration: `pwsh server/scripts/run-system-settings-migration.ps1`
4. Restart server

### "Master key encrypted and updated in database" Log

**Meaning**: This is **good news**! 

The system detected an unencrypted master key (from v1.1) and automatically upgraded it to envelope encryption (v2.0). No action needed.

## Implementation Details

### Encryption Specifications

The system uses industry-standard encryption:

| Component | Specification |
|-----------|---------------|
| **Algorithm** | AES-256-CBC |
| **KEK Size** | 32 bytes (256 bits) |
| **Master Key Size** | 32 bytes (256 bits) |
| **IV (Initialization Vector)** | 16 bytes, randomly generated per operation |
| **Format** | `iv:ciphertext` (both hex-encoded) |
| **Key Derivation** | None (uses raw keys for simplicity) |

### Encryption Flow

```typescript
// KEK Initialization (on server start)
KEK = process.env.ENCRYPTION_KEK || loadFromDatabase()

// Master Key Initialization
encryptedMasterKey = database.get('master_encryption_key')
masterKey = decrypt(encryptedMasterKey, KEK)

// API Key Encryption (when saving)
apiKey = "user's actual API key"
encryptedApiKey = encrypt(apiKey, masterKey)
database.save('ai_gateway_api_key', encryptedApiKey)

// API Key Decryption (when loading)
encryptedApiKey = database.get('ai_gateway_api_key')
apiKey = decrypt(encryptedApiKey, masterKey)
// Use apiKey in memory
```

### Database Schema

The `system_settings` table stores:

| Key | Value | Encrypted? | Purpose |
|-----|-------|-----------|---------|
| `kek_master` | KEK (hex) | No | KEK fallback (dev only) |
| `master_encryption_key` | Encrypted master key | Yes | Encrypted with KEK |
| `ai_gateway_api_key` | Encrypted API key | Yes | Encrypted with master key |

### Automatic Migration

The system automatically upgrades from v1.1 to v2.0:

1. Detects unencrypted master key in database
2. Loads KEK (from env or database)
3. Encrypts master key with KEK
4. Updates database with encrypted master key
5. Logs success message

**No manual intervention required!**

## Files Modified

- `server/src/routes/settings.ts`: Envelope encryption implementation
- `server/migrations/009_create_system_settings.sql`: Database schema
- `server/scripts/generate-kek.ts`: KEK generation script (TypeScript)
- `server/scripts/generate-kek.ps1`: KEK generation script (PowerShell)
- `server/docs/ENCRYPTION_KEY_MANAGEMENT.md`: This documentation

## Version History

| Version | Date | Changes |
|---------|------|---------|
| **v1.0** | 2024-01 | Initial implementation (insecure - random key per restart) |
| **v1.1** | 2024-01-15 | Database persistence (vulnerable to DB compromise) |
| **v2.0** | 2024-01-15 | **Envelope encryption with KEK** (current - secure) |

## Quick Start Summary

### For Production (5 minutes)

```bash
# 1. Generate KEK
pwsh server/scripts/generate-kek.ps1

# 2. Copy the generated KEK

# 3. Set in Railway/Vercel
#    Variable: ENCRYPTION_KEK
#    Value: <paste KEK>

# 4. Restart backend
#    ✅ Done! All API keys now protected with envelope encryption
```

### For Development

No action needed! The system auto-generates and persists keys in the database.

**⚠️ Remember**: Generate a production KEK before deploying to production!

