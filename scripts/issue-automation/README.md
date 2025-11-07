# 🤖 ADPA Documentation → GitHub Issues Automation

Automated system for syncing ADPA briefing documents to Copilot-ready GitHub issues.

---

## 📋 **Overview**

This automation system:
- ✅ Monitors briefing documents for changes
- ✅ Parses structured briefing documents (Agent briefings, feature specs)
- ✅ Generates Copilot-ready GitHub issues automatically
- ✅ Updates existing issues when docs change
- ✅ Validates briefing documents for completeness
- ✅ Provides local preview before syncing

---

## 🚀 **Quick Start**

### **1. Install Dependencies**
```bash
cd scripts/issue-automation
npm install
```

### **2. Preview Issues Locally (Before Pushing)**
```bash
# Preview all briefing documents
node sync-local.js

# Preview specific document
node sync-local.js ../../AGENT_3_BRIEFING_TEMPLATE_OPTIMIZATION.md
```

### **3. Validate Briefing Documents**
```bash
# Validate all briefings
node validate-briefings.js

# Validate specific briefing
node validate-briefings.js ../../AGENT_3_BRIEFING_TEMPLATE_OPTIMIZATION.md
```

### **4. Auto-Sync to GitHub**
Push your briefing document to GitHub:
```bash
git add AGENT_4_BRIEFING_*.md
git commit -m "docs: Add Agent 4 briefing"
git push origin main
```

The GitHub Actions workflow will automatically:
- Detect the new briefing document
- Parse it into structured data
- Create a Copilot-ready GitHub issue
- Comment on the commit with issue links

---

## 📁 **File Structure**

```
scripts/issue-automation/
├── README.md                      # This file
├── package.json                   # Dependencies
├── generate-issues.js             # Main issue generator (runs in CI)
├── sync-local.js                  # Local preview tool
├── validate-briefings.js          # Briefing validator
└── templates/
    └── issue-template.md          # GitHub issue template

.github/workflows/
└── sync-docs-to-issues.yml        # GitHub Actions workflow

templates/
└── BRIEFING_TEMPLATE.md           # Standard briefing template
```

---

## 🎯 **How It Works**

### **Step 1: Create Briefing Document**

Use the template at `templates/BRIEFING_TEMPLATE.md`:

```bash
cp templates/BRIEFING_TEMPLATE.md AGENT_4_BRIEFING_NEW_FEATURE.md
```

Edit the new file with your feature details. **Required sections:**
- Title (H1)
- Mission statement
- Priority
- Deliverables
- Success Criteria

### **Step 2: Validate (Optional but Recommended)**

```bash
cd scripts/issue-automation
node validate-briefings.js ../../AGENT_4_BRIEFING_NEW_FEATURE.md
```

Expected output:
```
📄 Validating: AGENT_4_BRIEFING_NEW_FEATURE.md
   ✅ Title
   ✅ Mission/Objective
   ✅ Priority
   ✅ Deliverables
   ✅ Success Criteria
   ✅ Effort Estimate
   
   🎯 Copilot-Readiness Score: 95%
   ✅ Excellent! Ready for Copilot agents
```

### **Step 3: Preview Issue (Optional)**

```bash
node sync-local.js ../../AGENT_4_BRIEFING_NEW_FEATURE.md
```

This shows you exactly what the GitHub issue will look like.

### **Step 4: Push to GitHub**

```bash
git add AGENT_4_BRIEFING_NEW_FEATURE.md
git commit -m "docs: Add Agent 4 briefing for [feature]"
git push origin main
```

### **Step 5: Automatic Issue Creation**

The GitHub Actions workflow:
1. Detects the new briefing document
2. Parses it into structured data
3. Creates a GitHub issue with:
   - Clear objective
   - Full context
   - Expected output
   - Constraints
   - Acceptance criteria
   - Testing instructions
4. Adds appropriate labels
5. Comments on the commit with the issue link

---

## 📝 **Briefing Document Format**

### **Required Sections:**

```markdown
# 🎯 Agent X: Feature Name

**Mission:** One sentence objective  
**Priority:** 🟢 HIGH | 🟡 MEDIUM | 🟠 LOW  
**Timeline:** 1 week  
**Effort Estimate:** 20-25 hours

## 📦 **Deliverables**
[List of deliverables with checkboxes]

## 🎯 **Success Criteria**
[Measurable criteria]
```

### **Recommended Sections:**

