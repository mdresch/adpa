import db from '../src/lib/db';

async function run() {
    await db.initDb();
    const res = await db.query(`
        SELECT proname, prosrc 
        FROM pg_proc 
        WHERE proname = 'trigger_entity_extraction'
    `);
    console.log('Function trigger_entity_extraction:', JSON.stringify(res.rows, null, 2));
    
    await db.end();
}

run();
