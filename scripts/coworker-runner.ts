#!/usr/bin/env tsx

/**
 * ADPA Coworker Runner Utility
 * Executes a backend agent from the CLI.
 */

import 'dotenv/config';
import { AgentRegistry, AgentDomain } from '../server/src/modules/agents/AgentRegistry';
import { connectDatabase } from '../server/src/database/connection';
import chalk from 'chalk';

export async function runCoworker(domain: AgentDomain, goal: string, context: any = {}) {
  console.log(chalk.blue(`\n🤖 Coworker [${domain.toUpperCase()}] starting task...`));
  console.log(chalk.gray(`Goal: ${goal}\n`));

  try {
    // 1. Connect to DB for providers/integrations
    await connectDatabase();
    
    // 2. Get Agent
    const agent = AgentRegistry.getAgent(domain);
    
    // 3. Run Agent
    const result = await agent.run(goal, context);
    
    // 4. Output Results
    if (result.success) {
      console.log(chalk.green('\n✅ Task Completed Successfully!'));
      console.log(chalk.white(`\nFinal Answer:\n${result.finalAnswer}`));
    } else {
      console.log(chalk.red('\n❌ Task Failed.'));
      console.log(chalk.yellow(`\nReason: ${result.finalAnswer}`));
    }
    
    // Log history summary if needed
    if (result.history.length > 0) {
      console.log(chalk.gray(`\nTrace: ${result.history.length} steps taken.`));
    }

    // Explicitly exit process to close DB pool
    process.exit(result.success ? 0 : 1);
  } catch (error: any) {
    console.error(chalk.red(`\n💥 Fatal Error: ${error.message}`));
    process.exit(1);
  }
}
