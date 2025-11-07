/**
 * Generate GitHub Issues from Briefing Documents
 * 
 * Parses ADPA briefing documents (AGENT_X_BRIEFING_*.md) and creates
 * Copilot-ready GitHub issues with proper context, acceptance criteria,
 * and implementation details.
 */

const fs = require('fs');
const path = require('path');
const { Octokit } = require('@octokit/rest');

// Initialize Octokit
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

const [owner, repo] = process.env.REPOSITORY.split('/');

/**
 * Parse briefing document and extract structured data
 */
function parseBriefingDocument(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const filename = path.basename(filePath);
  
  // Extract metadata from filename and content
  const agentMatch = filename.match(/AGENT[_-]?(\d+)/i);
  const agentNumber = agentMatch ? agentMatch[1] : 'Unknown';
  
  // Extract title (first H1)
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].replace(/[🎨🎯📋✅⏳🔧🚀]/g, '').trim() : filename;
  
  // Extract mission/objective
  const missionMatch = content.match(/\*\*Mission:\*\*\s*(.+)/i);
  const mission = missionMatch ? missionMatch[1].trim() : '';
  
  // Extract priority
  const priorityMatch = content.match(/\*\*Priority:\*\*\s*([🟢🟡🟠🔴]?\s*\w+)/i);
  const priority = priorityMatch ? priorityMatch[1].replace(/[🟢🟡🟠🔴]/g, '').trim().toUpperCase() : 'MEDIUM';
  
  // Extract effort estimate
  const effortMatch = content.match(/\*\*Effort Estimate:\*\*\s*(.+)/i);
  const effort = effortMatch ? effortMatch[1].trim() : 'Unknown';
  
  // Extract timeline
  const timelineMatch = content.match(/\*\*Timeline:\*\*\s*(.+)/i);
  const timeline = timelineMatch ? timelineMatch[1].trim() : 'Unknown';
  
  // Extract deliverables section
  const deliverablesMatch = content.match(/##\s*📦\s*\*\*Deliverables\*\*([\s\S]*?)(?=##|$)/i);
  const deliverables = deliverablesMatch ? deliverablesMatch[1].trim() : '';
  
  // Extract files to modify/create
  const filesMatch = content.match(/##\s*📂\s*\*\*Files You'll (Modify|Create)\*\*([\s\S]*?)(?=##|$)/i);
  const files = filesMatch ? filesMatch[2].trim() : '';
  
  // Extract API endpoints
  const apiMatch = content.match(/##\s*🔌\s*\*\*API Endpoints([\s\S]*?)(?=##|$)/i);
  const apiEndpoints = apiMatch ? apiMatch[1].trim() : '';
  
  // Extract testing checklist
  const testingMatch = content.match(/##\s*🧪\s*\*\*Testing([\s\S]*?)(?=##|$)/i);
  const testing = testingMatch ? testingMatch[1].trim() : '';
  
  // Extract success criteria
  const successMatch = content.match(/##\s*🎯\s*\*\*Success Criteria\*\*([\s\S]*?)(?=##|$)/i);
  const successCriteria = successMatch ? successMatch[1].trim() : '';
  
  // Extract resources/documentation
  const resourcesMatch = content.match(/##\s*📚\s*\*\*Resources\*\*([\s\S]*?)(?=##|$)/i);
  const resources = resourcesMatch ? resourcesMatch[1].trim() : '';
  
  return {
    agentNumber,
    title,
    mission,
    priority,
    effort,
    timeline,
    deliverables,
    files,
    apiEndpoints,
    testing,
    successCriteria,
    resources,
    originalFile: filePath,
    content
  };
}

/**
 * Generate Copilot-ready issue body from parsed briefing
 */
function generateIssueBody(briefing) {
  return `## 🎯 Task Objective

${briefing.mission || 'See briefing document for details.'}

---

## 📚 Context & Background

**Briefing Document:** \`${briefing.originalFile}\`

**Priority:** ${briefing.priority}  
**Effort Estimate:** ${briefing.effort}  
**Timeline:** ${briefing.timeline}

**Technology Stack:**
- Frontend: Next.js 14 (Pages Router), React 18, TypeScript 5.x
- Backend: Express.js, Node.js 18, TypeScript 5.x
- Database: PostgreSQL 15 (Supabase), Redis 7
- AI: OpenAI, Google AI, Anthropic, Mistral
- UI: Tailwind CSS, Radix UI, Framer Motion, Recharts

**Related Documentation:**
${briefing.resources || '- See briefing document for related files'}

---

## 📦 Expected Output

${briefing.deliverables || 'See briefing document for detailed deliverables.'}

### Files to Modify/Create:
${briefing.files || 'See briefing document for file list.'}

${briefing.apiEndpoints ? `### API Endpoints:\n${briefing.apiEndpoints}` : ''}

---

## 🔧 Constraints & Requirements

### **Database Requirements:**
- Use UUID primary keys (\`uuid_generate_v4()\`)
- JSONB for flexible content storage
- Parameterized queries (prevent SQL injection)
- Indexes on frequently queried columns
- Timestamps with time zone
- **Markdown storage rule:** ALL text content MUST be stored as Markdown in database

### **Backend Requirements:**
- TypeScript strict mode enabled
- Use Winston logger for all logging
- Follow existing service patterns
- JWT authentication with RBAC
- Joi validation for all inputs
- Error handling with proper HTTP status codes

### **Frontend Requirements:**
- React functional components (no class components)
- TypeScript with proper interface definitions
- Tailwind CSS for styling
- Radix UI components (existing library)
- Loading states for async operations
- Error handling with toast notifications
- Responsive design (mobile-friendly)

### **Security Requirements:**
- Admin endpoints require \`role === 'admin'\` check
- SQL injection prevention (parameterized queries)
- Input validation on all user inputs
- No sensitive data in error messages
- CORS configured for production domain

---

## ✅ Acceptance Criteria

${briefing.successCriteria || `
- [ ] All deliverables implemented
- [ ] Code follows TypeScript strict mode
- [ ] No linter errors
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Peer review approved
- [ ] Features validated by stakeholders
`}

### **Testing Requirements:**
${briefing.testing || `
- [ ] Manual UI testing completed
- [ ] API endpoints tested (Postman/curl)
- [ ] Database queries verified
- [ ] Error scenarios handled
- [ ] Edge cases covered
`}

### **Technical Requirements:**
- [ ] TypeScript compilation successful (\`npm run build\`)
- [ ] No linter errors (\`npm run lint\`)
- [ ] All database migrations run successfully
- [ ] Dependencies added to \`package.json\`
- [ ] Environment variables documented
- [ ] Logging captures important events
- [ ] Error handling prevents crashes

---

## 🧪 Testing Instructions

1. **Local Setup:**
   \`\`\`bash
   # Backend
   cd server && npm install && npm run dev
   
   # Frontend  
   pnpm install && pnpm dev
   
   # Run migrations
   cd server && npm run migrate
   \`\`\`

2. **Manual Testing:**
   - Login as admin user
   - Navigate to new features
   - Test all user interactions
   - Verify error handling
   - Check responsive design

3. **API Testing:**
   \`\`\`bash
   # Test endpoints with curl/Postman
   curl http://localhost:5000/api/[endpoint] \\
     -H "Authorization: Bearer \${TOKEN}"
   \`\`\`

4. **Database Verification:**
   \`\`\`sql
   -- Verify tables created
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN (...);
   \`\`\`

---

## 📊 Definition of Done

- [ ] Code reviewed and approved
- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] Documentation updated
- [ ] Database migrations applied
- [ ] Features validated
- [ ] Deployed to staging
- [ ] Ready for production

---

## 🏷️ Labels

\`agent-${briefing.agentNumber}\`, \`briefing\`, \`automation\`, \`${briefing.priority.toLowerCase()}-priority\`

---

## 📝 Additional Notes

**Original Briefing:** \`${briefing.originalFile}\`

For complete implementation details, technical specifications, and architecture decisions, refer to the original briefing document.

---

**Auto-generated from:** \`${briefing.originalFile}\`  
**Generated:** ${new Date().toISOString()}  
**Sync Status:** 🤖 Automated via GitHub Actions
`;
}

/**
 * Check if issue already exists for this briefing
 */
async function findExistingIssue(briefingFile) {
  try {
    const { data: issues } = await octokit.rest.issues.listForRepo({
      owner,
      repo,
      state: 'all',
      labels: 'briefing',
      per_page: 100
    });

    return issues.find(issue => 
      issue.body && issue.body.includes(`${briefingFile}`)
    );
  } catch (error) {
    console.error('Error finding existing issue:', error.message);
    return null;
  }
}

/**
 * Create or update GitHub issue from briefing
 */
async function syncBriefingToIssue(filePath) {
  try {
    console.log(`\n📄 Processing: ${filePath}`);
    
    // Parse briefing document
    const briefing = parseBriefingDocument(filePath);
    console.log(`   Title: ${briefing.title}`);
    console.log(`   Agent: ${briefing.agentNumber}`);
    console.log(`   Priority: ${briefing.priority}`);
    
    // Generate issue body
    const issueBody = generateIssueBody(briefing);
    
    // Determine labels
    const labels = [
      'briefing',
      'documentation-sync',
      `agent-${briefing.agentNumber}`,
      `${briefing.priority.toLowerCase()}-priority`
    ];
    
    // Check if issue already exists
    const existingIssue = await findExistingIssue(path.basename(filePath));
    
    if (existingIssue) {
      console.log(`   Found existing issue: #${existingIssue.number}`);
      
      // Update existing issue
      const { data: updatedIssue } = await octokit.rest.issues.update({
        owner,
        repo,
        issue_number: existingIssue.number,
        body: issueBody,
        labels
      });
      
      console.log(`   ✅ Updated issue #${updatedIssue.number}`);
      return { action: 'updated', issue: updatedIssue };
      
    } else {
      // Create new issue
      const { data: newIssue } = await octokit.rest.issues.create({
        owner,
        repo,
        title: briefing.title,
        body: issueBody,
        labels
      });
      
      console.log(`   ✅ Created issue #${newIssue.number}`);
      return { action: 'created', issue: newIssue };
    }
    
  } catch (error) {
    console.error(`   ❌ Failed to sync ${filePath}:`, error.message);
    return { action: 'failed', error: error.message };
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🤖 ADPA Documentation → GitHub Issues Sync\n');
  console.log('=' .repeat(60));
  
  const report = {
    processed: 0,
    created: [],
    updated: [],
    skipped: [],
    failed: []
  };
  
  try {
    // Read list of changed files
    let briefingFiles = [];
    
    if (fs.existsSync('changed-files.txt')) {
      const changedFiles = fs.readFileSync('changed-files.txt', 'utf8')
        .split('\n')
        .filter(f => f.trim());
      briefingFiles = changedFiles;
    } else {
      // Find all briefing documents
      briefingFiles = findBriefingDocuments('.');
    }
    
    console.log(`\n📁 Found ${briefingFiles.length} briefing document(s)\n`);
    
    if (briefingFiles.length === 0) {
      console.log('⚠️  No briefing documents to process');
      return;
    }
    
    // Process each briefing document
    for (const filePath of briefingFiles) {
      if (!fs.existsSync(filePath)) {
        console.log(`⏭️  Skipping ${filePath} (file not found)`);
        report.skipped.push({ file: filePath, reason: 'File not found' });
        continue;
      }
      
      report.processed++;
      const result = await syncBriefingToIssue(filePath);
      
      if (result.action === 'created') {
        report.created.push({
          number: result.issue.number,
          title: result.issue.title,
          url: result.issue.html_url,
          file: filePath
        });
      } else if (result.action === 'updated') {
        report.updated.push({
          number: result.issue.number,
          title: result.issue.title,
          url: result.issue.html_url,
          file: filePath
        });
      } else if (result.action === 'failed') {
        report.failed.push({
          file: filePath,
          error: result.error
        });
      }
      
      // Rate limit: wait 1 second between API calls
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Print summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 Sync Summary:\n');
    console.log(`✅ Created:   ${report.created.length}`);
    console.log(`📝 Updated:   ${report.updated.length}`);
    console.log(`⏭️  Skipped:   ${report.skipped.length}`);
    console.log(`❌ Failed:    ${report.failed.length}`);
    
    if (report.created.length > 0) {
      console.log('\n📝 Created Issues:');
      report.created.forEach(issue => {
        console.log(`   #${issue.number} - ${issue.title}`);
        console.log(`   ${issue.url}`);
      });
    }
    
    if (report.updated.length > 0) {
      console.log('\n🔄 Updated Issues:');
      report.updated.forEach(issue => {
        console.log(`   #${issue.number} - ${issue.title}`);
      });
    }
    
    if (report.failed.length > 0) {
      console.log('\n❌ Failed:');
      report.failed.forEach(item => {
        console.log(`   ${item.file}: ${item.error}`);
      });
    }
    
    // Save report
    fs.writeFileSync('issue-generation-report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Report saved to: issue-generation-report.json');
    
    console.log('\n' + '=' .repeat(60));
    console.log('✅ Documentation sync complete!\n');
    
  } catch (error) {
    console.error('\n❌ Sync failed:', error);
    process.exit(1);
  }
}

/**
 * Recursively find all briefing documents
 */
function findBriefingDocuments(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    // Skip node_modules, .git, and hidden directories
    if (stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules') {
        findBriefingDocuments(filePath, fileList);
      }
    } else if (file.match(/BRIEFING.*\.md$/i) || file.match(/AGENT.*BRIEFING.*\.md$/i)) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Run the sync
main();

