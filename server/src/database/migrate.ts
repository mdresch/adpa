import { spawn } from 'child_process';
import * as path from 'path';

/**
 * Migration Wrapper
 * Calls the unified migration runner
 */
export async function runMigrations(): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log('🚀 Forwarding to unified migration runner...');
    
    const runnerPath = path.resolve(__dirname, '../../scripts/run-migrations.ts');
    const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const child = spawn(npxCmd, ['tsx', runnerPath], {
      stdio: 'inherit',
      shell: false,
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Migration runner exited with code ${code}`));
      }
    });
  });
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
