#!/usr/bin/env tsx

/**
 * ADPA Codacy CLI Wrapper & Testing Utility
 * 
 * Provides a local interface to run Codacy Static Analysis CLI 
 * either via a local binary installation or through a Docker container.
 */

import { Command } from 'commander';
import { execSync, spawn } from 'child_process';
import chalk from 'chalk';
import { buildArguments, AnalyzeOptions } from '../server/src/modules/codacy/codacyService';

const program = new Command();

/**
 * Check if a command exists in the system PATH
 */
function commandExists(command: string): boolean {
  try {
    const checkCmd = process.platform === 'win32'
      ? `where ${command}`
      : `which ${command}`;
    execSync(checkCmd, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Execute a command and stream stdout/stderr
 */
function executeStream(cmd: string, args: string[]): Promise<number> {
  return new Promise((resolve) => {
    console.log(chalk.gray(`Running: ${cmd} ${args.join(' ')}\n`));
    const proc = spawn(cmd, args, { stdio: 'inherit', shell: true });
    proc.on('close', (code) => {
      resolve(code ?? 0);
    });
  });
}

/**
 * Run Codacy analysis
 */
async function runAnalysis(options: AnalyzeOptions) {
  console.log(chalk.blue('🛡️  ADPA Codacy Analysis CLI wrapper starting...'));
  console.log(chalk.gray(`Workspace Path: ${process.cwd()}`));

  // 1. Determine execution method: Local Binary vs Docker
  let useLocalBinary = false;
  if (!options.docker && commandExists('codacy-analysis-cli')) {
    useLocalBinary = true;
  }

  // 2. Delegate argument building to our shared codacyService
  const { command, args } = buildArguments(options, useLocalBinary);

  if (useLocalBinary) {
    console.log(chalk.green('⚡ Found local codacy-analysis-cli binary. Using local execution.'));
  } else {
    // Check if Docker is available
    if (!commandExists('docker')) {
      console.error(chalk.red('\n❌ Error: Neither "codacy-analysis-cli" binary nor "docker" command could be found in the PATH.'));
      console.log(chalk.yellow('\nTo resolve this:'));
      console.log('  1. Run the Codacy CLI via Docker by installing Docker Desktop: https://www.docker.com/');
      console.log('  2. Or install the Codacy CLI binary locally on your system.');
      process.exit(1);
    }
    console.log(chalk.green('🐳 Codacy binary not found in PATH. Using Docker fallback...'));
  }

  const code = await executeStream(command, args);
  process.exit(code);
}

// CLI Definition
program
  .name('codacy')
  .description('ADPA Codacy CLI wrapper utility')
  .version('1.0.0')
  .option('-f, --file <file>', 'Specify a specific file to analyze')
  .option('-t, --tool <tool>', 'Specify a specific tool to run (e.g. trivy, eslint, checkov)')
  .option('-d, --directory <dir>', 'Specify target directory to analyze')
  .option('--format <format>', 'Output format: text, json', 'text')
  .option('--provider <provider>', 'Provider to send to Codacy')
  .option('--organization <org>', 'Organization name for Codacy')
  .option('--repository <repo>', 'Repository name for Codacy')
  .option('--docker', 'Force running via Docker', false)
  .action((options) => {
    runAnalysis(options);
  });

program.parse(process.argv);
