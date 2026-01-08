const db = require('../src/lib/db');
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

// Bypass SSL certificate validation for cloud databases
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function createProject() {
  try {
    // Get admin user
    const userResult = await db.query(`
      SELECT id, email FROM users WHERE role = 'admin' LIMIT 1
    `);
    
    if (userResult.rows.length === 0) {
      console.log('❌ No admin user found');
      process.exit(1);
    }
    
    const adminUser = userResult.rows[0];
    const projectId = uuidv4();
    
    // Create project
    const result = await db.query(`
      INSERT INTO projects (
        id,
        name,
        description,
        framework,
        status,
        priority,
        created_by,
        owner_id,
        start_date,
        end_date,
        budget,
        metadata
      ) VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        $12
      )
      RETURNING *
    `, [
      projectId,
      'Project UniCorn COAS',
      'AI-powered platform for assessing client PM documentation maturity against PMBOK/BABOK/DMBOK standards. Strategic initiative to transform ADPA into industry-leading maturity assessment platform with $500M TAM expansion opportunity.',
      'BABOK v3',
      'active',
      'high',
      adminUser.id,
      adminUser.id,
      new Date(), // Start today
      new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months (180 days)
      1200000, // $1.2M budget from Business Case
      JSON.stringify({
        initiative_type: 'strategic_product',
        market_opportunity: '$500M TAM',
        expected_roi: '312.5%',
        npv: '$2.85M',
        payback_period: '15 months',
        phases: ['Phase 1: Document Upload', 'Phase 2: Assessment Engine', 'Phase 3: Dashboard UI', 'Phase 4: Production'],
        success_metrics: {
          adoption_rate: '60%',
          conversion_rate: '45%+',
          processing_time: '<30s per document',
          nps_score: '9.0+'
        }
      })
    ]);
    
    const project = result.rows[0];
    
    console.log('\n🦄 PROJECT CREATED SUCCESSFULLY!\n');
    console.log('═'.repeat(60));
    console.log(`Project Name:   ${project.name}`);
    console.log(`Project ID:     ${project.id}`);
    console.log(`Framework:      ${project.framework}`);
    console.log(`Status:         ${project.status}`);
    console.log(`Priority:       ${project.priority}`);
    console.log(`Budget:         $${project.budget.toLocaleString()}`);
    console.log(`Timeline:       ${new Date(project.start_date).toLocaleDateString()} - ${new Date(project.end_date).toLocaleDateString()}`);
    console.log(`Owner:          ${adminUser.email}`);
    console.log('═'.repeat(60));
    
    console.log('\n🌐 Access Project:\n');
    console.log(`http://localhost:3000/projects/${projectId}`);
    console.log('\n📋 Next Steps:\n');
    console.log('1. Upload strategic documents:');
    console.log('   - CLIENT_ONBOARDING_INITIATIVE.md');
    console.log('   - CLIENT_ONBOARDING_ASSESSMENT.md');
    console.log('   - IDEATION_CLIENT_ONBOARDING_ASSESSMENT.md');
    console.log('2. Generate Project Charter from Business Case');
    console.log('3. Extract entities (stakeholders, requirements, risks)');
    console.log('4. Create baseline');
    console.log('5. Start Phase 1 implementation!\n');
    
    try { await db.end() } catch (e) {}
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

createProject();

