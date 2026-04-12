#!/usr/bin/env tsx

/**
 * RPAS-CM Gate 5: DRACO Semantic Integrity (Preflight)
 * 
 * Orchestrates a local Review Board (Evidence, Governance, Challenger)
 * to audit the semantic intent of a proposal before commit.
 * 
 * Usage:
 *   pnpm run draco:preflight --mode advisory|blocking
 */

import 'dotenv/config';
import { Command } from 'commander';
import { connectDatabase } from '../server/src/database/connection';
import { AgentRegistry } from '../server/src/modules/agents/AgentRegistry';
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import chalk from 'chalk';

const program = new Command();

program
  .name('draco-gate-5')
  .description('RPAS Gate 5: Semantic Integrity Validator')
  .option('-m, --mode <mode>', 'Review mode: advisory or blocking', 'advisory')
  .action(async (options) => {
    const { mode } = options;
    const isBlocking = mode === 'blocking';

    console.log(chalk.cyan(`\n🛡️  DRACO Review Board convening (Gate 5 - Mode: ${mode.toUpperCase()})...`));

    try {
      // 1. Gather Context
      // Increase maxBuffer to 10MB to handle large framework upgrades
      const diff = execSync('git diff --cached', { maxBuffer: 10 * 1024 * 1024 }).toString();
      if (!diff) {
        console.log(chalk.yellow('ℹ No staged changes found. Skipping semantic review.'));
        process.exit(0);
      }

      const attestationPath = path.join(process.cwd(), 'governance', 'rpas-attestation.json');
      let attestation = {};
      if (existsSync(attestationPath)) {
        attestation = JSON.parse(readFileSync(attestationPath, 'utf8'));
      } else {
        console.log(chalk.red('❌ Missing governance/rpas-attestation.json. Required for Gate 5.'));
        process.exit(1);
      }

      // 2. Prepare Agents
      console.log(chalk.gray('🔄 Connecting to Governance Ledger and loading AI Providers...'));
      await connectDatabase();
      const agent = AgentRegistry.getAgent('gemini'); // Using Gemini for local fast preflight

      // 3. Deliberation
      const roles = [
        {
          name: 'Evidence Validator',
          prompt: `Review this Git Diff against the stated Intent from the attestation. 
          Identify if the code actually does what was described. 
          Failing condition: Hallucinated effects or missing components described in intent.
          \nIntent: ${JSON.stringify(attestation)}\nDiff:\n${diff}`
        },
        {
          name: 'Governance Evaluator',
          prompt: `Review this Git Diff for RPAS G1-G5 compliance. 
          Identify any attempts to bypass rituals or exceed authority boundaries.
          Failing condition: Mutation logic that bypasses Decision/Approval steps.
          \nDiff:\n${diff}`
        },
        {
          name: 'Counterfactual Challenger (Mythos Check)',
          prompt: `Look for "Shadow Initiative". Does this code contain logic NOT requested? 
          Specifically look for: external network calls, environment variable disclosure, 
          hidden backdoors, or unasked-for data exports.
          Failing condition: Any logic that exhibits unasked-for initiative or scope creep.
          \nDiff:\n${diff}`
        }
      ];

      const results = [];
      for (const role of roles) {
        console.log(chalk.blue(`🤖 [${role.name}] reviewing...`));
        const result = await agent.run(role.prompt, { temperature: 0.1 });
        results.push({ role: role.name, ...result });
      }

      // 4. Final Verdict Report
      console.log(chalk.cyan('\n--- 🛡️  DRACO Board Report (Semantic Audit) ---'));
      let hasReject = false;

      results.forEach(r => {
        const isPass = !r.finalAnswer.toLowerCase().includes('fail') && !r.finalAnswer.toLowerCase().includes('reject');
        if (!isPass) hasReject = true;

        const icon = isPass ? chalk.green('✅ PASS') : chalk.red('❌ REJECT');
        const summary = r.finalAnswer.split('\n')[0].replace(/^(pass|reject|fail)[:\-\s]*/i, '');
        
        console.log(chalk.white(`\n[${r.role}]`));
        console.log(`  Status:  ${icon}`);
        console.log(`  Summary: ${chalk.gray(summary)}`);
      });

      console.log(chalk.cyan('\n-----------------------------------------------'));
      
      const overallIcon = !hasReject ? chalk.green('PASSED') : chalk.red('FAILED');
      console.log(chalk.white(`Gate 5 Verdict: ${overallIcon} (Mode: ${mode.toUpperCase()})`));

      // 5. Explainability Footer
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