```markdown
## 📂 **Files You'll Modify**
[File paths and descriptions]

## 🔌 **API Endpoints to Implement**
[Endpoint specifications]

## 🧪 **Testing Checklist**
[Test scenarios]

## 📚 **Resources**
[Links to docs, examples, patterns]
```

---

## 🔧 **Configuration**

### **GitHub Actions Setup:**

The workflow requires:
- ✅ `GITHUB_TOKEN` (automatically provided by GitHub Actions)
- ✅ `issues: write` permission (configured in workflow)

### **Workflow Triggers:**

Runs automatically when:
- Briefing documents pushed to `main` or `develop` branches
- Files matching `**/BRIEFING*.md` or `**/AGENT*.md` are modified
- Manual trigger via workflow dispatch

### **Custom Triggers:**

Edit `.github/workflows/sync-docs-to-issues.yml`:
```yaml
on:
  push:
    paths:
      - 'your-custom-path/**/*.md'
```

---

## 🧪 **Testing the Automation**

### **Test Locally (No GitHub Required):**

```bash
cd scripts/issue-automation

# 1. Validate briefing quality
node validate-briefings.js ../../AGENT_3_BRIEFING_TEMPLATE_OPTIMIZATION.md

# 2. Preview generated issue
node sync-local.js ../../AGENT_3_BRIEFING_TEMPLATE_OPTIMIZATION.md

# 3. Check all briefings
node validate-briefings.js
```

### **Test on GitHub:**

1. Create a test branch
2. Add a sample briefing document
3. Push to GitHub
4. Check Actions tab for workflow run
5. Verify issue was created

---

## 📊 **Output Examples**

### **Validation Output:**
```
🔍 ADPA Briefing Document Validator

📄 Validating: AGENT_3_BRIEFING_TEMPLATE_OPTIMIZATION.md
   ✅ Title
   ✅ Mission/Objective
   ✅ Priority
   ✅ Deliverables
   ✅ Success Criteria
   ✅ Effort Estimate
   ✅ Timeline
   
   📏 Word count: 1,234
   💻 Code examples: 8
   ✓  Checkboxes: 24
   
   🎯 Copilot-Readiness Score: 95%
   ✅ Excellent! Ready for Copilot agents

✅ All briefing documents are Copilot-ready!
```

### **Sync Output:**
```
🤖 ADPA Documentation → GitHub Issues Sync

📄 Processing: AGENT_3_BRIEFING_TEMPLATE_OPTIMIZATION.md
   Title: Agent 3: Template Optimization & Polish
   Agent: 3
   Priority: MEDIUM
   ✅ Created issue #42

📊 Sync Summary:

✅ Created:   1
📝 Updated:   0
⏭️  Skipped:   0
❌ Failed:    0

📝 Created Issues:
   #42 - Agent 3: Template Optimization & Polish
   https://github.com/org/repo/issues/42
```

---

## 🎯 **Best Practices**

### **For Briefing Authors:**

1. **Use the Template**
   - Start with `templates/BRIEFING_TEMPLATE.md`
   - Fill in all required sections
   - Add code examples where helpful

2. **Be Specific**
   - Clear, actionable deliverables
   - Measurable success criteria
   - Concrete examples

3. **Provide Context**
   - Link to existing code
   - Reference similar implementations
   - Include architecture diagrams

4. **Validate Before Pushing**
   ```bash
   node validate-briefings.js your-briefing.md
   ```

### **For Teams:**

1. **Naming Convention**
   - Use: `AGENT_X_BRIEFING_FEATURE_NAME.md`
   - Or: `BRIEFING_FEATURE_NAME.md`

2. **Storage Location**
   - Root directory for major features
   - `docs/briefings/` for smaller tasks
   - Project folders for project-specific work

3. **Review Process**
   - Validate briefing quality before merging
   - Review generated issues for completeness
   - Update briefing if issue needs changes

---

## 🔄 **Update Workflow**

### **When You Update a Briefing:**

1. Edit the briefing document
2. Validate: `node validate-briefings.js briefing.md`
3. Preview: `node sync-local.js briefing.md`
4. Commit and push
5. GitHub Actions will **update** the existing issue

The system tracks issues by briefing filename, so updates to the briefing automatically update the corresponding issue.

---

## 🚨 **Troubleshooting**

### **"No briefing documents found"**

