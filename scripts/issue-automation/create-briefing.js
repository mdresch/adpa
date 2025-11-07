/**
 * Interactive Briefing Document Creator
 * 
 * Generates a new briefing document from template with interactive prompts
 * 
 * Usage:
 *   node scripts/issue-automation/create-briefing.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
}

async function createBriefing() {
  console.log('🎯 ADPA Briefing Document Generator\n');
  console.log('='.repeat(60));
  console.log('This tool will help you create a Copilot-ready briefing document.\n');
  
  try {
    // Collect information
    const agentNumber = await question('Agent Number (e.g., 4, 5, 6): ');
    const featureName = await question('Feature Name (e.g., "Baseline Integration"): ');
    const mission = await question('Mission (one sentence objective): ');
    
    console.log('\nPriority Options:');
    console.log('  1. 🔴 CRITICAL');
    console.log('  2. 🟢 HIGH');
    console.log('  3. 🟡 MEDIUM');
    console.log('  4. 🟠 LOW');
    const priorityChoice = await question('Select priority (1-4): ');
    const priorities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    const priority = priorities[parseInt(priorityChoice) - 1] || 'MEDIUM';
    
    const timeline = await question('Timeline (e.g., "1 week", "3 days"): ');
    const effort = await question('Effort estimate (e.g., "20-25 hours"): ');
    
    console.log('\n📦 Deliverables (enter each deliverable, empty line to finish):');
    const deliverables = [];
    let deliverable;
    while ((deliverable = await question('  - ')) !== '') {
      deliverables.push(deliverable);
    }
    
    console.log('\n✅ Success Criteria (enter each criterion, empty line to finish):');
    const successCriteria = [];
    let criterion;
    while ((criterion = await question('  - ')) !== '') {
      successCriteria.push(criterion);
    }
    
    // Generate filename
    const sanitizedName = featureName
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
    const filename = `AGENT_${agentNumber}_BRIEFING_${sanitizedName}.md`;
    
    // Generate content
    const priorityEmoji = { CRITICAL: '🔴', HIGH: '🟢', MEDIUM: '🟡', LOW: '🟠' };
    const content = `# 🎯 Agent ${agentNumber}: ${featureName}

**Mission:** ${mission}  
**Priority:** ${priorityEmoji[priority] || '🟡'} ${priority}  
**Timeline:** ${timeline}  
**Effort Estimate:** ${effort}  
**Status:** Ready to start  
**Branch:** \`feature/${featureName.toLowerCase().replace(/\s+/g, '-')}\`

---

## 📋 **Executive Summary**

[Expand on the mission here. Explain WHAT needs to be built, WHY it's important, and WHO will use it.]

**Current State:**
- ✅ [What's already working - replace with actual status]
- ⏳ [What needs to be built - replace with actual requirements]

---

## 🎯 **Your Mission**

${mission}

**End Goal:** [Specific, measurable outcome]

---

## 📦 **Deliverables**

### **Phase 1:**
${deliverables.map(d => `- [ ] ${d}`).join('\n')}

### **Phase 2:**
- [ ] [Add more deliverables as needed]

---

## 📂 **Files You'll Modify**

### **Existing Files to Enhance:**
\`\`\`
path/to/existing/file.tsx                 # Description
\`\`\`

### **New Files to Create:**
\`\`\`
app/new-feature/page.tsx                  # Description
components/NewComponent.tsx               # Description
server/src/routes/newRoutes.ts            # Description
\`\`\`

---

## 🔌 **API Endpoints to Implement**

\`\`\`typescript
// Example endpoint
GET /api/resource
Response: { success: true, data: [...] }
\`\`\`

---

## 🧪 **Testing Checklist**

### **Manual Testing:**
- [ ] [Test scenario 1]
- [ ] [Test scenario 2]

### **Automated Tests:**
\`\`\`typescript
describe('Feature', () => {
  it('should work correctly', () => {
    // Test code
  })
})
\`\`\`

---

## 🎯 **Success Criteria**

${successCriteria.map(c => `- ✅ ${c}`).join('\n')}
${successCriteria.length === 0 ? '- ✅ [Add success criteria]' : ''}
- ✅ All UI polished and responsive
- ✅ Zero critical bugs
- ✅ Documentation complete

---

## 📚 **Resources**

**Documentation:**
- \`docs/path/to/related-doc.md\` - [Description]

**Existing Patterns:**
- \`path/to/similar-code.ts\` - [Description]

---

## 🗓️ **Timeline**

**Day 1:** [Tasks]  
**Day 2:** [Tasks]  
**Day 3:** [Tasks]  
**Day 4:** [Tasks]  
**Day 5:** [Final polish and testing]

---

**Prepared for:** Agent ${agentNumber}  
**Date:** ${new Date().toISOString().split('T')[0]}  
**Status:** Ready to start  
**Questions?** Tag @ProjectLead
`;
    
    // Determine save location
    const rootDir = process.cwd().includes('scripts') 
      ? path.resolve(process.cwd(), '../..')
      : process.cwd();
    const savePath = path.join(rootDir, filename);
    
    // Show preview
    console.log('\n' + '='.repeat(60));
    console.log('📄 Preview:\n');
    console.log(content.substring(0, 500) + '...\n');
    
    const confirm = await question(`Save to: ${savePath}? (y/n): `);
    
    if (confirm.toLowerCase() === 'y') {
      fs.writeFileSync(savePath, content);
      console.log(`\n✅ Briefing created: ${filename}`);
      console.log(`\n📝 Next steps:`);
      console.log(`   1. Edit ${filename} with detailed requirements`);
      console.log(`   2. Validate: node scripts/issue-automation/validate-briefings.js ${filename}`);
      console.log(`   3. Preview issue: node scripts/issue-automation/sync-local.js ${filename}`);
      console.log(`   4. Commit and push to auto-create GitHub issue`);
      console.log('');
    } else {
      console.log('\n❌ Cancelled\n');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    rl.close();
  }
}

createBriefing();

