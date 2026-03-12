const { pool, connectDatabase } = require('./database/connection');
const path = require('path');
const dotenv = require('dotenv');

// Load .env explicitly
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

// Manually set DATABASE_URL if it's missing
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://postgres.blxzjbxczpmmgiwbtmdo:QueIQ4ADPA$@aws-1-us-east-1.pooler.supabase.com:6543/postgres";
}

async function fixPineconeIntegration() {
  try {
    console.log('Connecting to database...');
    await connectDatabase();
    
    // Find the Pinecone integration
    const result = await pool.query("SELECT id, configuration FROM integrations WHERE type = 'pinecone'");
    
    if (result.rows.length === 0) {
      console.log('No Pinecone integration found to fix.');
      return;
    }

    for (const row of result.rows) {
      const config = typeof row.configuration === 'string' ? JSON.parse(row.configuration) : row.configuration;
      console.log(`Current configuration for ${row.id}:`, config);

      // Update the indexName to the new one
      const newConfig = {
        ...config,
        indexName: 'adpa-rag-index',
        index_name: 'adpa-rag-index' // just in case both are used
      };

      await pool.query(
        "UPDATE integrations SET configuration = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [JSON.stringify(newConfig), row.id]
      );
      
      console.log(`Updated configuration for ${row.id} to use adpa-rag-index`);
    }

    await pool.end();
    console.log('Done.');
  } catch (error) {
    console.error('Error fixing integration:', error);
  }
}

fixPineconeIntegration();
