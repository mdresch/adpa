/**
 * Local Issue Preview
 * 
 * Preview what GitHub issues will be created from briefing documents
 * WITHOUT actually creating them. Use this to test before running the workflow.
 * 
 * Usage:
 *   node scripts/issue-automation/sync-local.js
 *   node scripts/issue-automation/sync-local.js path/to/briefing.md
 */

const fs = require('fs');
const path = require('path');

/**
 * Parse briefing document (same logic as generate-issues.js)
 */
function parseBriefingDocument(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const filename = path.basename(filePath);
  
  const agentMatch = filename.match(/AGENT[_-]?(\d+)/i);
  const agentNumber = agentMatch ? agentMatch[1] : 'Unknown';
  
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].replace(/[🎨🎯📋✅⏳🔧🚀]/g, '').trim() : filename;
  
  const missionMatch = content.match(/\*\*Mission:\*\*\s*(.+)/i);
  const mission = missionMatch ? missionMatch[1].trim() : '';
  
  const priorityMatch = content.match(/\*\*Priority:\*\*\s*([🟢🟡🟠🔴]?\s*\w+)/i);
  const priority = priorityMatch ? priorityMatch[1].replace(/[🟢🟡🟠🔴]/g, '').trim().toUpperCase() : 'MEDIUM';
  
  const effortMatch = content.match(/\*\*Effort Estimate:\*\*\s*(.+)/i);
  const effort = effortMatch ? effortMatch[1].trim() : 'Unknown';
  
  const deliverablesMatch = content.match(/##\s*📦\s*\*\*Deliverables\*\*([\s\S]*?)(?=##|$)/i);
  const deliverables = deliverablesMatch ? deliverablesMatch[1].trim() : '';
  
  const successMatch = content.match(/##\s*🎯\s*\*\*Success Criteria\*\*([\s\S]*?)(?=##|$)/i);
  const successCriteria = successMatch ? successMatch[1].trim() : '';
  
  return {
    agentNumber,
    title,
    mission,
    priority,
    effort,
    deliverables,
    successCriteria,
    originalFile: filePath
  };
}

/**
 * Preview issue
 */
function previewIssue(briefing) {
  console.log('\n' + '='.repeat(70));
  console.log(`📝 PREVIEW: ${briefing.title}`);
  console.log('='.repeat(70));
  console.log(`\n**Agent:** ${briefing.agentNumber}`);
  console.log(`**Priority:** ${briefing.priority}`);
  console.log(`**Effort:** ${briefing.effort}`);
  console.log(`**Source:** ${briefing.originalFile}`);
  
  console.log(`\n**Mission:**`);
  console.log(briefing.mission || '(No mission statement found)');
  
  console.log(`\n**Deliverables:**`);
  if (briefing.deliverables) {
    console.log(briefing.deliverables.substring(0, 300) + '...');
  } else {
    console.log('(No deliverables section found)');
  }
  
  console.log(`\n**Success Criteria:**`);
  if (briefing.successCriteria) {
    console.log(briefing.successCriteria.substring(0, 300) + '...');
  } else {
    console.log('(No success criteria found)');
  }
  
  console.log(`\n**Labels:**`);
  console.log(`- briefing`);
  console.log(`- agent-${briefing.agentNumber}`);
  console.log(`- ${briefing.priority.toLowerCase()}-priority`);
  console.log(`- documentation-sync`);
}

/**
 * Find briefing documents
 */
function findBriefingDocuments(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
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

/**
 * Main
 */
function main() {
  console.log('🔍 Local Issue Preview Tool\n');
  
  const args = process.argv.slice(2);
  let briefingFiles = [];
  
  if (args.length > 0) {
    // Process specific file
    briefingFiles = args.filter(f => fs.existsSync(f));
  } else {
    // Find all briefing documents
    briefingFiles = findBriefingDocuments(process.cwd());
  }
  
  if (briefingFiles.length === 0) {
    console.log('❌ No briefing documents found');
    console.log('\nUsage:');
    console.log('  node sync-local.js                    # Preview all briefings');
    console.log('  node sync-local.js path/to/file.md    # Preview specific file');
    return;
  }
  
  console.log(`📄 Found ${briefingFiles.length} briefing document(s)\n`);
  
  briefingFiles.forEach(file => {
    const briefing = parseBriefingDocument(file);
    previewIssue(briefing);
  });
  
  console.log('\n' + '='.repeat(70));
  console.log('✅ Preview complete!');
  console.log('\n💡 To actually create these issues, push to GitHub and the');
  console.log('   workflow will run automatically.\n');
}

main();

