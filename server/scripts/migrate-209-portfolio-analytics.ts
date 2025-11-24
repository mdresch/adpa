// scripts/migrate-209-portfolio-analytics.ts
// Script to run the 209_create_portfolio_analytics_tables.sql migration using Node.js

import { execSync } from 'child_process';
import path from 'path';

const migrationFile = path.join(__dirname, '../migrations/209_create_portfolio_analytics_tables.sql');

function run() {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable not set.');
    }
    // Use psql to run the migration file
    execSync(`psql "$DATABASE_URL" -f "${migrationFile}"`, { stdio: 'inherit', env: process.env });
    console.log('Portfolio analytics migration 209 applied successfully.');
  } catch (err) {
    console.error('Portfolio analytics migration 209 failed:', err);
    process.exit(1);
  }
}

run();
