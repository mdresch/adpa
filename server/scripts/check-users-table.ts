import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    try {
        const res = await pool.query("SELECT * FROM risk_escalation_policies LIMIT 1");
        console.log('Risk escalation policies sample:', res.rows[0]);

        const resCols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'risk_escalation_policies'");
        console.log('Columns in risk_escalation_policies:', resCols.rows.map(r => r.column_name));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
