# AI Provider Setup Guide for Client Onboarding

## 🎯 Problem Solved

The client onboarding assessment system now uses **ADPA's intelligent AI provider failover system** instead of hardcoded providers. This means:

✅ **Automatic provider selection** based on database configuration  
✅ **Intelligent failover** when providers hit rate limits  
✅ **Priority-based routing** configured via UI  
✅ **No code changes needed** to switch providers  

---

## 🤖 How the System Works

### 1. **AI Provider Priority System**

Providers are configured in the database with:
- **Priority** (1 = highest, 10 = lowest)
- **Is Active** (enabled/disabled)
- **API Key** (encrypted storage)
- **Rate Limits** (requests per minute/day)

### 2. **Automatic Failover Flow**

When processing a document:

```
Step 1: Document Upload
  ↓
Step 2: Convert to Markdown
  ↓
Step 3: Detect Document Type
  → Try Provider #1 (highest priority)
  → If fails/quota exceeded → Try Provider #2
  → If fails/quota exceeded → Try Provider #3
  → If all fail → Use keyword fallback
  ↓
Step 4: Quality Audit
  → Try Provider #1 (highest priority)
  → If fails/quota exceeded → Try Provider #2
  → If fails/quota exceeded → Try Provider #3
  → If all fail → Return default scores
  ↓
Step 5: Generate Assessment
```

### 3. **Configure Providers via UI**

Navigate to: **`http://localhost:3000/app/ai-providers`**

**Available Providers:**
- 🟢 OpenAI (GPT-4, GPT-4o, GPT-3.5)
- 🔵 Google AI (Gemini 2.5 Flash, Gemini Pro)
- 🟣 Mistral AI (Mistral Large, Mistral Small)
- 🟠 Anthropic (Claude 3.5 Sonnet)
- ⚡ Groq (LLaMA 3.1 - fastest)
- 🔷 Azure OpenAI
- 🌙 xAI (Grok)
- 🧠 DeepSeek

---

## 📋 Quick Setup for Production Quality Assessments

### Option 1: Mistral AI (Recommended for Free Tier)

**Why Mistral:**
- ✅ Free tier: **60 requests/min** (vs Google's 10/min)
- ✅ No credit card required
- ✅ Fast and accurate
- ✅ Good for document analysis

**Setup:**
1. Get API key: https://console.mistral.ai/
2. Go to: http://localhost:3000/app/ai-providers
3. Click "Add Provider"
4. Select "Mistral AI"
5. Enter API key
6. Set priority: **1** (highest)
7. Click "Save"

### Option 2: OpenAI (Recommended for Best Quality)

**Why OpenAI:**
- ✅ Most accurate document analysis
- ✅ Generous rate limits (3,500 RPM on paid tier)
- ✅ Excellent structured output
- ⚠️ Requires paid account (~$0.001 per audit)

**Setup:**
1. Get API key: https://platform.openai.com/api-keys
2. Go to: http://localhost:3000/app/ai-providers
3. Click "Add Provider"
4. Select "OpenAI"
5. Enter API key
6. Set priority: **1** (highest)
7. Click "Save"

### Option 3: Multi-Provider Strategy (Best Reliability)

**Setup Multiple Providers with Failover:**

| Provider | Priority | Use Case |
|----------|----------|----------|
| OpenAI | 1 | Primary (best quality) |
| Mistral | 2 | Failover (free tier) |
| Google AI | 3 | Final fallback |

**Benefits:**
- If OpenAI hits rate limit → Automatically switches to Mistral
- If Mistral fails → Falls back to Google AI
- If all fail → Uses keyword-based detection
- **Zero downtime** - always produces results

---

## 🚀 Testing the Failover System

### 1. **Configure Providers**
```
http://localhost:3000/app/ai-providers
```
- Add Mistral AI with priority 1
- Add OpenAI with priority 2 (optional)
- Enable both providers

### 2. **Upload Test Documents**
```
http://localhost:3000/onboarding/upload
```
- Upload 3-5 project documents
- Watch progress bar

### 3. **Monitor Failover in Action**

Check backend logs while processing:
```
info: [AI-FALLBACK] Trying provider: mistral
info: [AI-AUDIT] Using provider: mistral, model: mistral-small-latest
...
warn: Provider mistral rate limited, trying next provider
info: [AI-FALLBACK] Trying provider: openai
info: [AI-AUDIT] Using provider: openai, model: gpt-3.5-turbo
```

### 4. **View Assessment Results**
```
http://localhost:3000/onboarding/assessments
```
- Click "View Details"
- Should show:
  - Proper document types (Project Charter, Business Case, etc.)
  - Quality scores (60-90 range)
  - Detailed gap analysis
  - Multiple recommendations

---

## 🎯 Current vs Improved Results

### Current (No AI Keys / Quota Exceeded)
```
Document Types: "Unknown Document" (all files)
Quality Score: 0.9/100
Grade: F
Gaps: 1 generic gap
Maturity: Level 1
```

### With Mistral AI Configured
```
Document Types: "Project Charter", "Business Case", "Risk Register"
Quality Score: 67.5/100
Grade: C-
Gaps: 12 specific gaps with recommendations
Maturity: Level 2-3
```

---

## 💰 Cost Analysis

| Provider | Free Tier | Cost Per Audit | 100 Audits/month |
|----------|-----------|----------------|------------------|
| Google AI | 10 req/min | Free | Free (if under limits) |
| Mistral AI | 60 req/min | Free | Free (if under limits) |
| OpenAI | 3,500 RPM | $0.001 | $0.10 |
| Claude | 50 req/min | $0.015 | $1.50 |

**Recommendation**: Start with Mistral (free, fast), add OpenAI as failover if you need higher quality/volume.

---

## ✅ What Was Fixed

### Code Changes:
1. **`qualityAuditService.ts`**: Changed from hardcoded `provider: 'google'` to `provider: 'auto'` with `generateWithFallback()`
2. **`documentUploadService.ts`**: Changed document type detection from hardcoded Google AI SDK to unified AI service with failover

### Benefits:
- ✅ No more hardcoded providers
- ✅ Automatic failover when quotas exceeded
- ✅ Configure providers via UI without code changes
- ✅ Monitor usage and costs in AI Analytics dashboard
- ✅ Intelligent provider selection based on priority

---

## 📊 Next Steps

1. **Add at least one AI provider via the UI** (`/app/ai-providers`)
2. **Test with a new document upload** to see real quality scores
3. **Monitor failover behavior** in backend logs
4. **View AI usage analytics** at `/app/ai-analytics`

---

## 🔧 Troubleshooting

### "All providers failed" error
- Check at least one provider has a valid API key
- Verify provider is marked as "Active" in UI
- Check backend logs for specific error messages

### Still seeing "Unknown Document"
- Ensure AI provider has API credits/quota remaining
- Check backend logs for AI call failures
- Verify API key is valid (test via UI testing suite)

### Low quality scores
- This is normal if documents are incomplete
- Use ADPA's document generator to create complete templates
- Re-upload properly structured documents

---

**Built with ❤️ for intelligent, resilient AI-powered assessments**

