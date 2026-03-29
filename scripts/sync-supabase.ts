
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// --- CONFIGURATION ---
const SUPABASE_URL = "postgresql://postgres.blxzjbxczpmmgiwbtmdo:QueIQ4ADPA$@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require";
const LOCAL_URL = "postgresql://myuser:mypassword@localhost:5432/adpa?sslmode=disable";

// Tables to sync
const TABLES_TO_SYNC = [
  'users',
  'projects',
  'documents',
  'templates',
  'ai_models',
  'ai_providers',
  'companies',
  'integrations'
];

const STATE_FILE = path.join(process.cwd(), 'scripts', 'sync_state.json');

async function sync() {
  console.log('🚀 Starting Delta Sync from Supabase to Local Docker...');

  // 1. Load State
  let lastSyncAt = '1970-01-01T00:00:00Z';
  if (fs.existsSync(STATE_FILE)) {
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    lastSyncAt = state.lastSyncAt;
    console.log(`📅 Last sync was at: ${lastSyncAt}`);
  } else {
    console.log('📅 No previous sync state found. Doing a full initial delta.');
  }

  const prodPool = new Pool({ 
    connectionString: SUPABASE_URL, 
    ssl: { rejectUnauthorized: false } 
  });
  const localPool = new Pool({ 
    connectionString: LOCAL_URL,
    ssl: false
  });

  try {
    const currentSyncStartTime = new Date().toISOString();

    for (const table of TABLES_TO_SYNC) {
      console.log(`\n--- Table: ${table} ---`);
      
      // 1. Fetch changed rows from Production
      const changedRows = await prodPool.query(
        `SELECT * FROM public.${table} WHERE updated_at > $1 ORDER BY updated_at ASC`,
        [lastSyncAt]
      );

      console.log(`📦 Found ${changedRows.rows.length} changed rows.`);

      if (changedRows.rows.length === 0) continue;

      // 2. Upsert into Local
      for (const row of changedRows.rows) {
        const columns = Object.keys(row);
        // Handle JSON serialization for objects and handle nulls/empty
        const values = Object.values(row).map(val => {
          if (val === null || val === undefined) return null;
          if (typeof val === 'object') return JSON.stringify(val);
          return val;
        });
        
        // Build the UPSERT query dynamically
        const colList = columns.join(', ');
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const updateList = columns
          .filter(c => c !== 'id')
          .map((c, i) => `${c} = EXCLUDED.${c}`)
          .join(', ');

        const upsertQuery = `
          INSERT INTO public.${table} (${colList})
          VALUES (${placeholders})
          ON CONFLICT (id) DO UPDATE SET
          ${updateList}
        `;

        try {
          await localPool.query(upsertQuery, values);
        } catch (err: any) {
          console.error(`❌ Error syncing row in ${table} (ID: ${row.id}):`, err.message);
        }
      }
      console.log(`✅ Table ${table} synced.`);
    }

    // 3. Save State
    fs.writeFileSync(STATE_FILE, JSON.stringify({ lastSyncAt: currentSyncStartTime }, null, 2));
    console.log(`\n✨ Sync completed successfully at ${currentSyncStartTime}`);

  } catch (error: any) {
    console.error('💥 Sync failed:', error.message);
  } finally {
    await prodPool.end();
    await localPool.end();
  }
}

sync();
