import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverDir = path.resolve(__dirname, '..');

const LOCAL_DEV_DB_URL = 'postgresql://myuser:mypassword@localhost:5432/adpa';

console.log('[MIGRATE-LOCAL] Running migrations against local dev database (localhost:5432)...');
const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
execSync(`"${npxCmd}" tsx scripts/run-migrations.ts --reset`, {
  cwd: serverDir,
  env: {
    ...process.env,
    DATABASE_URL: LOCAL_DEV_DB_URL,
    NODE_ENV: 'development'
  },
  stdio: 'inherit'
});
console.log('[MIGRATE-LOCAL] Migrations completed successfully.');
