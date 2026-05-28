import 'dotenv/config';
import { pool, connectDatabase } from '../src/database/connection';

async function getSections() {
  try {
    await connectDatabase();
    const result = await pool.query(
      `SELECT content FROM documents ORDER BY created_at DESC LIMIT 1`
    );

    if (result.rows.length === 0) {
      console.log("No documents found.");
      return;
    }

    const content = result.rows[0].content;
    const lines = content.split('\n');
    console.log("MARKDOWN HEADINGS:");
    for (const line of lines) {
      if (line.startsWith('#')) {
        console.log(line);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

getSections();
