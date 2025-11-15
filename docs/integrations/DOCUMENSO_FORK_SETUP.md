# Documenso Fork Setup Guide

**Purpose**: Fork Documenso for one-time feature extraction into ADPA  
**Status**: 📋 Setup Instructions  
**Approach**: One-time extraction (not tracking upstream)

---

## 🎯 Why Fork?

1. **Ownership**: You control your copy of the code
2. **Backup**: Your own repository ensures code availability even if original changes
3. **Reference**: Keep a snapshot for future reference
4. **Extraction**: Extract only the PDF signing components we need
5. **No Maintenance**: One-time extraction - no need to track upstream updates

---

## 📋 Step-by-Step Fork Process

### **Step 1: Fork on GitHub**

1. **Navigate to Documenso**:
   - Go to: https://github.com/documenso/documenso
   - Make sure you're logged into your GitHub account

2. **Click Fork Button**:
   - Click the **"Fork"** button in the top right corner
   - Select your personal GitHub account (or organization)
   - Wait for GitHub to create the fork (usually 10-30 seconds)

3. **Verify Fork**:
   - You should be redirected to: `https://github.com/YOUR_USERNAME/documenso`
   - The repository should show "forked from documenso/documenso"

### **Step 2: Clone Your Fork**

```bash
# Navigate to ADPA project directory
cd d:\source\repos\adpa

# Clone YOUR fork (replace YOUR_USERNAME with your GitHub username)
git clone https://github.com/YOUR_USERNAME/documenso.git documenso-integration

# Navigate into the cloned repository
cd documenso-integration

# Verify you're in your fork
git remote -v
# Should show:
# origin    https://github.com/YOUR_USERNAME/documenso.git (fetch)
# origin    https://github.com/YOUR_USERNAME/documenso.git (push)
```

### **Step 3: Create ADPA Extraction Branch**

Since we're doing a one-time extraction (not tracking upstream), just create a branch for organization:

```bash
# Create a branch for reference (optional)
git checkout -b adpa-extraction-reference

# Note: We're extracting specific components only
# No upstream tracking needed - this is a one-time integration
```

### **Step 4: Identify Components to Extract**

```bash
# Create a new branch for ADPA-specific changes
git checkout -b adpa-integration

# Verify branch
git branch
# Should show: * adpa-integration
```

### **Step 5: Verify Setup**

```bash
# Check current branch
git branch

# Check remotes (should only show origin, no upstream)
git remote -v

# Check latest commit
git log --oneline -5
```

---

## 📦 Extraction Strategy

Since this is a **one-time extraction**, we'll:

1. **Identify Components**: Find the PDF signing library and related code
2. **Extract**: Copy only what we need into ADPA
3. **Adapt**: Modify to work with ADPA's architecture
4. **Integrate**: Build into ADPA's approval workflow system

**Components to Extract**:
- ✅ `packages/pdf-sign/` - Core PDF signing library
- ✅ PDF manipulation utilities (PDF-Lib usage patterns)
- ✅ Signature field placement logic
- ✅ Signature capture UI components (to adapt)
- ✅ Database schema patterns (to convert to ADPA format)

**Components to Skip**:
- ❌ Full Documenso application structure
- ❌ tRPC API layer (we use Express.js)
- ❌ NextAuth integration (we use JWT)
- ❌ Full user management (we have our own)

---

## 🛠️ Extraction Workflow

### **Extraction Process**

```bash
# 1. Explore the codebase to identify what to extract
cd documenso-integration
# Look at packages/pdf-sign/ directory

# 2. Copy components to ADPA (one-time extraction)
cd ../..  # Back to ADPA root
mkdir -p server/src/lib/documenso
cp -r documenso-integration/packages/pdf-sign server/src/lib/documenso/pdf-sign

# 3. Adapt the code to work with ADPA
# - Remove tRPC dependencies
# - Adapt to Express.js
# - Integrate with ADPA's database schema
# - Integrate with ADPA's auth system

# 4. Test integration
# - Test PDF signing functionality
# - Test integration with approval workflows
# - Test email notifications

# Note: After extraction, the documenso-integration folder is just a reference
# We don't need to maintain it or sync with upstream
```

---

## 📝 Repository Structure After Fork

```
documenso-integration/          # Your cloned fork
├── .git/                       # Git repository
├── packages/
│   └── pdf-sign/              # Core PDF signing library (to extract)
├── apps/
│   └── web/                   # Frontend signing UI (to adapt)
├── packages/
│   └── prisma/                # Database schema (to convert)
└── ...                        # Other Documenso files
```

---

## ✅ Verification Checklist

After forking and cloning, verify:

- [ ] Fork created on GitHub: `https://github.com/YOUR_USERNAME/documenso`
- [ ] Repository cloned locally: `documenso-integration/` directory exists
- [ ] Can explore codebase: `ls -la` shows directory structure
- [ ] Can identify components: Found `packages/pdf-sign/` directory
- [ ] Ready for extraction: Codebase accessible for one-time extraction

**Note**: No upstream tracking needed - this is a one-time feature extraction.

---

## 🚨 Troubleshooting

### **Issue: "Repository not found"**

**Solution**: Make sure you've forked the repository first, and use YOUR username in the clone URL.

### **Issue: "Permission denied"**

**Solution**: 
- Make sure you're authenticated: `gh auth login`
- Or use SSH: `git clone git@github.com:YOUR_USERNAME/documenso.git`

### **Issue: "Can't find packages/pdf-sign directory"**

**Solution**: 
- Make sure you cloned the full repository
- Check if it's a monorepo structure: `ls packages/`
- May need to install dependencies first: `npm install` (if needed for exploration)

---

## 📚 Next Steps

After completing fork setup:

1. ✅ Fork created and cloned
2. ✅ Codebase accessible for exploration
3. 📋 **Next**: Extract PDF signing library (see `DOCUMENSO_QUICK_START.md`)

**Extraction Approach**:
- Explore Documenso codebase to identify components
- Copy only what we need (PDF signing library)
- Adapt to ADPA's architecture
- Integrate into ADPA's approval workflow
- No need to maintain fork or track upstream

---

**Ready?** Proceed to `DOCUMENSO_QUICK_START.md` for extraction and integration steps!

