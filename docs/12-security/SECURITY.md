# Security Guidelines for ADPA

**Last Updated**: October 31, 2025  
**Status**: ✅ Security issues addressed  

---

## 🔒 **Critical Security Fix**

### **Issue**: Hardcoded Credentials in Migration Script
**File**: `scripts/migrate-to-vercel.ts`  
**Status**: ✅ **FIXED**  
**Date**: October 31, 2025  

**Problem**:
- Migration script contained hardcoded admin password hash
- Password hash corresponded to weak password 'admin123'
- Posed significant security risk in version control

**Solution**:
- Moved all admin credentials to environment variables
- Script now requires `ADMIN_PASSWORD_HASH` from environment
- Migration skips admin user creation if variable not set
- Added validation and helpful error messages

---

## 🔐 **Required Environment Variables**

### **Critical Security Variables**:

```bash
# Admin User Credentials (Migration/Seeding)
ADMIN_PASSWORD_HASH="$2a$10$..."  # Bcrypt hash (required)
ADMIN_EMAIL="admin@yourdomain.com"  # Optional (default: admin@adpa.com)
ADMIN_USER_ID="uuid"  # Optional (has default)

# JWT Secrets (minimum 32 characters)
JWT_SECRET="your-super-secret-jwt-key-min-32-chars-long"
JWT_REFRESH_SECRET="your-refresh-token-secret"

# Encryption
ENCRYPTION_KEY="your-32-byte-encryption-key"

# Database
DATABASE_URL="postgresql://..."
POSTGRES_URL="postgresql://..."  # Vercel
```

---

## 🛡️ **How to Generate Secure Credentials**

### **1. Generate Bcrypt Password Hash**:

**Using Node.js**:
```javascript
const bcrypt = require('bcryptjs');

// Generate hash for your password
bcrypt.hash('your-secure-password', 10, (err, hash) => {
  console.log('ADMIN_PASSWORD_HASH=' + hash);
});
```

**Using Command Line** (with bcryptjs installed):
```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('your-password', 10, (e,h) => console.log(h))"
```

### **2. Generate JWT Secret**:

```bash
# Option 1: OpenSSL (recommended)
openssl rand -base64 32

# Option 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### **3. Generate Encryption Key**:

```bash
# Generate 32-byte key
openssl rand -hex 32
```

---

## ⚠️ **Security Best Practices**

### **For Development**:
1. ✅ Never commit `.env` files to version control
2. ✅ Use weak passwords only in local development
3. ✅ Keep `.env.local` and `.env` in `.gitignore`
4. ✅ Use different credentials for dev/staging/production

### **For Production**:
1. ✅ Use strong, randomly-generated passwords (20+ characters)
2. ✅ Store secrets in a secure vault (AWS Secrets Manager, HashiCorp Vault)
3. ✅ Rotate secrets quarterly (minimum)
4. ✅ Use different secrets for each environment
5. ✅ Never log or expose secrets in error messages
6. ✅ Use HTTPS everywhere
7. ✅ Enable SSL/TLS for database connections

### **For Migration Scripts**:
1. ✅ Always use environment variables for credentials
2. ✅ Validate all required variables before execution
3. ✅ Provide helpful error messages if variables missing
4. ✅ Log actions, never log secrets
5. ✅ Use ON CONFLICT to prevent duplicate users

---

## 📋 **Migration Script Usage**

### **Safe Usage**:

```bash
# 1. Generate a secure password hash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('YourSecurePassword123!', 10, (e,h) => console.log(h))"

# 2. Set environment variable (Linux/Mac)
export ADMIN_PASSWORD_HASH="$2a$10$..."
export ADMIN_EMAIL="admin@yourdomain.com"

# 3. Set environment variable (Windows PowerShell)
$env:ADMIN_PASSWORD_HASH="$2a$10$..."
$env:ADMIN_EMAIL="admin@yourdomain.com"

# 4. Run migration
npm run migrate:vercel
```

### **Security Notes**:
- ⚠️ Script will **skip** admin user creation if `ADMIN_PASSWORD_HASH` is not set
- ✅ This is **intentional** to prevent accidental insecure deployments
- ✅ Warnings will be displayed to guide proper setup

---

## 🔍 **Security Checklist**

### **Before Deployment**:
- [ ] All secrets moved to environment variables
- [ ] Strong passwords generated (20+ characters)
- [ ] JWT secrets are 32+ characters
- [ ] Encryption keys are properly generated
- [ ] `.env` files are in `.gitignore`
- [ ] No secrets in source code
- [ ] Different secrets for dev/staging/production
- [ ] Secrets stored in secure vault (production)
- [ ] Database uses SSL/TLS
- [ ] HTTPS enabled on all endpoints
- [ ] CORS properly configured

### **After Deployment**:
- [ ] Default admin password changed
- [ ] Unnecessary admin users removed
- [ ] Audit logs reviewed
- [ ] Security scanning enabled (Dependabot, Snyk)
- [ ] Penetration testing completed
- [ ] Incident response plan documented
- [ ] Regular security reviews scheduled (quarterly)

---

## 🚨 **Incident Response**

### **If Credentials Compromised**:

1. **Immediate Actions**:
   - Rotate all affected credentials
   - Revoke compromised tokens
   - Lock affected user accounts
   - Enable additional monitoring

2. **Investigation**:
   - Check audit logs for unauthorized access
   - Identify scope of compromise
   - Document timeline of events

3. **Remediation**:
   - Update all systems with new credentials
   - Force password reset for all users
   - Review and update security policies
   - Conduct post-incident review

4. **Prevention**:
   - Implement lessons learned
   - Update security documentation
   - Enhance monitoring and alerting
   - Schedule security training

---

## 📞 **Security Contacts**

**Security Team**: security@adpa.com  
**On-Call**: +1-xxx-xxx-xxxx  
**Bug Bounty**: security.adpa.com/bug-bounty  

---

## 📚 **Additional Resources**

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CIS Controls](https://www.cisecurity.org/controls)
- [Bcrypt Best Practices](https://github.com/kelektiv/node.bcrypt.js)
- [JWT Security Best Practices](https://tools.ietf.org/html/rfc8725)

---

## ✅ **Verification**

**Security Fix Verified**: ✅  
**No hardcoded credentials**: ✅  
**Environment variables required**: ✅  
**Validation implemented**: ✅  
**Documentation complete**: ✅  

**Status**: Ready for production deployment with proper environment configuration.

---

**Last Review**: October 31, 2025  
**Next Review**: January 31, 2026  
**Reviewer**: Security Team / AI Code Review