**Cause:** Running from wrong directory  
**Fix:** 
```bash
cd scripts/issue-automation
node sync-local.js
```

### **"GITHUB_TOKEN not set"**

**Cause:** Running generate-issues.js locally without token  
**Fix:** This script is meant for CI. Use `sync-local.js` instead for local testing.

### **"Issue creation failed"**

**Cause:** Missing GitHub permissions  
**Fix:** Ensure `issues: write` permission in workflow file

### **Validation fails for existing briefings**

**Cause:** Existing docs may not follow new template  
**Fix:** This is informational only. You can still sync, but consider updating docs for better Copilot compatibility.

---

## 📚 **Advanced Usage**

### **Custom Issue Templates**

Create custom issue templates for different document types:

```javascript
// In generate-issues.js
function generateCustomIssue(briefing) {
  if (briefing.type === 'feature') {
    return featureIssueTemplate(briefing);
  } else if (briefing.type === 'bug-fix') {
    return bugFixIssueTemplate(briefing);
  }
  // ... custom logic
}
```

### **Label Customization**

Edit the label logic in `generate-issues.js`:

```javascript
const labels = [
  'briefing',
  `agent-${briefing.agentNumber}`,
  `${briefing.priority.toLowerCase()}-priority`,
  briefing.framework, // Add framework label
  // Add custom labels based on content
];
```

### **Slack Integration**

Add Slack notifications when issues are created:

```yaml
# In .github/workflows/sync-docs-to-issues.yml
- name: Notify Slack
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "text": "New issue created: #${{ steps.create-issue.outputs.number }}"
      }
```

---

## 🎯 **Integration with ADPA**

This automation integrates seamlessly with ADPA's:

- **Document Templates:** Use ADPA templates to create briefings
- **Quality System:** Generated issues reference quality standards
- **AI Providers:** Issues include AI provider context
- **Project Structure:** Issues link to actual project files

### **ADPA-Specific Features:**

```markdown
**Framework:** PMBOK | BABOK | DMBOK
**Document Type:** Project Charter | Risk Plan | etc.
**AI Provider:** OpenAI | Google AI | Anthropic
```

The issue generator automatically extracts and includes this context.

---

## 📊 **Metrics & Reporting**

The workflow generates a JSON report:

```json
{
  "processed": 3,
  "created": [
    {
      "number": 42,
      "title": "Agent 3: Template Optimization",
      "url": "https://github.com/org/repo/issues/42",
      "file": "AGENT_3_BRIEFING.md"
    }
  ],
  "updated": [],
  "skipped": [],
  "failed": []
}
```

Access reports in GitHub Actions artifacts (30-day retention).

---

## 🎓 **Examples**

### **Example 1: Agent Briefing**

**Input:** `AGENT_3_BRIEFING_TEMPLATE_OPTIMIZATION.md`

**Output:** GitHub Issue with:
- Title: "Agent 3: Template Optimization & Polish"
- Labels: `briefing`, `agent-3`, `medium-priority`
- Body: Structured with objective, deliverables, acceptance criteria
- Links: Back to original briefing document

### **Example 2: Feature Spec**

**Input:** `BRIEFING_AI_PROVIDER_FAILOVER.md`

**Output:** GitHub Issue with:
- Complete API specifications
- Database schema requirements
- Testing checklist
- Integration points

---

## 🔗 **Related Tools**

- **GitHub Copilot:** Use generated issues with Copilot agents
- **GitHub Projects:** Auto-add issues to project boards
- **ADPA Templates:** Create briefings from document templates
- **Issue Templates:** `.github/ISSUE_TEMPLATE/` for manual creation

---

## 📞 **Support**

**Questions?**
- Review the template: `templates/BRIEFING_TEMPLATE.md`
- Check example: `AGENT_3_GITHUB_ISSUE.md`
- Test locally: `node sync-local.js`

**Issues with automation?**
- Check GitHub Actions logs
- Validate briefing: `node validate-briefings.js`
- Review workflow file: `.github/workflows/sync-docs-to-issues.yml`

---

## 🎉 **Benefits**

✅ **For Developers:**
- Clear, actionable tasks
- All context in one place
- Copilot can assist autonomously

✅ **For Teams:**
- Consistent documentation
- Automatic tracking
- Easy collaboration

✅ **For AI Agents:**
- Structured requirements
- Clear acceptance criteria
- Complete technical context

---

**Built for ADPA - Enterprise Document Processing & Automation** 🚀

