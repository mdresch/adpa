import db from '../src/lib/db';

async function run() {
    await db.initDb();
    const res = await db.query(`
        SELECT trigger_name, event_manipulation, event_object_table, action_statement 
        FROM information_schema.triggers
    `);
    console.log('All Triggers:', JSON.stringify(res.rows, null, 2));
    
    await db.end();
}

run();
