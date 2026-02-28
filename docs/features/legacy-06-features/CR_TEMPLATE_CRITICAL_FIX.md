# Critical Fix: CR Template Missing Change Description Field

## 🚨 **The Problem**

**User tested the Enhanced CR template and got a completely made-up change:**
- AI generated a proposal for "Handwritten Text Recognition for Legal Documents"
- This has NOTHING to do with what the user actually wanted
- The user said: "worst idea ever" and "no possible entry to the LLM of the actual change"

**Root Cause:**
The Enhanced CR template has fields for:
- ✅ Project name
- ✅ Priority
- ✅ Status
- ✅ Update reasons (project charter, scope, etc.)

But **MISSING:**
- ❌ **What is the actual change you want?**
- ❌ **Why do you want this change?**
- ❌ **What problem does it solve?**

**Result:** AI has no idea what change to write about, so it invents something random!

---

## ✅ **The Fix**

### **Add Required Input Fields:**

```json
{
  "name": "change_description",
  "type": "textarea",
  "required": true,
  "description": "Describe the change you want to request. Be specific about what you want to modify, add, or remove.",
  "placeholder": "Example: Increase project budget from $75K to $320K to fund additional developer resources and infrastructure for baseline drift detection feature."
},
{
  "name": "change_reason",
  "type": "textarea",
  "required": true,
  "description": "Explain WHY this change is necessary. What problem does it solve? What opportunity does it create?",
  "placeholder": "Example: Current budget is insufficient for the approved scope. We need 2 additional developers and enhanced cloud infrastructure to meet the delivery date."
},
{
  "name": "business_justification",
  "type": "textarea",
  "required": false,
  "description": "Optional: Provide additional business justification, ROI analysis, or strategic alignment.",
  "placeholder": "Example: This feature will save 200 hours/month of manual work, worth $30K annually."
}
```

### **Update System Prompt:**

```
OLD (BROKEN):
"Generate comprehensive, executive-ready change requests..."

NEW (FIXED):
"The user has provided a specific change they want to request:

CHANGE DESCRIPTION: {{change_description}}
REASON FOR CHANGE: {{change_reason}}
BUSINESS JUSTIFICATION: {{business_justification}}

Based on this ACTUAL CHANGE REQUEST from the user, generate a comprehensive, executive-ready CR document that analyzes THIS SPECIFIC CHANGE. Do NOT invent or suggest different changes. Focus entirely on the change the user has described."
```

---

## 🔧 **Better Approach: Two-Mode System**

### **Mode 1: Generate from Description (AI-Assisted)**

**User provides:**
- Change description (what)
- Change reason (why)
- Optional: business justification

**AI generates:**
- Executive summary
- Impact analysis
- Risk assessment
- Implementation plan
- All the formal CR sections

### **Mode 2: Upload Existing CR (Manual)**

**User provides:**
- Complete CR document (Markdown or DOCX)

**System:**
- Uploads as-is
- Optionally runs AI analysis to extract metadata
- Links to project for version control

---

## 🎯 **Immediate Actions**

1. **Fix the template variables** - Add change_description, change_reason fields
2. **Update system prompt** - Include user's actual change in prompt
3. **Add upload option** - Allow users to upload their own CRs
4. **Add preview step** - Show user what AI will generate BEFORE creating the CR

---

## 📋 **User Feedback Summary**

**Quote:**
> "Oh no running the change request now came up with a brilliant (not so great) feature to expand the system with. This is not what the Change Requests should offer but there was no possible entry to the LLM of the actual change so it made up a change for the worst and worst idea ever."

**Translation:**
- "no possible entry to the LLM of the actual change" = Template has no field for user to describe the change
- "it made up a change for the worst" = AI invented handwriting recognition for legal documents
- User's sarcastic comment about "QWERTY type courses" = Pushing useless tech on people who don't need it

**Lesson:**
Never ask AI to generate a CR without telling it what the change actually is!

---

## ✅ **Recommended Solution**

**Simple Fix:**
1. Add 3 required text fields to the template:
   - "What change do you want?" (textarea, required)
   - "Why do you need this change?" (textarea, required)
   - "What problem does it solve?" (textarea, optional)

2. Update AI prompt to use these fields:
   ```
   User wants to request this change: {{change_description}}
   
   Their reason: {{change_reason}}
   
   Generate a formal CR that analyzes THIS specific change.
   ```

**Better Solution:**
1. Create a "CR Wizard" with multiple steps:
   - Step 1: Describe your change
   - Step 2: AI generates draft CR
   - Step 3: Review and edit
   - Step 4: Submit for approval

2. Add "Upload CR" option for users who already have a written CR

---

**This is a critical UX fix - the template is unusable without it!**

