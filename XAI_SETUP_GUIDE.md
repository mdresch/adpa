# xAI (X.AI/Grok) Setup Guide

## Overview

**xAI (X.AI)** - Elon Musk's AI company with the **Grok** model series - is now fully integrated into ADPA!

**Status**: ✅ Fully Implemented  
**Models**: 2 models available (grok-beta, grok-vision-beta)  
**API Compatibility**: OpenAI-compatible API  
**Context Window**: 128K tokens

---

## Quick Setup

### Step 1: Add xAI Provider

1. Navigate to `/ai-providers` in ADPA
2. Click **"Add Provider"** or **"Create New Provider"**
3. Fill in the details:
   - **Provider Name**: `X.AI` or `Grok`
   - **Provider Type**: Select `xai` from dropdown
   - **API Key**: Your xAI API key (starts with `xai-`)
   - **Endpoint**: `https://api.x.ai/v1` (auto-filled)
   - **Default Model**: `grok-beta` (recommended)
   - **Priority**: `1` (or your preference)
4. Click **Save**

### Step 2: Configure Your API Key

You will need your xAI API key:
```
xai-YOUR_API_KEY_HERE
```

⚠️ **Important**: For security, paste this API key directly in the ADPA UI, not in any files or git commits.

### Step 3: Run Connectivity Tests

1. After saving the provider, go to the **Testing** tab
2. Click **"Run Connectivity Tests"**
3. **Expected Results**:
   - ✅ Endpoint Validation - Should pass immediately
   - ✅ API Connection - Should pass (401 or 200)
   - ✅ Authentication - Should pass with your API key

### Step 4: Discover Models

1. Go to the **Model Discovery** tab
2. Click **"Discover Models"**
3. **Expected**: 2 models will appear:
   - `grok-beta` - Latest Grok model with enhanced reasoning
   - `grok-vision-beta` - Grok with vision capabilities

---

## Available Models

### grok-beta
- **Description**: Latest Grok model with enhanced reasoning capabilities
- **Context Window**: 128,000 tokens (128K)
- **Best For**: Complex reasoning, analysis, document generation
- **Pricing**: ~$5.00 per 1M tokens (estimated)

### grok-vision-beta
- **Description**: Grok with vision capabilities for image understanding
- **Context Window**: 128,000 tokens (128K)
- **Best For**: Document analysis with images, visual reasoning
- **Pricing**: ~$5.00 per 1M tokens (estimated)

---

## Configuration Details

### API Endpoint
```
https://api.x.ai/v1
```

### Authentication
- **Type**: Bearer Token (OpenAI-compatible)
- **Header**: `Authorization: Bearer xai-your-key-here`

### Supported Operations
- ✅ Text generation
- ✅ Model listing (`/v1/models`)
- ✅ Chat completions (`/v1/chat/completions`)
- ✅ Streaming responses
- ✅ Vision capabilities (grok-vision-beta)

---

## Usage Example

### Generate Document with Grok

1. **Navigate to a project**
2. **Click "Generate Document"**
3. **Configure generation**:
   - Provider: `X.AI` or `Grok`
   - Model: `grok-beta`
   - Temperature: `0.7` (default)
   - Max Tokens: `4000` (or as needed)
4. **Enter your prompt**:
   ```
   Generate a comprehensive project charter following PMBOK 7 standards.
   Include sections for: objectives, stakeholders, scope, timeline, risks.
   ```
5. **Click Generate**

**Expected**: Grok will generate the document using its 128K context window!

---

## Integration Architecture

### Request Flow
```
User Request
    ↓
ADPA Frontend
    ↓
aiService.generate({ provider: 'xai', model: 'grok-beta' })
    ↓
Try AI Gateway (if configured)
    ↓
[If Gateway fails] → Direct xAI API
    ↓
createOpenAI({ baseURL: 'https://api.x.ai/v1' })
    ↓
POST /v1/chat/completions with Bearer token
    ↓
xAI API Response
    ↓
Track tokens & cost
    ↓
Return generated content ✅
```

### Fallback Strategy
1. **Primary**: AI Gateway (unified routing)
2. **Fallback**: Direct xAI API using OpenAI adapter
3. **Retry**: Exponential backoff on failures

---

## Cost & Performance

### Pricing
- **Estimated**: ~$5.00 per 1M tokens
- **Compared to**:
  - OpenAI GPT-4: $30/1M tokens (6x more expensive)
  - Google Gemini: $0.50/1M tokens (10x cheaper)
  - DeepSeek: $0.60/1M tokens (8x cheaper)
  - Moonshot: $12/1M tokens (2.4x more expensive)

