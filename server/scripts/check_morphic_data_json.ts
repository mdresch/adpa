import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkData() {
    const pool = new Pool({
        connectionString: process.env.MORPHIC_DATABASE_URL,
        ssl: false
    });

    try {
        const tables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name LIKE 'morphic_%'
        `);
        console.log('Morphic tables:', tables.rows.map(r => r.table_name));

        const schema = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'morphic_messages'
            ORDER BY ordinal_position
        `);
        
        const sampleMessages = await pool.query('SELECT * FROM morphic_messages LIMIT 1');

        const results = {
            schema: schema.rows,
            sampleMessage: sampleMessages.rows[0]
        };

        fs.writeFileSync(path.join(__dirname, 'result.json'), JSON.stringify(results, null, 2));
        console.log('Results written to result.json');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkData();
