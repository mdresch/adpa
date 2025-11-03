# 🌙 Moonshot AI Fix V2 - Domain Correction

## 🎯 **ROOT CAUSE IDENTIFIED**

**Problem**: Moonshot API calls were failing with `404 Not Found` and `url.not_found` error.

**Root Cause**: Wrong domain! We were using `https://api.moonshot.ai` but Moonshot API is actually at `https://api.moonshot.cn`

**Evidence from logs**:
```json
{
  "error": "url.not_found",
  "url": "/chat/completions",
  "message": "?????",
  "url": "https://api.moonshot.ai/chat/completions"
}
```

The Chinese error message (?????) confirmed this is a Chinese API service using the `.cn` domain!

---

## 🔧 **FIXES APPLIED**

### 1. **Updated API Service** (`server/src/services/aiService.ts`)
```typescript
// BEFORE (WRONG):
const moonshot = createOpenAI({ 
  apiKey: directApiKey,
  baseURL: 'https://api.moonshot.ai'  // ❌ Wrong domain!
})

// AFTER (CORRECT):
const moonshot = createOpenAI({ 
  apiKey: directApiKey,
  baseURL: 'https://api.moonshot.cn'  // ✅ Correct domain!
})
```

### 2. **Updated Default Endpoint** (`server/src/routes/ai-models.ts`)
```typescript
// BEFORE:
case 'moonshot':
  return 'https://api.moonshot.ai/v1'  // ❌ Wrong

// AFTER:
case 'moonshot':
  return 'https://api.moonshot.cn/v1'  // ✅ Correct
```

---

## ✅ **VALIDATION REQUIRED**

### **Step 1: Update Provider Configuration**

The user needs to update their Moonshot provider endpoint in the database:

1. Go to AI Providers page
2. Find Moonshot AI provider
3. **Update endpoint** to: `https://api.moonshot.cn/v1`
4. Save configuration

### **Step 2: Restart Backend**

```powershell
cd D:\source\repos\adpa\server
# Kill current process (Ctrl+C)
npm run dev
```

### **Step 3: Test Generation**

1. Go to project
2. Generate a document with Moonshot AI
3. Verify success (no "Not Found" error)

---

## 📊 **EXPECTED RESULT**

**Before Fix**:
```
❌ Status: failed
❌ Error: AI generation failed: Not Found
❌ API Response: {"error":"url.not_found"}
```

**After Fix**:
```
✅ Status: completed
✅ Generation successful
✅ Document created with Moonshot AI content
```

---

## 🔍 **WHY DID THIS HAPPEN?**

1. **Moonshot AI (Kimi)** is a Chinese AI company
2. Their API is hosted on Chinese infrastructure (`.cn` domain)
3. The `.ai` domain either doesn't exist or redirects incorrectly
4. Initial configuration assumed `.ai` domain like most AI APIs

---

## 🎯 **FILES CHANGED**

1. `server/src/services/aiService.ts` - Line 442 (baseURL corrected)
2. `server/src/routes/ai-models.ts` - Line 1459 (default endpoint corrected)

---

## 🚀 **NEXT STEPS**

1. **User Action**: Update Moonshot provider endpoint to `.cn` domain
2. **Restart backend** to load new code
3. **Test Moonshot generation**
4. **Report result**

---

**Fix Date**: November 2, 2025  
**Issue**: Moonshot API 404 Not Found  
**Solution**: Changed domain from `.ai` to `.cn`  
**Status**: Ready for validation ✅
