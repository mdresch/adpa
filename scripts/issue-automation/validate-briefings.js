/**
 * Briefing Document Validator
 * 
 * Validates that briefing documents have all required sections
 * for generating Copilot-ready GitHub issues.
 * 
 * Usage:
 *   node scripts/issue-automation/validate-briefings.js
 *   node scripts/issue-automation/validate-briefings.js path/to/briefing.md
 */

const fs = require('fs');
const path = require('path');

const REQUIRED_SECTIONS = [
  { name: 'Title', pattern: /^#\s+.+$/m, required: true },
  { name: 'Mission/Objective', pattern: /\*\*Mission:\*\*/i, required: true },
  { name: 'Priority', pattern: /\*\*Priority:\*\*/i, required: true },
  { name: 'Deliverables', pattern: /##\s*📦\s*\*\*Deliverables\*\*/i, required: true },
  { name: 'Success Criteria', pattern: /##\s*🎯\s*\*\*Success Criteria\*\*/i, required: true },
];

const RECOMMENDED_SECTIONS = [
  { name: 'Effort Estimate', pattern: /\*\*Effort Estimate:\*\*/i },
  { name: 'Timeline', pattern: /\*\*Timeline:\*\*/i },
  { name: 'Files to Modify', pattern: /##\s*📂\s*\*\*Files/i },
  { name: 'API Endpoints', pattern: /##\s*🔌\s*\*\*API Endpoints/i },
  { name: 'Testing Checklist', pattern: /##\s*🧪\s*\*\*Testing/i },
  { name: 'Resources', pattern: /##\s*📚\s*\*\*Resources\*\*/i },
];

/**
 * Validate a single briefing document
 */
function validateBriefing(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const filename = path.basename(filePath);
  
  const validation = {
    file: filename,
    path: filePath,
    valid: true,
    missing: [],
    present: [],
    recommendations: []
  };
  
  console.log(`\n📄 Validating: ${filename}`);
  console.log('   ' + '-'.repeat(60));
  
  // Check required sections
  REQUIRED_SECTIONS.forEach(section => {
    if (content.match(section.pattern)) {
      console.log(`   ✅ ${section.name}`);
      validation.present.push(section.name);
    } else {
      console.log(`   ❌ ${section.name} - MISSING (REQUIRED)`);
      validation.missing.push(section.name);
      validation.valid = false;
    }
  });
  
  // Check recommended sections
  console.log(`\n   Recommended Sections:`);
  RECOMMENDED_SECTIONS.forEach(section => {
    if (content.match(section.pattern)) {
      console.log(`   ✅ ${section.name}`);
      validation.present.push(section.name);
    } else {
      console.log(`   ⚠️  ${section.name} - Missing (recommended)`);
      validation.recommendations.push(section.name);
    }
  });
  
  // Quality checks
  console.log(`\n   Quality Checks:`);
  
  const wordCount = content.split(/\s+/).length;
  console.log(`   📏 Word count: ${wordCount} ${wordCount < 500 ? '(consider adding more detail)' : ''}`);
  
  const codeBlocks = (content.match(/```/g) || []).length / 2;
  console.log(`   💻 Code examples: ${codeBlocks} ${codeBlocks === 0 ? '(consider adding examples)' : ''}`);
  
  const checkboxes = (content.match(/- \[[ x]\]/g) || []).length;
  console.log(`   ✓  Checkboxes: ${checkboxes} ${checkboxes === 0 ? '(consider adding task lists)' : ''}`);
  
  // Copilot-readiness score
  const requiredMet = REQUIRED_SECTIONS.filter(s => content.match(s.pattern)).length;
  const recommendedMet = RECOMMENDED_SECTIONS.filter(s => content.match(s.pattern)).length;
  const score = ((requiredMet / REQUIRED_SECTIONS.length) * 70) + 
                ((recommendedMet / RECOMMENDED_SECTIONS.length) * 30);
  
  console.log(`\n   🎯 Copilot-Readiness Score: ${Math.round(score)}%`);
  
  if (score >= 90) {
    console.log(`   ✅ Excellent! Ready for Copilot agents`);
  } else if (score >= 70) {
    console.log(`   ✅ Good! Copilot should handle this well`);
  } else if (score >= 50) {
    console.log(`   ⚠️  Fair. Consider adding more detail`);
  } else {
    console.log(`   ❌ Poor. Add required sections`);
  }
  
  return validation;
}

/**
 * Find all briefing documents
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
  console.log('🔍 ADPA Briefing Document Validator\n');
  console.log('='.repeat(70));
  
  const args = process.argv.slice(2);
  let briefingFiles = [];
  
  if (args.length > 0) {
    briefingFiles = args.filter(f => fs.existsSync(f));
  } else {
    const cwd = process.cwd();
    const rootDir = cwd.includes('scripts') ? path.resolve(cwd, '../..') : cwd;
    briefingFiles = findBriefingDocuments(rootDir);
  }
  
  if (briefingFiles.length === 0) {
    console.log('\n❌ No briefing documents found');
    console.log('\nUsage:');
    console.log('  node validate-briefings.js                  # Validate all');
    console.log('  node validate-briefings.js briefing.md      # Validate one');
    return;
  }
  
  console.log(`\n📁 Found ${briefingFiles.length} briefing document(s)\n`);
  
  const results = briefingFiles.map(file => validateBriefing(file));
  
  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 Validation Summary:\n');
  
  const valid = results.filter(r => r.valid).length;
  const invalid = results.filter(r => !r.valid).length;
  
  console.log(`✅ Valid:   ${valid}`);
  console.log(`❌ Invalid: ${invalid}`);
  
  if (invalid > 0) {
    console.log('\n⚠️  Invalid Documents:');
    results.filter(r => !r.valid).forEach(r => {
      console.log(`\n   ${r.file}:`);
      r.missing.forEach(section => {
        console.log(`   - Missing: ${section}`);
      });
    });
  }
  
  console.log('\n' + '='.repeat(70));
  
  if (invalid === 0) {
    console.log('✅ All briefing documents are Copilot-ready!\n');
  } else {
    console.log('⚠️  Some documents need updates before syncing to GitHub.\n');
    process.exit(1);
  }
}

main();

