import db from '../src/lib/db';

async function run() {
    await db.initDb();
    const res = await db.query(`
        SELECT trigger_name, event_manipulation, event_object_table, action_statement 
        FROM information_schema.triggers 
        WHERE action_statement ILIKE '%template_metrics%'
           OR action_statement ILIKE '%template_validation%'
    `);
    console.log('Triggers:', JSON.stringify(res.rows, null, 2));

    const res2 = await db.query(`
        SELECT proname, prosrc 
        FROM pg_proc 
        WHERE prosrc ILIKE '%validation_count%'
    `);
    console.log('Functions:', JSON.stringify(res2.rows, null, 2));
    
    await db.end();
}

run();
