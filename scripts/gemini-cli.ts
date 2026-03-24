#!/usr/bin/env tsx

/**
 * ADPA Gemini CLI - Implementation Specialist Coworker
 */

import { Command } from 'commander';
import { runCoworker } from './coworker-runner';

const program = new Command();

program
  .name('gemini-cli')
  .description('ADPA Gemini CLI: The Implementation Specialist')
  .version('2.0.0');

program
  .command('implement <feature-name>')
  .description('Implement a specific feature or bug fix')
  .action(async (featureName) => {
    await runCoworker('gemini', `Implement the feature: ${featureName}`);
  });

program
  .command('automate <task>')
  .description('Run local automation tasks (e.g., cleanup, tests)')
  .action(async (task) => {
    await runCoworker('gemini', `Automate: ${task}`);
  });

// Handle the case where no command is provided but a goal is passed
const args = process.argv.slice(2);
if (args.length === 1 && !args[0].startsWith('-')) {
  runCoworker('gemini', args[0]);
} else {
  program.parse(process.argv);
}
