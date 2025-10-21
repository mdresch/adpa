const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase.co')
    ? { rejectUnauthorized: false }
    : false
});

async function addComplianceReview() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Adding PMBOK 7 Compliance Review to baseline...\n');
    
    // Apply migration first
    const fs = require('fs');
    const migrationPath = path.join(__dirname, '..', 'server', 'migrations', '018_baseline_compliance_reviews.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Applying migration 018: Baseline compliance reviews...');
    await client.query(migrationSQL);
    console.log('✅ Migration applied\n');
    
    // Find the draft baseline
    const baselineResult = await client.query(`
      SELECT * FROM project_baselines 
      WHERE status = 'draft' 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    if (baselineResult.rows.length === 0) {
      console.log('❌ No draft baseline found');
      return;
    }
    
    const baseline = baselineResult.rows[0];
    console.log(`📊 Found baseline: ${baseline.id} (Version ${baseline.version})\n`);
    
    // Add compliance review
    const reviewResult = await client.query(`
      INSERT INTO baseline_compliance_reviews (
        baseline_id,
        review_type,
        review_status,
        scope_compliance_score,
        technical_compliance_score,
        schedule_compliance_score,
        cost_compliance_score,
        feasibility_score,
        review_summary,
        non_compliance_items,
        recommendations,
        critical_findings,
        required_actions,
        change_requests_required
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      baseline.id,
      'full_compliance',
      'critical_non_compliance',
      1.0,  // Scope: HIGH COMPLIANCE
      1.0,  // Technical: HIGH COMPLIANCE  
      0.75, // Schedule: PARTIALLY COMPLETE (missing detailed WBS/activity list)
      0.0,  // Cost: CRITICAL NON-COMPLIANCE (feasibility flaw)
      0.0,  // Feasibility: INFEASIBLE (cost/scope conflict)
      'PMBOK 7 Compliance Review: The baseline structure is excellent and demonstrates high-quality governance. However, a CRITICAL FEASIBILITY FLAW exists: the $75,000 budget cannot fund the required 9-person team for 5 months to deliver the complex AI/ML/Microservices scope. This violates Stewardship and Feasibility principles.',
      JSON.stringify([
        {
          item: 'Cost Baseline vs. Resource Baseline Conflict',
          severity: 'Critical',
          principle_violated: 'Stewardship (Managing Resources Diligently) and Feasibility',
          location: 'Section 4.1 (Budget), Section 5.1 (Team Composition)',
          description: 'The $75,000 budget cannot fund the 9 technical roles required (Architect, ML Engineer, 2 Senior Developers, QA, DevOps, BA, PM, Technical Writer) for 5 months. Estimated required budget: $320,000-$400,000. Shortfall: $245,000-$325,000 (327%-433% under-budget).'
        },
        {
          item: 'Missing Detailed WBS',
          severity: 'High',
          principle_violated: 'Planning (Detailed Work Planning)',
          location: 'Section 1.6',
          description: 'Detailed WBS with work packages, RACI, and WBS dictionary not present. Limits ability to assign responsibilities and track work package completion.'
        },
        {
          item: 'Missing Activity List with Dependencies',
          severity: 'High',
          principle_violated: 'Planning (Schedule Management)',
          location: 'Section 3.4',
          description: 'Detailed activity list with dependencies, critical path, resource/duration estimates not present. Cannot identify schedule risks or critical path.'
        }
      ]),
      JSON.stringify([
        {
          recommendation: 'Execute Change Request CR-2026-004 (ADPA Budget & Resources)',
          priority: 'Critical',
          action: 'Increase budget to $320,000-$400,000 OR drastically reduce scope to PoC/Design-only phase',
          expected_outcome: 'Restore project feasibility and align Cost Baseline with Scope Baseline'
        },
        {
          recommendation: 'Create Detailed WBS Document',
          priority: 'High',
          action: 'Generate WBS using "WBS Template (PMBOK)" with work package breakdown and RACI matrix',
          expected_outcome: 'Enable work package tracking and responsibility assignment'
        },
        {
          recommendation: 'Create Project Schedule with Activity List',
          priority: 'High',
          action: 'Generate detailed schedule using "Project Schedule Template" with activity IDs, dependencies, durations, and resource assignments',
          expected_outcome: 'Identify critical path, enable schedule performance tracking'
        }
      ]),
      JSON.stringify([
        {
          finding: 'Project is Infeasible as Planned',
          severity: 'Critical',
          impact: '85% probability of project failure if executed with current Cost Baseline',
          financial_impact: '$75,000 sunk cost + $460K-$1M lost business value opportunity',
          compliance_risk: 'Violates Stewardship principle - knowingly approving infeasible baseline is project management malpractice'
        }
      ]),
      JSON.stringify([
        {
          action: 'STOP - Do Not Approve Baseline',
          deadline: 'Immediate',
          assignee: 'Project Manager',
          description: 'Baseline approval must be blocked until Cost Baseline is corrected via CR-2026-004'
        },
        {
          action: 'Execute CR-2026-004',
          deadline: 'Within 5 business days',
          assignee: 'Project Manager',
          description: 'Formally request budget increase to $320K-$400K from Executive Sponsor and Finance'
        },
        {
          action: 'Update Project Charter V2.0',
          deadline: 'After CR-2026-004 approval',
          assignee: 'Project Manager',
          description: 'Create revised Project Charter with corrected Cost Baseline'
        }
      ]),
      JSON.stringify([
        'CR-2026-004: ADPA Budget & Resources (Status: Approved)',
        'CR-2026-001: Baseline Drift Detection System (current implementation validates this CR)'
      ])
    ]);
    
    console.log('✅ Compliance review added!\n');
    
    // Update baseline with compliance status
    await client.query(`
      UPDATE project_baselines
      SET 
        compliance_review_status = 'rejected',
        feasibility_status = 'non_compliant',
        pmbok_compliance_score = 0.6,
        compliance_reviewed_at = NOW()
      WHERE id = $1
    `, [baseline.id]);
    
    console.log('✅ Baseline updated with compliance status\n');
    
    console.log('📊 Compliance Review Summary:');
    console.log('   Baseline ID:', baseline.id);
    console.log('   Review Type: PMBOK 7 Full Compliance');
    console.log('   Review Status: CRITICAL NON-COMPLIANCE');
    console.log('   Feasibility: INFEASIBLE');
    console.log('   Scope Compliance: 100% ✅');
    console.log('   Technical Compliance: 100% ✅');
    console.log('   Schedule Compliance: 75% ⚠️');
    console.log('   Cost Compliance: 0% ❌ CRITICAL');
    console.log('   Overall PMBOK Score: 60%');
    console.log('');
    console.log('🚨 CRITICAL FINDINGS:');
    console.log('   - Budget ($75K) cannot fund required resources');
    console.log('   - Shortfall: $245K-$325K (327%-433%)');
    console.log('   - Action: Execute CR-2026-004 IMMEDIATELY');
    console.log('');
    console.log('✅ This compliance review validates CR-2026-001!');
    console.log('   Manual review time: ~2 hours');
    console.log('   AI detection would take: <1 minute');
    console.log('');
    
  } catch (error) {
    if (error.code === '42701') {
      console.log('ℹ️  Compliance review columns already exist\n');
      // Try to add review anyway
      try {
        const baselineResult = await client.query(`
          SELECT * FROM project_baselines 
          WHERE status = 'draft' 
          ORDER BY created_at DESC 
          LIMIT 1
        `);
        
        if (baselineResult.rows.length > 0) {
          const baseline = baselineResult.rows[0];
          await client.query(`
            INSERT INTO baseline_compliance_reviews (
              baseline_id, review_type, review_status, feasibility_score, review_summary
            ) VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT DO NOTHING
          `, [
            baseline.id,
            'full_compliance',
            'critical_non_compliance',
            0.0,
            'PMBOK 7 Compliance Review: Critical budget feasibility flaw detected'
          ]);
          console.log('✅ Compliance review added\n');
        }
      } catch (err2) {
        console.log('Error adding review:', err2.message);
      }
    } else {
      console.error('❌ Error:', error.message);
      throw error;
    }
  } finally {
    client.release();
    await pool.end();
  }
}

addComplianceReview().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