### Performance Metrics
- **Context Window**: 128K tokens (same as Moonshot, 4x larger than GPT-4)
- **Response Time**: Varies by load (typically 1-3 seconds)
- **Rate Limits**: Check your xAI plan

---

## Comparison with Other Providers

| Feature | xAI Grok | OpenAI GPT-4 | Moonshot | DeepSeek |
|---------|----------|--------------|----------|----------|
| Context Window | 128K | 32K | 128K | 32K |
| Cost per 1M tokens | ~$5 | $30 | $12 | $0.60 |
| Vision Support | ✅ (grok-vision) | ✅ | ❌ | ❌ |
| Reasoning Quality | High | Very High | Medium | High |
| Speed | Fast | Medium | Fast | Very Fast |
| Best For | Analysis, coding | Everything | Long docs | Cost-sensitive |

---

## Troubleshooting

### Authentication Failed
**Error**: `Invalid API Key`

**Solution**:
1. Verify your API key format starts with `xai-`
2. Check key hasn't expired on https://console.x.ai
3. Ensure key has proper permissions
4. Re-enter key in ADPA UI (copy-paste carefully)

### API Connection Failed
**Error**: `404 Not Found`

**Solution**:
1. Verify endpoint is `https://api.x.ai/v1` (not `.cn` or `.com`)
2. Check if xAI API is operational: https://status.x.ai
3. Restart ADPA backend if recently updated

### Model Not Found
**Error**: `Model grok-beta not available`

**Solution**:
1. Run "Discover Models" again
2. Check your xAI plan supports these models
3. Try using `grok-vision-beta` instead

---

## Best Practices

### 1. Model Selection
- **grok-beta**: Use for most text generation tasks
- **grok-vision-beta**: Use when analyzing documents with images/diagrams

### 2. Context Optimization
- **128K tokens** = ~96,000 words
- Use full context for long documents
- Monitor token usage to control costs

### 3. Cost Management
- Grok is mid-priced (~$5/1M tokens)
- Use DeepSeek for cost-sensitive tasks
- Reserve Grok for complex reasoning tasks

### 4. Performance Tuning
- **Temperature**: 0.7 for balanced creativity
- **Max Tokens**: 4000 for documents, 1000 for summaries
- **Streaming**: Enable for real-time feedback

---

## API Key Management

### Where to Get API Keys
1. Go to https://console.x.ai
2. Sign up / Log in
3. Navigate to "API Keys"
4. Click "Create New Key"
5. Copy and save securely

### Security Best Practices
- ✅ Never commit API keys to git
- ✅ Store in ADPA UI encrypted database
- ✅ Rotate keys periodically
- ✅ Use different keys for dev/prod
- ❌ Don't share keys in documentation
- ❌ Don't hardcode in source files

---

## Next Steps

### Option 1: Test with Grok (Recommended)
1. Add your xAI provider with the API key you have
2. Run connectivity tests
3. Generate a test document to verify everything works

### Option 2: Keep Groq Separate
- Groq API (fast inference) uses different keys (format: `gsk_...`)
- If you want Groq too, get a separate Groq API key from https://console.groq.com

### Option 3: Use Multiple Providers
You now have access to:
- ✅ DeepSeek (3 models)
- ✅ Moonshot (4 models)
- ✅ xAI/Grok (2 models)
- 🟡 Groq (6 models) - needs Groq API key

**Total**: 9 working models + 6 Groq models available!

---

## Support & Resources

### xAI Documentation
- **Console**: https://console.x.ai
- **API Docs**: https://docs.x.ai/api
- **Status Page**: https://status.x.ai
- **Pricing**: https://x.ai/pricing

### ADPA Documentation
- **Provider Setup**: This guide
- **DeepSeek & Moonshot**: `DEEPSEEK_MOONSHOT_COMPLETE.md`
- **AI Features**: `/docs/06-features/ai-model-management.md`

---

## Summary

🎉 **xAI (Grok) is now ready to use in ADPA!**

You have:
- ✅ xAI provider type registered
- ✅ 2 Grok models available
- ✅ Connectivity testing configured
- ✅ Direct API integration ready
- ✅ Cost tracking enabled

**To activate**:
1. Go to `/ai-providers` in ADPA
2. Add new provider with type `xai`
3. Enter your `xai-...` API key
4. Run tests to verify
5. Start generating documents! 🚀

**Your xAI key is ready to use** - just paste it in the ADPA UI and you're good to go!

