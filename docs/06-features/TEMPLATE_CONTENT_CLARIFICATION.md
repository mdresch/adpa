# Template Content Field - CLARIFIED

**Date**: October 18, 2025  
**Purpose**: Clear explanation of what goes in the `content` field  
**TL;DR**: Use `{"blocks": []}` (empty) for 99% of templates!

---

## ❓ **The Confusion**

You saw different structures in the guides:
- ❌ `{"blocks": []}` 
- ❌ `{"sections": [...]}`
- ❌ `{"metadata": {...}}`

**Which one is correct?** 🤔

---

## ✅ **The ACTUAL Truth**

### **The Real Structure** (from the code):

```json
{
  "blocks": []
}
```

**This is what the frontend checks for**:
```typescript
// app/templates/[id]/page.tsx line 721
template.content?.blocks?.length === 0
```

**If `blocks` is empty or missing**, it shows:
> "No content blocks defined. This template uses system prompt for AI guidance."

---

## 🎯 **What You Should Use**

### **For Standard Templates** (99% of cases):

```json
{
  "blocks": []
}
```

**Meaning**: "This template uses **system prompt only** for AI guidance"

**Why this is perfect**:
- ✅ System prompt has all the AI instructions
- ✅ No need for complex content structures
- ✅ Simple and effective
- ✅ What 99% of templates need

---

## 🔬 **Advanced: What `blocks` Could Contain**

**IF you were building advanced multi-stage processing** (rarely needed):

```json
{
  "blocks": [
    {
      "id": "intro",
      "type": "section",
      "name": "Introduction",
      "prompt": "Generate introduction...",
      "validation": {
        "min_words": 100,
        "max_words": 500
      }
    },
    {
      "id": "analysis",
      "type": "section",
      "name": "Analysis",
      "prompt": "Analyze the data...",
      "ai_model": "gpt-4",
      "temperature": 0.3
    }
  ]
}
```

**What this would do**:
1. Generate "Introduction" section separately
2. Generate "Analysis" section separately
3. Use different AI settings per section
4. Validate each section individually
5. Assemble final document

**But this requires**:
- Custom multi-stage processor (not implemented yet)
- Complex orchestration logic
- Section-by-section AI calls

**You don't need this!** Your system prompt handles everything.

---

## 📊 **Structure Comparison**

| Structure | Status | When to Use |
|-----------|--------|-------------|
| `{"blocks": []}` | ✅ **CORRECT & RECOMMENDED** | 99% of templates (use system prompt) |
| `{"sections": [...]}` | ❌ Not implemented | Was in guides incorrectly |
| `{"metadata": {...}}` | ❌ Not the right field | Metadata goes elsewhere |
| `{}` (empty object) | ⚠️ Works but less clear | Acceptable, but prefer blocks |

---

## 🎓 **Your Template - What to Do**

### **Current State**:
Your template has:
```json
{
  "blocks": []
}
```

**This is PERFECT!** ✅

**Why?**
1. ✅ Your system prompt is **excellent** (2,500+ characters)
2. ✅ It defines role, extraction rules, structure, validation
3. ✅ The `content` field doesn't need anything else
4. ✅ Empty `blocks` means "use system prompt" - exactly right!

---

## 🔄 **The Backend Processing Flow**

### **What Happens When You Generate**:

```typescript
// server/src/services/aiService.ts

// 1. Get template
const template = await getTemplate(template_id)

// 2. Use system_prompt (the important part!)
const systemPrompt = template.system_prompt

// 3. content field (barely used)
const content = template.content  // {"blocks": []}
// Just serialized and stored, not actively used in generation

// 4. Build final LLM request
const messages = [
  {
    role: "system",
    content: systemPrompt  // ← THIS is what matters!
  },
  {
    role: "user", 
    content: userPrompt
  }
]
```

**See?** The `content.blocks` field is **not actively used** in generation!

**The system prompt is the star!** ⭐

---

## 💡 **Key Takeaways**

### **What Matters Most** (Priority Order):

1. **System Prompt** ⭐⭐⭐⭐⭐ (99% of the work)
   - Defines AI role
   - Sets extraction rules
   - Specifies output structure
   - Controls quality

2. **User Prompt** ⭐⭐⭐⭐ (provides specific data)
   - Real project details
   - Context information

3. **Variables** ⭐⭐⭐ (optional - reusability)
   - Dynamic values
   - Consistent formatting

4. **Content Field** ⭐ (rarely used)
   - Set to `{"blocks": []}`
   - Forget about it!

---

## ✅ **Recommendation**

### **In Your Template Edit Page**:

**Tab 3: Template Content**
```json
{
  "blocks": []
}
```

**Just leave it as empty blocks!**

**Focus your energy on**:
- ✅ Tab 2: AI Prompts (system prompt) ← **MOST IMPORTANT**
- ✅ Tab 4: Variables (if you want reusability)
- ✅ Tab 1: Basic Info (quality threshold, version)

---

## 🎯 **Summary**

| Question | Answer |
|----------|--------|
| What structure for `content`? | `{"blocks": []}` |
| What if blocks is empty? | Perfect! Means "use system prompt" |
| Do I need to define blocks? | No! Empty is best for standard templates |
| What about sections/metadata? | Not used - ignore those examples |
| What's most important? | **System Prompt!** (2,000+ characters) |
| Can I leave content as `{}`? | Yes, but `{"blocks": []}` is clearer |

---

## 🚀 **Your Template is Perfect**

**Current setup**:
- ✅ System Prompt: Excellent (PMO/BA/DM expert with detailed instructions)
- ✅ Content: `{"blocks": []}` - correct!
- ✅ Quality Threshold: 70% - appropriate
- ✅ Variables: 1 defined (projectName)

**Nothing to change in content field!**

**Focus on**:
- ✅ Refining system prompt if needed
- ✅ Testing generation quality
- ✅ Adding more variables if useful

---

## 📚 **Corrected Guides**

I apologize for the confusion in the previous guides where I showed:
- ❌ `sections` array examples
- ❌ `metadata` object examples

**The correct structure is**: `{"blocks": []}`

**And for 99% of templates**: Keep blocks empty and let system prompt do the work!

---

**Your template is already configured correctly!** 🎉

**Now you can save it with confidence!**

---

**End of Clarification**

