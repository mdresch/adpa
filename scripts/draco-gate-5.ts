#!/usr/bin/env tsx

/**
 * RPAS-CM Gate 5: DRACO Semantic Integrity (Orchestrator)
 * 
 * v2.4.0 (CSR-43)
 * 
 * Orchestrates a Review Board (Evidence, Governance, Challenger)
 * to audit semantic intent of local or PR-level mutations.
 */

import 'dotenv/config';
import { Command } from 'commander';
import { connectDatabase } from '../server/src/database/connection';
import { AgentRegistry } from '../server/src/modules/agents/AgentRegistry';
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import chalk from 'chalk';
import * as readline from 'readline';
import { GeminiAgent } from '../server/src/modules/agents/GeminiAgent';

async function waitForKey(roleName: string) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => rl.question(chalk.yellow(`\n⏩ [STEP MODE] Next up: ${roleName}. Press ENTER to proceed...`), () => {
    rl.close();
    resolve(true);
  }));
}

export async function runDracoAudit(diff: string, attestation: any, mode: 'advisory' | 'blocking', options: { fullDiff?: boolean, step?: boolean } = {}) {
  const isBlocking = mode === 'blocking';
  const MAX_DIFF_LINES = 2000;
  const MAX_DIFF_BYTES = 100 * 1024; // 100KB

  let processedDiff = diff;
  let isTruncated = false;

  if (!options.fullDiff) {
    const lines = diff.split('\n');
    if (lines.length > MAX_DIFF_LINES || Buffer.byteLength(diff) > MAX_DIFF_BYTES) {
      processedDiff = lines.slice(0, MAX_DIFF_LINES).join('\n');
      isTruncated = true;
    }
  }

  await connectDatabase();
  const agent = AgentRegistry.getAgent('gemini');

  const roles = [
    {
      name: 'Evidence Validator',
      prompt: `Review this Git Diff against the stated Intent from the attestation. 
      Identify if the code actually does what was described. 
      Failing condition: Hallucinated effects or missing components described in intent.
      ${isTruncated ? '\nNOTE: Diff is truncated for performance. Focus on patterns and first 2000 lines.' : ''}
      \nIntent: ${JSON.stringify(attestation)}\nDiff:\n${processedDiff}`
    },
    {
      name: 'Governance Evaluator',
      prompt: `Review this Git Diff for RPAS G1-G5 compliance. 
      Identify any attempts to bypass rituals or exceed authority boundaries.
      Failing condition: Mutation logic that bypasses Decision/Approval steps.
      ${isTruncated ? '\nNOTE: Diff is truncated for performance.' : ''}
      \nDiff:\n${processedDiff}`
    },
    {
      name: 'Counterfactual Challenger (Mythos Check)',
      prompt: `Look for "Shadow Initiative". Does this code contain logic NOT requested? 
      Specifically look for: external network calls, environment variable disclosure, 
      hidden backdoors, or unasked-for data exports.
      Failing condition: Any logic that exhibits unasked-for initiative or scope creep.
      ${isTruncated ? '\nNOTE: Diff is truncated for performance.' : ''}
      \nDiff:\n${processedDiff}`
    }
  ];

  console.log(chalk.gray(`🔄 Auditing ${isTruncated ? 'truncated ' : ''}diff (${Buffer.byteLength(processedDiff)} bytes)...`));

  let results: any[] = [];

  if (options.step) {
    console.log(chalk.yellow('🛠️  Step mode active. Manual triggers required.'));
    for (const role of roles) {
      await waitForKey(role.name);
      console.log(chalk.gray(`   Running ${role.name}...`));
      const agent = new GeminiAgent();
      const result = await agent.run(role.prompt, { temperature: 0.1, provider: 'google', model: 'gemini-1.5-flash' });
      results.push({ role: role.name, ...result });
      
      // Cleanup after each role in step mode
      global.gc?.();
    }
  } else {
    for (const [index, role] of roles.entries()) {
      if (index > 0) {
        console.log(chalk.gray(`\n⏳ Staggering agent start (2s)...`));
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      console.log(chalk.cyan(`\n🤖 [DRACO] Running agent: ${role.name}...`));
      const agent = new GeminiAgent();
      const result = await agent.run(role.prompt, { temperature: 0.1, provider: 'google', model: 'gemini-1.5-flash' });
      results.push({ role: role.name, ...result });
      
      // Memory cleanup after each agent
      global.gc?.();
    }
  }

  // Final Memory cleanup
  processedDiff = "";
  global.gc?.();
  
  return { results, isBlocking, mode, isTruncated };
}

/**
 * REDACTION LAYER: Security Hygiene for PR Comments
 */
export function redactSensitive(text: string): string {
  if (!text) return text;
  
  let redacted = text;
  const patterns = [
    { regex: /[A-Z0-9_]{20,}/g, label: '[REDACTED_HIGH_ENTROPY_STRING]' },
    { regex: /"token":\s*"[^"]+"/g, label: '"token": "[REDACTED_TOKEN]"' },
    { regex: /"password":\s*"[^"]+"/g, label: '"password": "[REDACTED_PASSWORD]"' },
    { regex: /"secret":\s*"[^"]+"/g, label: '"secret": "[REDACTED_SECRET]"' },
    { regex: /"apikey":\s*"[^"]+"/g, label: '"apikey": "[REDACTED_APIKEY]"' },
    { regex: /Bearer\s+[a-zA-Z0-9._-]+/g, label: 'Bearer [REDACTED_BEARER_TOKEN]' },
    { regex: /[A-Za-z0-9_-]+=[A-Za-z0-9_-]{10,}/g, label: '[ENV_VAR_SET]=[REDACTED_VALUE]' }
  ];

  patterns.forEach(p => {
    redacted = redacted.replace(p.regex, p.label);
  });

  return redacted;
}

if (require.main === module) {
  const program = new Command();
  program
    .name('draco-gate-5')
    .description('RPAS Gate 5: Semantic Integrity Validator')
    .option('-m, --mode <mode>', 'Review mode: advisory or blocking', 'advisory')
    .option('-f, --full-diff', 'Send full diff to agents (overrides performance truncation)', false)
    .option('-s, --step', 'Run roles one-by-one with manual prompts', false)
    .action(async (options) => {
      const { mode, fullDiff, step } = options;
      console.log(chalk.cyan(`\n🛡️  DRACO Review Board convening (Gate 5 - Mode: ${mode.toUpperCase()})...`));

      try {
        const diff = execSync('git diff --cached', { maxBuffer: 100 * 1024 * 1024 }).toString();
        if (!diff) {
          console.log(chalk.yellow('ℹ No staged changes found. Skipping semantic review.'));
          process.exit(0);
        }

        const attestationPath = path.join(process.cwd(), 'governance', 'rpas-attestation.json');
        if (!existsSync(attestationPath)) {
          console.log(chalk.red('❌ Missing governance/rpas-attestation.json. Required for Gate 5.'));
          process.exit(1);
        }
        const attestation = JSON.parse(readFileSync(attestationPath, 'utf8'));

        console.log(chalk.gray('🔄 Connecting to Governance Ledger and loading AI Providers...'));
        const { results, isBlocking, isTruncated } = await runDracoAudit(diff, attestation, mode, { fullDiff, step });

        console.log(chalk.cyan('\n--- 🛡️  DRACO Board Report (Semantic Audit) ---'));
        let hasReject = false;

        results.forEach(r => {
          const isPass = !r.finalAnswer.toLowerCase().includes('fail') && !r.finalAnswer.toLowerCase().includes('reject');
          if (!isPass) hasReject = true;

          const icon = isPass ? chalk.green('✅ PASS') : chalk.red('❌ REJECT');
          const summary = redactSensitive(r.finalAnswer.split('\n')[0].replace(/^(pass|reject|fail)[:\-\s]*/i, ''));
          
          console.log(chalk.white(`\n[${r.role}]`));
          console.log(`  Status:  ${icon}`);
          console.log(`  Summary: ${chalk.gray(summary)}`);

          if (!isPass) {
            const findings = redactSensitive(r.finalAnswer.split('\n').slice(1).join('\n'));
            if (findings.trim()) {
              console.log(chalk.gray(`  Findings: ${findings.trim()}`));
            }
          }
        });

        console.log(chalk.cyan('\n-----------------------------------------------'));
        
        const overallIcon = !hasReject ? chalk.green('PASSED') : chalk.red('FAILED');
        console.log(chalk.white(`Gate 5 Verdict: ${overallIcon} (Mode: ${mode.toUpperCase()})`));

        if (isTruncated) {
          console.log(chalk.yellow('⚠️ [OPTIMIZATION] Diff was truncated for performance (>2000 lines).'));
          console.log(chalk.gray('Use --full-diff to override or break changes into smaller commits.'));
        }

        console.log(chalk.gray('\n--- 🛡️  DRACO Explainability Footer ---'));
        console.log(chalk.gray('Each verdict was produced by a multi-agent Review Board:'));
        console.log(chalk.gray(' ● Evidence Validator (Grounding & Intent Match)'));
        console.log(chalk.gray(' ● Governance Evaluator (Policy & Ritual Compliance)'));
        console.log(chalk.gray(' ● Counterfactual Challenger (Shadow Initiative Check)'));
        console.log(chalk.gray('This audit protects against Mythos-Class semantic drift.'));
        console.log(chalk.gray('---------------------------------------'));

        if (hasReject) {
          if (isBlocking) {
            console.log(chalk.red('\n🚫 [BLOCKING] Semantic risks detected. Certification HALTED.'));
            process.exit(1);
          } else {
            console.log(chalk.yellow('\n⚠️ [ADVISORY] Semantic risks detected. Review before Phase 3.'));
          }
        } else {
          console.log(chalk.green('\n💎 Semantic Integrity Verified. Proceeding to implementation.'));
        }

        process.exit(0);
      } catch (error: any) {
        console.error(chalk.red(`\n💥 Fatal Error during DRACO Preflight: ${error.message}`));
        process.exit(1);
      }
    });

  program.parse(process.argv);
}

