/**
 * Seed Baseline Tables with Realistic Data
 * Tests that baseline_components, baseline_drift_detection, and baseline_compliance_reviews work
 */

import { Pool } from 'pg'
import dotenv from 'dotenv'
import path from 'path'

// Load environment from server/.env
dotenv.config({ path: path.join(__dirname, '../.env') })

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' || process.env.DATABASE_URL?.includes('supabase')
    ? { rejectUnauthorized: true }
    : false
})

async function seedBaselineData() {
  console.log('🌱 Starting baseline data seeding...\n')

  try {
    // 1. Get existing baselines
    const baselines = await pool.query(
      `SELECT id, project_id, version, created_by FROM project_baselines ORDER BY created_at DESC LIMIT 3`
    )

    if (baselines.rows.length === 0) {
      console.log('❌ No baselines found. Create a baseline first!')
      return
    }

    console.log(`✅ Found ${baselines.rows.length} baselines to seed\n`)

    for (const baseline of baselines.rows) {
      console.log(`📦 Seeding data for Baseline ${baseline.version}...`)

      // 2. Seed baseline_components (detailed breakdown)
      const components = [
        // Scope components
        {
          type: 'scope_deliverable',
          title: 'Core Platform Development',
          description: 'Modular, API-driven platform capable of ingesting various document formats',
          priority: 'high'
        },
        {
          type: 'scope_deliverable',
          title: 'AI/ML Model Development',
          description: 'Training and deployment for document classification and data extraction',
          priority: 'high'
        },
        {
          type: 'scope_boundary',
          title: 'Out of Scope: Legacy System Migration',
          description: 'Direct integration with legacy DocuStore V3 is excluded from this phase',
          priority: 'medium'
        },
        // Tech components
        {
          type: 'tech_stack',
          title: 'Node.js Backend',
          description: 'TypeScript-based Express.js backend with PostgreSQL',
          priority: 'critical'
        },
        {
          type: 'tech_stack',
          title: 'Next.js Frontend',
          description: 'React 18 with Tailwind CSS and Radix UI components',
          priority: 'critical'
        },
        {
          type: 'tech_requirement',
          title: 'API Response Time < 200ms',
          description: 'P95 latency must be under 200ms for all API endpoints',
          priority: 'high'
        },
        // Timeline components
        {
          type: 'timeline_milestone',
          title: 'Phase 1 Complete',
          description: 'All foundation and planning deliverables completed',
          priority: 'critical'
        },
        {
          type: 'timeline_dependency',
          title: 'Database schema required before API development',
          description: 'Critical path dependency - schema must be finalized',
          priority: 'critical'
        },
        // Success criteria
        {
          type: 'success_kpi',
          title: 'Cost Performance Index (CPI) ≥ 0.95',
          description: 'Earned value metric for cost performance',
          priority: 'high'
        },
        {
          type: 'success_criteria',
          title: 'UAT Satisfaction Score ≥ 8/10',
          description: 'User acceptance testing satisfaction requirement',
          priority: 'high'
        }
      ]

      for (const component of components) {
        await pool.query(
          `INSERT INTO baseline_components (
            baseline_id, component_type, title, description, priority, confidence_score
          ) VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (baseline_id, component_type, title) DO NOTHING`,
          [baseline.id, component.type, component.title, component.description, component.priority, 0.85]
        )
      }

      console.log(`  ✅ Added ${components.length} baseline components`)

      // 3. Seed baseline_compliance_reviews
      try {
        await pool.query(
          `INSERT INTO baseline_compliance_reviews (
            baseline_id,
            review_type,
            framework_standard,
            compliance_status,
            overall_compliance_score,
            reviewed_by,
            review_notes,
            recommendations
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (baseline_id, review_type) DO NOTHING`,
          [
            baseline.id,
            'pmbok_compliance',
            'PMBOK 7th Edition',
            'compliant_with_minor_gaps',
            0.92,
            baseline.created_by,
            'Baseline follows PMBOK 7 principles with strong scope and schedule baselines. Minor gap: Resource baseline needs more detail on capacity planning.',
            JSON.stringify([
              'Add resource histogram to resource baseline',
              'Document critical path with float/slack analysis',
              'Include parametric cost estimates for bottom-up validation'
            ])
          ]
        )
        console.log(`  ✅ Added PMBOK compliance review`)
      } catch (err) {
        console.error(`  ✗ Failed to add compliance review:`, err.message)
      }

      // 4. Seed baseline_drift_detection (sample drift)
      const drifts = [
        {
          type: 'scope_drift',
          severity: 'medium',
          description: 'AI-detected scope addition: Advanced analytics dashboard mentioned in recent stakeholder meeting notes',
          impact: 'May require 2-3 week timeline extension and additional resources'
        },
        {
          type: 'technical_drift',
          severity: 'low',
          description: 'Technology stack deviation: Team exploring GraphQL instead of REST for analytics API',
          impact: 'Minor architectural change, no significant timeline impact if decided quickly'
        },
        {
          type: 'timeline_drift',
          severity: 'critical',
          description: 'Critical milestone "Phase 1 Complete" missed by 5 days due to infrastructure delays',
          impact: 'Cascading delay to downstream activities on critical path'
        }
      ]

      for (const drift of drifts) {
        try {
          await pool.query(
            `INSERT INTO baseline_drift_detection (
              baseline_id,
              project_id,
              detection_type,
              drift_severity,
              drift_description,
              drift_impact,
              detected_by,
              ai_confidence,
              status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              baseline.id,
              baseline.project_id,
              drift.type,
              drift.severity,
              drift.description,
              drift.impact,
              'ai',
              0.87,
              'detected'
            ]
          )
          console.log(`    ✓ Added drift: ${drift.type} (${drift.severity})`)
        } catch (err) {
          console.error(`    ✗ Failed to add drift ${drift.type}:`, err.message)
        }
      }

      console.log(`  ✅ Added ${drifts.length} drift detections\n`)
    }

    // 5. Verify seeded data
    console.log('📊 Verification:\n')

    const componentCount = await pool.query(
      'SELECT COUNT(*) as count FROM baseline_components'
    )
    console.log(`  baseline_components: ${componentCount.rows[0].count} rows`)

    const driftCount = await pool.query(
      'SELECT COUNT(*) as count FROM baseline_drift_detection'
    )
    console.log(`  baseline_drift_detection: ${driftCount.rows[0].count} rows`)

    const complianceCount = await pool.query(
      'SELECT COUNT(*) as count FROM baseline_compliance_reviews'
    )
    console.log(`  baseline_compliance_reviews: ${complianceCount.rows[0].count} rows\n`)

    console.log('✅ Baseline data seeding complete!')
    console.log('\n🔍 Next steps:')
    console.log('1. Refresh project page to see drift alerts')
    console.log('2. Check baseline details dialog for component breakdown')
    console.log('3. Review compliance review in baseline approval workflow')

  } catch (error) {
    console.error('❌ Error seeding data:', error)
    throw error
  } finally {
    await pool.end()
  }
}

seedBaselineData()

