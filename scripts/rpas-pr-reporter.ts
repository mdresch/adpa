#!/usr/bin/env tsx

/**
 * RPAS-CM PR Governance Reporter (v2.4.0)
 * 
 * Orchestrates DRACO audit on a Pull Request and posts the results 
 * as a structured, security-redacted comment via the GitHub CLI.
 */

import 'dotenv/config';
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { runDracoAudit, redactSensitive } from './draco-gate-5';

async function main() {
  console.log('🚀 Initializing RPAS PR Governance Audit...');

  try {
    // 1. Identify PR Context
    // In GitHub Actions, PR number is available in GITHUB_EVENT_PATH
    let prNumber = process.env.PR_NUMBER;
    if (!prNumber && process.env.GITHUB_EVENT_PATH) {
      const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
      prNumber = event.pull_request?.number;
    }

    if (!prNumber) {
      console.log('⚠️ No PR context detected. Attempting to find via GH CLI...');
      try {
        prNumber = execSync('gh pr view --json number --jq .number').toString().trim();
      } catch (e) {
        console.error('❌ Could not determine PR number. Ensure you are in a PR branch.');
        process.exit(1);
      }
    }

    console.log(`📑 Auditing PR #${prNumber}...`);

    // 2. Fetch PR Diff (against base branch)
    const baseBranch = process.env.GITHUB_BASE_REF || 'adpa-project-charter';
    let diff = '';
    try {
      console.log(`🔍 Comparing against origin/${baseBranch}...`);
      diff = execSync(`git diff origin/${baseBranch}...HEAD`, { maxBuffer: 10 * 1024 * 1024 }).toString();
    } catch (e) {
      console.log(`⚠️  Could not compare against origin/${baseBranch}. Falling back to staged changes...`);
      diff = execSync('git diff --cached', { maxBuffer: 10 * 1024 * 1024 }).toString();
    }

    if (!diff) {
      console.log('ℹ No differences found compared to base. Skipping audit.');
      process.exit(0);
    }

    // 3. Load Attestation
    const attestationPath = path.join(process.cwd(), 'governance', 'rpas-attestation.json');
    if (!existsSync(attestationPath)) {
      console.error('❌ Missing governance/rpas-attestation.json in PR branch. Required for Gate 5.');
      process.exit(1);
    }
    const attestation = JSON.parse(readFileSync(attestationPath, 'utf8'));

    // 4. Run DRACO Audit
    console.log('🛡️  Deliberating semantic integrity (Advisory Mode)...');
    const mode = (process.env.DRACO_MODE as 'advisory' | 'blocking') || 'advisory';
    const { results } = await runDracoAudit(diff, attestation, mode);

    // 5. Generate Markdown Report
    let hasReject = false;
    let reportMarkdown = `## 🛡️ RPAS-CM Semantic Governance Audit (v2.4.0)\n\n`;
    reportMarkdown += `> [!IMPORTANT]\n`;
    reportMarkdown += `> **Audit Mode**: ${mode.toUpperCase()}\n`;
    reportMarkdown += `> **Timestamp**: ${new Date().toISOString()}\n\n`;

    results.forEach(r => {
      const isPass = !r.finalAnswer.toLowerCase().includes('fail') && !r.finalAnswer.toLowerCase().includes('reject');
      if (!isPass) hasReject = true;

      const status = isPass ? '✅ **PASS**' : '❌ **REJECT**';
      const rawSummary = r.finalAnswer.split('\n')[0].replace(/^(pass|reject|fail)[:\-\s]*/i, '');
      const summary = redactSensitive(rawSummary);

      reportMarkdown += `### ${r.role}\n`;
      reportMarkdown += `- **Status**: ${status}\n`;
      reportMarkdown += `- **Summary**: ${summary}\n\n`;
      
      if (!isPass) {
        // Redact findings for public consumption
        const findings = redactSensitive(r.finalAnswer.split('\n').slice(1).join('\n'));
        reportMarkdown += `<details>\n<summary>View Findings</summary>\n\n${findings}\n\n</details>\n\n`;
      }
    });

    reportMarkdown += `***\n\n`;
    reportMarkdown += `### 🚦 Final Verdict: ${hasReject ? '❌ **REJECTED**' : '✅ **PASSED**'}\n`;
    
    if (hasReject) {
      if (mode === 'blocking') {
        reportMarkdown += `> [!CAUTION]\n`;
        reportMarkdown += `> **Blocking Merge**: High semantic risk detected. Address findings to resume orchestration.\n`;
      } else {
        reportMarkdown += `> [!WARNING]\n`;
        reportMarkdown += `> **Advisory Warning**: Potential semantic drift detected. Human review required before graduation to Phase 3.\n`;
      }
    } else {
      reportMarkdown += `> [!TIP]\n`;
      reportMarkdown += `> **Semantic Integrity Verified**: No shadow initiative or drift detected.\n`;
    }

    reportMarkdown += `\n\n--- 🛡️ **DRACO Explainability Footer** ---\n`;
    reportMarkdown += `Each verdict was produced by a multi-agent Review Board (Evidence, Governance, Challenger). This audit protects against Mythos-Class semantic drift.\n`;

    // 6. Post Comment to GitHub
    console.log('📝 Posting report to GitHub...');
    const escapedReport = reportMarkdown.replace(/"/g, '\\"'); // Very basic escaping
    // Use a temp file to avoid shell argument length limits
    const tempReportPath = path.join(process.cwd(), '.rpas-pr-report.md');
    require('fs').writeFileSync(tempReportPath, reportMarkdown);
    
    execSync(`gh pr comment ${prNumber} --body-file="${tempReportPath}"`);
    console.log('✅ PR Report posted successfully.');

    process.exit(hasReject && mode === 'blocking' ? 1 : 0);

  } catch (error: any) {
    console.error(`\n💥 Fatal Error during PR Reporter execution: ${error.message}`);
    process.exit(1);
  }
}

main();
