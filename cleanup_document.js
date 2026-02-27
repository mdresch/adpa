const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres.blxzjbxczpmmgiwbtmdo:QueIQ4ADPA$@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
    ssl: {
        rejectUnauthorized: false
    }
});

const cleanMarkdown = (content) => {
    if (!content || typeof content !== 'string') return content;
    let cleaned = content.trim();

    // Remove common code block wrappers added by AI (e.g., ```markdown ... ```)
    const codeBlockRegex = /^```(?:markdown|md)?\n([\s\S]*?)\n```$/i;
    const match = cleaned.match(codeBlockRegex);
    if (match) {
        cleaned = match[1].trim();
    }

    // Remove any non-Markdown wrapper text if AI added explanations at the start
    const mdHeadingStart = cleaned.indexOf("#");
    if (mdHeadingStart > 0 && mdHeadingStart < 100) {
        const lead = cleaned.substring(0, mdHeadingStart).trim();
        if (lead.length < 50) {
            cleaned = cleaned.substring(mdHeadingStart);
        }
    }

    return cleaned;
};

async function cleanupDocument() {
    const docId = 'fc32f461-1817-4710-bbee-e24ddb9a7793';
    try {
        const res = await pool.query('SELECT content FROM documents WHERE id = $1', [docId]);
        if (res.rows.length === 0) {
            console.log('Document not found');
            return;
        }

        const rawContent = res.rows[0].content;
        const cleanedContent = cleanMarkdown(rawContent);

        if (rawContent !== cleanedContent) {
            await pool.query('UPDATE documents SET content = $1 WHERE id = $2', [cleanedContent, docId]);
            console.log('Document cleaned successfully');
        } else {
            console.log('Document was already clean or does not match cleaning pattern');
        }
    } catch (err) {
        console.error('Error during cleanup:', err);
    } finally {
        await pool.end();
    }
}

cleanupDocument();
