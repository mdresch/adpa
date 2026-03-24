#!/usr/bin/env tsx

/**
 * ADPA Rovo CLI - Strategic Architect Coworker
 */

import { Command } from 'commander';
import { runCoworker } from './coworker-runner';

const program = new Command();

program
  .name('rovo')
  .description('ADPA Rovo: The Strategic Architect')
  .version('2.0.0');

program
  .command('plan <goal>')
  .description('Plan an architectural change or analyze project state')
  .action(async (goal) => {
    await runCoworker('rovo', goal);
  });

program
  .command('sync <goal>')
  .description('Synchronize current state with Jira and Confluence')
  .action(async (goal) => {
    await runCoworker('rovo', goal);
  });

// Handle the case where no command is provided but a goal is passed
const args = process.argv.slice(2);
if (args.length === 1 && !args[0].startsWith('-')) {
  runCoworker('rovo', args[0]);
} else {
  program.parse(process.argv);
}
