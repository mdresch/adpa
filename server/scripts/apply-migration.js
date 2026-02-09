const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function applyMigration() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false } // Required for Supabase
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        const migrationPath = path.join(__dirname, '../supabase/migrations/20250208_drop_ingest_trigger.sql');
        const sqlFile = fs.readFileSync(migrationPath, 'utf8');

        // Ensure search path includes extensions for vector type
        await client.query('SET search_path TO "$user", public, extensions;');
        console.log('Search path set to: "$user", public, extensions');

        // Naive split by semicolon. 
        // Note: This might break if semicolons are inside strings or function bodies.
        // But for our specific migration file, we can try to be smart or just execute the whole block if we trust it.
        // The error 'undefined_column' usually happens during index creation if the table doesn't have the column yet.
        // Running statements sequentially helps isolate WHICH statement fails.

        // Let's try to execute the whole block first with the Search Path set.
        // If that fails, we can assume the previous failure was indeed due to search_path.

        console.log(`Applying migration from ${migrationPath}...`);
        await client.query(sqlFile);
        console.log('Migration applied successfully.');
    } catch (err) {
        console.error('Error applying migration:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

applyMigration();
