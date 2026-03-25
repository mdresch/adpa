
const { Pool } = require('pg');

const connectionString = 'postgresql://postgres.blxzjbxczpmmgiwbtmdo:QueIQ4ADPA$@aws-1-us-east-1.pooler.supabase.com:6543/postgres';

async function main() {
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    
    // Simulate a standard user
    const isSuperAdmin = false;
    const userCompanyId = '110050cf-3792-45cd-b222-85f689e3549b'; // Demo User's company
    const userId = 'b1f3d2c4-e5a6-4b7c-8d9e-f0a1b2c3d4e5'; // Demo User
    const filters = { limit: 100, offset: 0 };

    let query = `
      SELECT 
        t.*, 
        u.name as created_by_name,
        c.name as company_name,
        CASE 
          WHEN t.validation_count = 0 THEN 0
          ELSE ROUND((t.success_count::NUMERIC / t.validation_count::NUMERIC * 100), 2)
        END as success_rate,
        CASE
          WHEN t.validation_count = 0 THEN 'Not tested yet'
          WHEN (t.success_count::NUMERIC / NULLIF(t.validation_count, 0)) >= 0.90 THEN 'Excellent'
          WHEN (t.success_count::NUMERIC / NULLIF(t.validation_count, 0)) >= 0.75 THEN 'Good'
          WHEN (t.success_count::NUMERIC / NULLIF(t.validation_count, 0)) >= 0.50 THEN 'Fair'
          ELSE 'Needs Improvement'
        END as health_rating,
        tep.avg_entity_counts,
        tep.knowledge_domain_coverage,
        tep.performance_domain_coverage,
        tep.primary_knowledge_domain,
        tep.secondary_knowledge_domains,
        tep.primary_performance_domain
      FROM templates t
      LEFT JOIN users u ON t.created_by = u.id
      LEFT JOIN companies c ON t.company_id = c.id
      LEFT JOIN template_entity_profile tep ON tep.template_id = t.id
      WHERE t.deleted_at IS NULL
        AND (t.development_status IS NULL OR t.development_status != 'archived')
    `;

    const params = [];
    let paramCount = 0;

    if (!isSuperAdmin) {
      query += ` AND (
          t.template_scope = 'standard'
          OR
          (t.template_scope = 'company' AND t.company_id = $${paramCount + 1})
          OR
          (t.template_scope = 'user' AND (t.is_public = true OR t.created_by = $${paramCount + 2}))
        )`;
      params.push(userCompanyId, userId);
      paramCount = 2;
    }

    query += ` ORDER BY 
      CASE t.template_scope 
        WHEN 'standard' THEN 1 
        WHEN 'company' THEN 2 
        WHEN 'user' THEN 3 
      END,
      t.usage_count DESC, 
      t.created_at DESC 
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    
    params.push(filters.limit, filters.offset);

    console.log('Running query...');
    console.log('Params:', params);
    
    const result = await client.query(query, params);
    console.log(`Found ${result.rows.length} rows.`);
    
    if (result.rows.length > 0) {
        console.log('First template:', result.rows[0].name, 'Scope:', result.rows[0].template_scope);
    }

    client.release();
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

main();
