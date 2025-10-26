# Credential Cleanup Plan - Scripts Folder

## 🚨 Security Issue Summary

**23 PowerShell scripts** in the `scripts/` folder contain hardcoded credentials that have been committed to git history.

## Affected Files (High Priority)

### Database Credentials
1. `scripts/check-neon-simple.ps1`
2. `scripts/check-neon-status.ps1`
3. `scripts/execute-document-migration.ps1`
4. `scripts/migrate-docker-to-neon.ps1`
5. `scripts/migrate-documents-only.ps1`
6. `scripts/migrate-simple.ps1`
7. `scripts/migrate-smart.ps1`
8. `scripts/create-complete-env-files.ps1`
9. `scripts/create-supabase-env.ps1`
10. `scripts/setup-supabase-env.ps1`

## Cleanup Strategy

### Step 1: Rotate ALL Credentials ~~(URGENT)~~ → Mostly Complete
- [x] **Neon PostgreSQL**: Already rotated (old password in scripts is inactive)
- [x] **Supabase**: Already rotated (old password in scripts is inactive)
- [ ] **Supabase Anon Key**: Verify if rotated
- [ ] **Railway Redis**: Verify credentials status

### Step 2: Update Scripts
Replace hardcoded values with environment variables:

**Before:**
```powershell
$NEON_PASSWORD = "npg_6H1YnZiDleEV"
```

**After:**
```powershell
$NEON_PASSWORD = $env:NEON_PASSWORD
if (-not $NEON_PASSWORD) {
    Write-Error "ERROR: NEON_PASSWORD environment variable not set"
    Write-Host "Please set it with: `$env:NEON_PASSWORD = 'your-password'"
    exit 1
}
```

### Step 3: Update .gitignore

Add these patterns to prevent future accidents:

```gitignore
# Sensitive scripts with credentials (use .example versions)
scripts/*-with-credentials.ps1
scripts/local-*.ps1
scripts/.env*

# Script output that may contain sensitive data
scripts/output/
scripts/logs/
scripts/*.log

# Keep example/template scripts
!scripts/*.example.ps1
!scripts/templates/
```

### Step 4: Create Template Scripts

For each sensitive script, create a `.example.ps1` version:
- `scripts/setup-supabase-env.example.ps1`
- `scripts/migrate-docker-to-neon.example.ps1`

### Step 5: Clean Git History (OPTIONAL - Nuclear Option)

⚠️ **WARNING**: This requires coordination with all team members!

If the repository is public or credentials were compromised:

```powershell
# Option A: BFG Repo Cleaner (recommended)
# Download from: https://rtyley.github.io/bfg-repo-cleaner/
java -jar bfg.jar --replace-text passwords.txt
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Option B: git filter-repo
pip install git-filter-repo
git filter-repo --path scripts/ --invert-paths --force
```

**Alternative**: If the repo is private and small team, consider creating a new repo and migrating clean code.

## Prevention Checklist

- [ ] Add pre-commit hook to scan for secrets
- [ ] Install `git-secrets` or `detect-secrets`
- [ ] Use environment variables exclusively
- [ ] Document credential management in README
- [ ] Set up secret scanning in GitHub
- [ ] Regular security audits

## Recovery Timeline

| Time | Action | Owner |
|------|--------|-------|
| **Immediate** | Rotate all credentials | DevOps |
| **0-2 hours** | Update all scripts | Development |
| **2-4 hours** | Test updated scripts | QA |
| **4-8 hours** | Update .gitignore, commit | Development |
| **1-3 days** | Review git history | Security |
| **1 week** | Implement prevention | All |

## Verification

After cleanup, verify no credentials remain:

```powershell
# Scan for any remaining hardcoded credentials
Get-ChildItem -Path scripts -Recurse -Include *.ps1 | 
    Select-String -Pattern '(password|secret|key|token)\s*=\s*"[^$]'
```

Should return 0 results.

## References

- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [git-secrets](https://github.com/awslabs/git-secrets)
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)
- [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)

---

**Status**: URGENT - Requires immediate action
**Last Updated**: October 26, 2025

