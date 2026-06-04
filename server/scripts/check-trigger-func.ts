import db from '../src/lib/db';

async function run() {
    await db.initDb();
    const res = await db.query(`
        SELECT proname, prosrc 
        FROM pg_proc 
        WHERE proname = 'trigger_update_template_metrics'
    `);
    console.log('Function trigger_update_template_metrics:', JSON.stringify(res.rows, null, 2));
    
    await db.end();
}

run();
