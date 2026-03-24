import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkData() {
    const pool = new Pool({
        connectionString: process.env.MORPHIC_DATABASE_URL,
        ssl: false
    });

    try {
        console.log('Connecting to:', process.env.MORPHIC_DATABASE_URL);
        
        const schema = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'morphic_messages'
            ORDER BY ordinal_position
        `);
        console.log('morphic_messages schema:', JSON.stringify(schema.rows, null, 2));

        const chats = await pool.query('SELECT count(*) FROM morphic_chats');
        console.log('Total chats:', chats.rows[0].count);

        const messages = await pool.query('SELECT count(*) FROM morphic_messages');
        console.log('Total messages:', messages.rows[0].count);

        if (chats.rows[0].count > 0) {
            const recentChats = await pool.query('SELECT id, title FROM morphic_chats ORDER BY created_at DESC LIMIT 5');
            console.log('Recent chats:', JSON.stringify(recentChats.rows, null, 2));
            
            for (const chat of recentChats.rows) {
                const msgCount = await pool.query('SELECT count(*) FROM morphic_messages WHERE chat_id = $1', [chat.id]);
                console.log(`Chat ${chat.id} ("${chat.title}") has ${msgCount.rows[0].count} messages`);
            }
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkData();
