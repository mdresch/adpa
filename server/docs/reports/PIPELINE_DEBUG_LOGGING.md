# 🔍 Pipeline Debug Logging Guide

## Overview

Comprehensive debug logging has been added to the document generation pipeline to help diagnose why extraction-focused templates may produce generic output instead of extracting project-specific data.

---

## 📊 What Was Added

### 1. **Context Gathering Stage** (Stage 1)
**Location**: `src/modules/multiStageDocumentProcessor/stages/contextGatheringStage.ts`

**Logs**:
- `📊 CONTEXT GATHERING DEBUG`: Shows what context data was gathered
  - How many sources were accessed
  - Size of context data
  - Whether project data and documents were found
  - Number of documents gathered
  
- `📄 GATHERED DOCUMENTS SAMPLE`: Shows first 3 documents that were gathered
  - Document names
  - Content length
  - Content preview (first 100 chars)
  
- `⚠️ NO DOCUMENTS GATHERED`: Warning if no documents were found

---

### 2. **Template Processing Stage** (Stage 2)
**Location**: `src/modules/multiStageDocumentProcessor/stages/templateProcessingStage.ts`

**Logs**:
- `🎯 TEMPLATE PROCESSING DEBUG`: Shows template details
  - Template ID and name
  - Whether system prompt exists
  - System prompt length
  - Preview of first 150 characters
  - Whether prompt_build_up exists
  
- `✨ TEMPLATE PROMPT TYPE`: Analyzes if template is extraction-focused
  - Checks for "EXTRACT" keyword
  - Checks for "REAL PROJECT DATA" keyword
  - Checks for "DO NOT generate" rules
  - Final verdict: `is_extraction_focused: true/false`

---

### 3. **AI Generation Stage** (Stage 3)
**Location**: `src/modules/multiStageDocumentProcessor/stages/aiGenerationStage.ts`

**Logs**:
- `🎭 AI GENERATION STAGE INPUT DEBUG`: Shows what the AI stage receives
  - Whether context exists
  - Context size in bytes
  - Whether project data and documents are available
  - Number of documents in context
  
- `📚 CONTEXT DOCUMENTS AVAILABLE`: Lists available documents
  - Document count
  - Sample document names
  
- `⚠️ NO CONTEXT DOCUMENTS AVAILABLE`: Warning if context is missing
  
- `📋 PROCESSED TEMPLATE DEBUG`: Shows template after processing
  - Template ID and name
  - Whether system prompt exists
  - System prompt preview
  - Number of sections
  
- `🤖 AI GENERATION REQUEST DEBUG`: Shows what's sent to AI
  - Prompt length
  - Preview of first 300 characters
  - Whether it contains context (checks for "ADPA", "project")
  - Whether it has extraction instructions
  - Model and provider being used
  
- `📤 AI GENERATION RESPONSE DEBUG`: Shows what AI returned
  - Response length
  - Preview of first 200 characters
  - Whether response contains placeholders `[...]`
  - Processing time
  - Tokens used

---

## 🎯 How to Use

### Step 1: Generate a Document
1. Go to the pipeline: `http://localhost:3000/process-flow/visual-pipeline`
2. Select your project
3. Select the "Project Charter" template
4. Click "Start Pipeline"

### Step 2: Check the Logs
The logs are written to `server/logs/combined.log` and also appear in the console if the server is running in development mode.

**On Windows (PowerShell)**:
```powershell
cd server
Get-Content logs/combined.log -Tail 200 | Select-String "DEBUG|CONTEXT|TEMPLATE"
```

**Or in real-time**:
```powershell
Get-Content logs/combined.log -Wait -Tail 50
```

### Step 3: Interpret the Results

#### ✅ **Good Output** (Extraction is working):
```json
{
  "message": "📊 CONTEXT GATHERING DEBUG",
  "document_count": 16,
  "context_size_bytes": 45000
}

{
  "message": "✨ TEMPLATE PROMPT TYPE",
  "is_extraction_focused": true,
  "has_extract_keyword": true,
  "has_real_data_keyword": true
}

{
  "message": "🤖 AI GENERATION REQUEST DEBUG",
  "prompt_length": 5000,
  "has_context": true,
  "has_extraction_instruction": true,
  "prompt_preview": "You are a PROJECT DOCUMENT ANALYST...ADPA..."
}

{
  "message": "📤 AI GENERATION RESPONSE DEBUG",
  "has_placeholders": false,
  "content_preview": "## Project Charter: ADPA - Advanced..."
}
```

