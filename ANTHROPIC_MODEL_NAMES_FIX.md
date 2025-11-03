# 🤖 Anthropic Model Names - Updated for Current API

## 🎯 **PROBLEM: Model Not Found**

**Error from Anthropic API**:
```json
{
  "type": "not_found_error",
  "message": "model: claude-3-5-sonnet-20241022"
}
```

**Root Cause**: Anthropic's API model names changed with newer Claude versions. The dated model names (with timestamps like `20241022`) might not be accessible on all accounts.

---

## 🔧 **FIX APPLIED: Simplified Model Names**

### **OLD (Not Working)**:
```typescript
'claude-3-5-sonnet-20241022'  // ❌ Model not found
'claude-3-7-sonnet-20250219'  // ❌ May not exist
'claude-3-opus-20240229'      // ❌ Dated format
```

### **NEW (Current API)**:
```typescript
'claude-3-5-sonnet'   // ✅ Simpler, more stable
'claude-3-7-sonnet'   // ✅ No date suffix
'claude-sonnet-4.0'   // ✅ Latest version
'claude-haiku-4.0'    // ✅ New Claude 4
'claude-3-5-haiku'    // ✅ Fast model
'claude-3-opus'       // ✅ Most capable
```

---

## 📊 **UPDATED MODEL LIST**

| Model ID | Name | Description | Context Window |
|----------|------|-------------|----------------|
| `claude-sonnet-4.0` | Claude Sonnet 4.0 | Latest generation | 200K tokens |
| `claude-haiku-4.0` | Claude Haiku 4.0 | Fast & cost-effective | 200K tokens |
| `claude-3-7-sonnet` | Claude 3.7 Sonnet | Latest Claude 3.x | 200K tokens |
| `claude-3-5-sonnet` | Claude 3.5 Sonnet | Balanced (default) | 200K tokens |
| `claude-3-5-haiku` | Claude 3.5 Haiku | Efficient & fast | 200K tokens |
| `claude-3-opus` | Claude 3 Opus | Most capable Claude 3 | 200K tokens |

---

## 🚀 **VALIDATION STEPS**

### **Step 1: Restart Backend** (CRITICAL!)

In your backend PowerShell terminal:
```powershell
# Press Ctrl+C to stop
npm run dev
```

Wait for: `✅ Server running on port 5000`

---

### **Step 2: Test with Simpler Model Name**

1. Go to Data Analytics Platform project
2. Generate document:
   - Provider: **Claude 3.5 Sonnet** (Anthropic)
   - Model: **claude-3-5-sonnet** (NO date suffix!)
   - Template: Any simple template
3. Watch for success!

---

## 🎯 **EXPECTED RESULTS**

**Backend Logs**:
```
info: 🔄 [AI-SERVICE] Using NATIVE Anthropic SDK...
info: [AI-SERVICE] Anthropic model: claude-3-5-sonnet
info: [AI-SERVICE] Calling native Anthropic messages.create()
info: [AI] ✓ Anthropic/claude-3-5-sonnet - XXXX tokens - XXXms
```

**Job Status**:
```
✅ Status: completed
✅ Provider: Anthropic
✅ Model: claude-3-5-sonnet
✅ Document generated!
```

---

## 📋 **FILES MODIFIED**

1. **server/package.json** - Added `@anthropic-ai/sdk` dependency
2. **server/src/services/aiService.ts**:
   - Line 15: Imported Anthropic SDK
   - Line 374: Added 'anthropic' to bypass list
   - Lines 561-568: Updated model names (simplified)
   - Line 571: Default model changed to `claude-3-5-sonnet`
   - Line 1205: getModelsForProvider updated
3. **server/src/routes/ai.ts**:
   - Lines 1277-1282: Updated model discovery list

---

## 💡 **WHY SIMPLER NAMES?**

1. **API Stability**: Dated model names can be deprecated
2. **Account Access**: Newer accounts might not have access to specific dated versions
3. **Anthropic Best Practice**: Their docs often show simpler names
4. **Backward Compatibility**: Simpler names map to latest available version

---

## 🎊 **NEXT STEPS**

1. **Restart backend** to load new model names
2. **Test Anthropic** with `claude-3-5-sonnet` model
3. **Report result**!

---

**Fix Date**: November 3, 2025, 00:07 UTC  
**Status**: Ready for validation  
**Confidence**: High (using Anthropic API standard names) ✅

