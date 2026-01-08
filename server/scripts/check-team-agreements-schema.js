require('dotenv').config();
const dbModule = require('../src/lib/db')
const db = dbModule.default || dbModule

async function checkSchema() {
    console.log('🔍 Checking team_agreements table schema...\n');

    try {
                await db.initDb()
                // 1. Check table structure
                const schema = await db.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'team_agreements'
      ORDER BY ordinal_position
    `);

        console.log('[1] Table Columns:');
        console.table(schema.rows);

        // 2. Check constraints
        console.log('\n[2] Table Constraints:');
                const constraints = await db.query(`
      SELECT 
        conname as constraint_name,
        contype as constraint_type,
        pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conrelid = 'team_agreements'::regclass
    `);

        if (constraints.rows.length > 0) {
            console.table(constraints.rows);
        } else {
            console.log('   No custom constraints found\n');
        }

        // 3. Check indexes
        console.log('[3] Table Indexes:');
                const indexes = await db.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'team_agreements'
    `);

        if (indexes.rows.length > 0) {
            console.table(indexes.rows);
        } else {
            console.log('   No indexes found\n');
        }

        // 4. Sample some data to see what's actually in agreed_by
        console.log('\n[4] Sample Data (agreed_by field):');
                const samples = await db.query(`
      SELECT id, title, agreed_by, facilitated_by
      FROM team_agreements
      LIMIT 5
    `);

        if (samples.rows.length > 0) {
            samples.rows.forEach(row => {
                console.log(`\n   Agreement: ${row.title}`);
                console.log(`   agreed_by type: ${typeof row.agreed_by}`);
                console.log(`   agreed_by value:`, row.agreed_by);
                console.log(`   facilitated_by:`, row.facilitated_by);
            });
        } else {
            console.log('   No data in table yet\n');
        }

    } catch (error) {
        console.error('❌ Schema check failed:', error.message);
        console.error(error);
    } finally {
        await db.end();
    }
}

checkSchema();