#### ❌ **Problem Detected** (Context not reaching AI):
```json
{
  "message": "📊 CONTEXT GATHERING DEBUG",
  "document_count": 0  // ❌ No documents gathered!
}

{
  "message": "⚠️ NO CONTEXT DOCUMENTS AVAILABLE FOR AI GENERATION"
}

{
  "message": "🤖 AI GENERATION REQUEST DEBUG",
  "has_context": false,  // ❌ Context missing!
  "prompt_preview": "You are a PROJECT DOCUMENT ANALYST..."  // No ADPA mentioned
}

{
  "message": "📤 AI GENERATION RESPONSE DEBUG",
  "has_placeholders": true,  // ❌ Placeholders in output!
  "content_preview": "[Project Name] [Insert Project Manager]..."
}
```

---

## 🔍 Troubleshooting Matrix

### Problem 1: Context Not Gathered
**Symptoms**:
- `document_count: 0` in context gathering
- `⚠️ NO DOCUMENTS GATHERED` warning

**Possible Causes**:
- Project has no documents in database
- Context gathering query is incorrect
- Database connection issue

**Solution**:
- Verify documents exist: Run `scripts/check-project-context.ts`
- Check database connection
- Review context gathering SQL queries

---

### Problem 2: Template Not Extraction-Focused
**Symptoms**:
- `is_extraction_focused: false` in template processing
- `has_extract_keyword: false`

**Possible Causes**:
- Wrong template selected (e.g., "Project Charter - Template Builder")
- Template system prompt not updated
- Template ID mismatch

**Solution**:
- Use template ID: `ffbcf898-0486-46fa-939f-e5629737de0e`
- Verify template: Run `scripts/list-all-templates.ts`
- Update template system prompt

---

### Problem 3: Context Not Reaching AI
**Symptoms**:
- Context gathered successfully (stage 1)
- Template is extraction-focused (stage 2)
- But `has_context: false` in AI generation (stage 3)

**Possible Causes**:
- Context not passed between pipeline stages
- Data transformation issue
- Context injection not working

**Solution**:
- Check pipeline orchestrator
- Verify `prepareStageInput` for AI generation
- Review context injection logic

---

### Problem 4: AI Ignoring Context
**Symptoms**:
- Context gathered successfully
- Template is extraction-focused
- Context reaches AI (`has_context: true`)
- But output still has placeholders

**Possible Causes**:
- System prompt not properly injected
- Context format incompatible with AI
- AI model not following instructions

**Solution**:
- Check prompt construction in `generateInitialDocument`
- Verify context is formatted as text (not JSON)
- Try different AI model/provider
- Increase temperature or adjust prompt

---

## 📝 Example Debug Session

```bash
# Start backend with logs visible
cd server
npm run dev

# In another terminal, tail the logs
Get-Content logs/combined.log -Wait -Tail 100

# Generate a document via the UI

# Look for these key log entries:
# 1. "📊 CONTEXT GATHERING DEBUG" - did it gather documents?
# 2. "✨ TEMPLATE PROMPT TYPE" - is it extraction-focused?
# 3. "🤖 AI GENERATION REQUEST DEBUG" - does prompt have context?
# 4. "📤 AI GENERATION RESPONSE DEBUG" - does output have placeholders?
```

---

## 🎯 Success Criteria

A successful extraction-based generation should show:

1. ✅ **Context Gathering**: `document_count > 0`
2. ✅ **Template Processing**: `is_extraction_focused: true`
3. ✅ **AI Input**: `has_context: true` AND `has_extraction_instruction: true`
4. ✅ **AI Output**: `has_placeholders: false` AND content includes project name

---

## 🔧 Scripts for Debugging

### Check Project Context
```bash
npx tsx scripts/check-project-context.ts
```
Shows what documents and data exist for the ADPA project.

### List All Templates
```bash
npx tsx scripts/list-all-templates.ts
```
Shows all templates and identifies which are extraction-focused.

### Test Charter Generation
```bash
npx tsx scripts/test-charter-generation.ts
```
Comprehensive diagnostic of the entire generation flow.

---

## 💡 Tips

1. **Always check logs after generation** - Don't guess, use the data
2. **Look for warnings** (⚠️) - They indicate problems
3. **Compare prompt_preview with output** - They should match in content
4. **Check has_context consistently** - It should be true in all stages
5. **Watch for has_placeholders** - Should be false for extraction-based output

---

## 🚀 Next Steps

After identifying the issue using these logs:

1. **If context isn't gathered**: Fix context gathering stage
2. **If template isn't extraction-focused**: Update template system prompt
3. **If context doesn't reach AI**: Fix pipeline orchestrator
4. **If AI ignores context**: Adjust prompt construction or model

The debug logs give you **X-ray vision** into the pipeline! 🔍✨

