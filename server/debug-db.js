const { pool } = require('./src/database/connection');

(async () => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_entries,
        SUM(CASE WHEN embedding IS NOT NULL THEN 1 ELSE 0 END) as with_embeddings,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', id,
            'title', title,
            'has_embedding', embedding IS NOT NULL,
            'embedding_dim', CASE WHEN embedding IS NOT NULL THEN array_length(embedding::text[]::numeric[], 1) ELSE NULL END
          )
          ORDER BY created_at DESC
          LIMIT 3
        ) as sample_entries
      FROM knowledge_base_entries
    `);

    console.log('Database Check Results:');
    console.log(JSON.stringify(result.rows[0], null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
