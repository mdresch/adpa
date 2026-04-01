
const { Pool } = require('pg');

const connectionString = 'postgresql://postgres.blxzjbxczpmmgiwbtmdo:QueIQ4ADPA$@aws-1-us-east-1.pooler.supabase.com:6543/postgres';

async function main() {
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const templateId = '6c7ec59f-084b-4c55-8629-3e889ece985d';
    console.log(`Checking template ${templateId} with all related tables...`);
    
    // Test the exact query from TemplateRepository.findById
    const query = `
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
      WHERE t.id = $1 
        AND t.deleted_at IS NULL
    `;

    try {
        const result = await pool.query(query, [templateId]);
        console.log('✅ Query SUCCESSFUL');
        if (result.rows.length > 0) {
            console.log('Template data found:', JSON.stringify(result.rows[0], null, 2));
        } else {
            console.log('No template data found (but query succeeded)');
        }
    } catch (err) {
        console.log('❌ Query FAILED:', err.message);
        
        // Let's debug which part failed
        console.log('\n--- Debugging schema ---');
        
        const tables = ['templates', 'users', 'companies', 'template_entity_profile'];
        for (const table of tables) {
            try {
                const res = await pool.query(`SELECT 1 FROM information_schema.tables WHERE table_name = $1`, [table]);
                console.log(`Table ${table}: ${res.rows.length > 0 ? 'EXISTS' : 'MISSING'}`);
            } catch (e) {
                console.log(`Table ${table} check FAILED:`, e.message);
            }
        }
        
        // Check template_entity_profile columns
        try {
            const res = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'template_entity_profile'`);
            console.log('template_entity_profile columns:', res.rows.map(r => r.column_name).join(', '));
        } catch (e) {
            console.log('template_entity_profile columns check FAILED:', e.message);
        }
    }

  } catch (err) {
    console.error('Fatal Error:', err);
  } finally {
    await pool.end();
  }
}

main();
