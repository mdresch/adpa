#!/usr/bin/env ts-node
/**
 * Create Test Baseline Script
 * TASK-716: Create baseline for drift resolution testing
 * 
 * This script creates a test baseline with comprehensive entity data
 * to enable manual testing of the Automatic Drift Detection & Resolution feature.
 * 
 * Usage:
 *   npm run create-test-baseline <projectId>
 *   npm run create-test-baseline <projectId> --with-entities
 * 
 * Features:
 * - Creates a comprehensive baseline with all 13 entity types
 * - Optionally creates extracted entities first (if --with-entities flag is used)
 * - Approves the baseline automatically for immediate testing
 * - Provides detailed output for verification
 */

import { pool } from '../src/database/connection'
import { logger } from '../src/utils/logger'
import { v4 as uuidv4 } from 'uuid'

interface CreateBaselineOptions {
  projectId: string
  userId?: string
  withEntities?: boolean
  autoApprove?: boolean
}

/**
 * Create comprehensive test baseline with all entity types
 */
async function createTestBaseline(options: CreateBaselineOptions): Promise<void> {
  const { projectId, userId, withEntities = false, autoApprove = true } = options
  const client = await pool.connect()

  try {
    logger.info(`Creating test baseline for project ${projectId}...`)

    // Verify project exists
    const projectResult = await client.query(
      'SELECT id, name FROM projects WHERE id = $1',
      [projectId]
    )

    if (projectResult.rows.length === 0) {
      throw new Error(`Project not found: ${projectId}`)
    }

    const project = projectResult.rows[0]
    logger.info(`Found project: ${project.name}`)

    // Get user ID (use first admin user if not specified)
    let baselineUserId = userId
    if (!baselineUserId) {
      const userResult = await client.query(
        "SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1"
      )
      if (userResult.rows.length === 0) {
        throw new Error('No admin user found. Please create a user first.')
      }
      baselineUserId = userResult.rows[0].id
    }

    // If withEntities flag is set, create test entities first
    if (withEntities) {
      logger.info('Creating test entities for baseline extraction...')
      await createTestEntities(client, projectId, baselineUserId)
    }

    // Create comprehensive baseline data
    const baselineData = createComprehensiveBaselineData(project.name)

    // Get next version number (with error handling for invalid version formats)
    const versionResult = await client.query(
      `SELECT COALESCE(
         MAX(
           CASE 
             WHEN version ~ '^[0-9]+\\.[0-9]+$' 
             THEN CAST(SPLIT_PART(version, '.', 1) AS INTEGER)
             ELSE 0
           END
         ), 0
       ) + 1 as next_major
       FROM project_baselines 
       WHERE project_id = $1`,
      [projectId]
    )

    const version = `${versionResult.rows[0].next_major}.0`

    // Insert baseline
    const baselineResult = await client.query(
      `INSERT INTO project_baselines (
        id,
        project_id,
        version,
        status,
        created_by,
        document_corpus,
        scope_baseline,
        technical_baseline,
        timeline_baseline,
        cost_baseline,
        resource_baseline,
        success_criteria,
        ai_processing_metadata,
        extraction_confidence,
        completeness_score,
        consistency_score,
        clarity_score,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
      [
        uuidv4(),
        projectId,
        version,
        'draft',
        baselineUserId,
        JSON.stringify([]), // No specific documents for test baseline
        JSON.stringify(baselineData.scope_baseline),
        JSON.stringify(baselineData.technical_baseline),
        JSON.stringify(baselineData.timeline_baseline),
        JSON.stringify(baselineData.cost_baseline),
        JSON.stringify(baselineData.resource_baseline),
        JSON.stringify(baselineData.success_criteria),
        JSON.stringify(baselineData.ai_processing_metadata),
        0.95, // High extraction confidence
        0.90, // High completeness
        0.88, // High consistency
        0.92, // High clarity
        'Test baseline created for TASK-716: Drift Resolution Testing'
      ]
    )

    const baseline = baselineResult.rows[0]
    logger.info(`✅ Baseline created: ${baseline.id} (version ${version})`)

    // Create baseline components for detailed tracking
    await createBaselineComponents(client, baseline.id, baselineData)

    // Log version creation
    await client.query(
      `INSERT INTO baseline_versions (
        baseline_id,
        version_number,
        change_type,
        change_description,
        changed_by
      ) VALUES ($1, $2, $3, $4, $5)`,
      [baseline.id, version, 'created', 'Test baseline created for drift resolution testing', baselineUserId]
    )

    // Auto-approve if requested
    if (autoApprove) {
      logger.info('Auto-approving baseline...')
      
      // Deactivate any existing active baselines
      await client.query(
        `UPDATE project_baselines 
         SET status = 'superseded' 
         WHERE project_id = $1 AND status = 'active'`,
        [projectId]
      )

      // Approve and activate the new baseline
      await client.query(
        `UPDATE project_baselines 
         SET status = 'approved', approved_by = $1, approved_at = NOW()
         WHERE id = $2`,
        [baselineUserId, baseline.id]
      )

      // Log approval
      await client.query(
        `INSERT INTO baseline_versions (
          baseline_id,
          version_number,
          change_type,
          change_description,
          changed_by
        ) VALUES ($1, $2, $3, $4, $5)`,
        [baseline.id, version, 'approved', 'Test baseline auto-approved for testing', baselineUserId]
      )

      logger.info('✅ Baseline approved and activated')
    }

    // Output summary
    console.log('\n' + '='.repeat(80))
    console.log('TEST BASELINE CREATED SUCCESSFULLY')
    console.log('='.repeat(80))
    console.log(`\nBaseline ID: ${baseline.id}`)
    console.log(`Project ID: ${projectId}`)
    console.log(`Project Name: ${project.name}`)
    console.log(`Version: ${version}`)
    console.log(`Status: ${autoApprove ? 'approved' : 'draft'}`)
    console.log(`\nBaseline Components:`)
    console.log(`  - Stakeholders: ${baselineData.scope_baseline.stakeholders.length}`)
    console.log(`  - Risks: ${baselineData.scope_baseline.risks.length}`)
    console.log(`  - Milestones: ${baselineData.timeline_baseline.milestones.length}`)
    console.log(`  - Requirements: ${baselineData.scope_baseline.requirements.length}`)
    console.log(`  - Deliverables: ${baselineData.scope_baseline.deliverables.length}`)
    console.log(`  - Constraints: ${baselineData.scope_baseline.constraints.length}`)
    console.log(`  - Assumptions: ${baselineData.scope_baseline.assumptions.length}`)
    console.log(`  - Success Criteria: ${baselineData.success_criteria.kpis.length} KPIs`)
    console.log(`\nBudget: $${baselineData.cost_baseline.total_budget.toLocaleString()}`)
    console.log(`Duration: ${baselineData.timeline_baseline.total_duration}`)
    console.log(`\nQuality Scores:`)
    console.log(`  - Extraction Confidence: ${(0.95 * 100).toFixed(0)}%`)
    console.log(`  - Completeness: ${(0.90 * 100).toFixed(0)}%`)
    console.log(`  - Consistency: ${(0.88 * 100).toFixed(0)}%`)
    console.log(`  - Clarity: ${(0.92 * 100).toFixed(0)}%`)
    console.log('\n' + '='.repeat(80))
    console.log('\nNext Steps for Testing Drift Resolution:')
    console.log('1. Edit a project document to modify entities (add/remove/change)')
    console.log('2. Save the document - drift should be detected automatically')
    console.log('3. Use the "Resolve Drift" feature to test AI-powered resolution')
    console.log('4. Verify drift is resolved correctly')
    console.log('='.repeat(80) + '\n')

  } catch (error) {
    logger.error('Failed to create test baseline:', error)
    throw error
  } finally {
    client.release()
  }
}

/**
 * Create comprehensive baseline data with all 13 entity types
 */
function createComprehensiveBaselineData(projectName: string) {
  return {
    scope_baseline: {
      project_scope: `Comprehensive ${projectName} implementation with AI-powered features`,
      stakeholders: [
        { name: 'John Smith', role: 'Project Sponsor', influence_level: 'high', interest_level: 'high' },
        { name: 'Sarah Chen', role: 'Project Manager', influence_level: 'high', interest_level: 'high' },
        { name: 'Mike Johnson', role: 'Technical Lead', influence_level: 'medium', interest_level: 'high' },
        { name: 'Emily Davis', role: 'Business Analyst', influence_level: 'medium', interest_level: 'high' },
        { name: 'Alex Martinez', role: 'UX Designer', influence_level: 'low', interest_level: 'medium' }
      ],
      risks: [
        { title: 'Vendor delivery delay', category: 'external', probability: 'high', impact: 'high', mitigation: 'Establish backup vendors' },
        { title: 'Skills gap in AI/ML', category: 'resource', probability: 'medium', impact: 'high', mitigation: 'Training program and external consultants' },
        { title: 'Integration complexity', category: 'technical', probability: 'medium', impact: 'medium', mitigation: 'Proof of concept before full implementation' },
        { title: 'Budget constraints', category: 'financial', probability: 'low', impact: 'high', mitigation: 'Phased rollout approach' }
      ],
      requirements: [
        { id: 'REQ-001', title: 'User authentication', priority: 'high', status: 'approved' },
        { id: 'REQ-002', title: 'Document generation', priority: 'high', status: 'approved' },
        { id: 'REQ-003', title: 'AI integration', priority: 'high', status: 'approved' },
        { id: 'REQ-004', title: 'Real-time collaboration', priority: 'medium', status: 'approved' },
        { id: 'REQ-005', title: 'Analytics dashboard', priority: 'medium', status: 'draft' }
      ],
      deliverables: [
        { name: 'System Architecture Document', due_date: '2026-02-15', status: 'in_progress' },
        { name: 'API Documentation', due_date: '2026-03-01', status: 'not_started' },
        { name: 'User Training Materials', due_date: '2026-03-15', status: 'not_started' },
        { name: 'Production Deployment', due_date: '2026-04-01', status: 'not_started' }
      ],
      constraints: [
        { type: 'technical', description: 'Must integrate with existing SSO system' },
        { type: 'regulatory', description: 'GDPR compliance required for EU users' },
        { type: 'business', description: 'Go-live date fixed for Q2 2026' }
      ],
      assumptions: [
        { description: 'Current team capacity remains stable', validated: true },
        { description: 'Third-party APIs will maintain 99.9% uptime', validated: false },
        { description: 'Budget approved includes 15% contingency', validated: true }
      ]
    },
    technical_baseline: {
      tech_stack: ['Node.js 18+', 'React 18', 'PostgreSQL 15', 'Redis 7', 'TypeScript 5'],
      architecture: 'Microservices with event-driven architecture',
      infrastructure: 'Cloud-native deployment on AWS/GCP',
      security_requirements: ['OAuth2 authentication', 'End-to-end encryption', 'SOC 2 compliance'],
      performance_targets: {
        api_response_time: '< 200ms (p95)',
        concurrent_users: '10,000+',
        uptime: '99.9%'
      }
    },
    timeline_baseline: {
      total_duration: '6 months',
      start_date: '2026-01-15',
      end_date: '2026-07-15',
      milestones: [
        { name: 'Requirements Finalized', date: '2026-02-01', dependencies: [] },
        { name: 'Architecture Approved', date: '2026-02-15', dependencies: ['Requirements Finalized'] },
        { name: 'Development Phase 1 Complete', date: '2026-03-15', dependencies: ['Architecture Approved'] },
        { name: 'Testing Complete', date: '2026-04-15', dependencies: ['Development Phase 1 Complete'] },
        { name: 'User Acceptance Testing', date: '2026-05-01', dependencies: ['Testing Complete'] },
        { name: 'Production Deployment', date: '2026-06-01', dependencies: ['User Acceptance Testing'] }
      ],
      critical_path: ['Requirements Finalized', 'Architecture Approved', 'Development Phase 1 Complete', 'Testing Complete', 'Production Deployment']
    },
    cost_baseline: {
      total_budget: 500000,
      breakdown: {
        development: 300000,
        infrastructure: 75000,
        third_party_services: 50000,
        training: 35000,
        contingency: 40000
      },
      currency: 'USD'
    },
    resource_baseline: {
      team_size: 8,
      roles: [
        { title: 'Project Manager', count: 1, allocation: '100%' },
        { title: 'Backend Developer', count: 3, allocation: '100%' },
        { title: 'Frontend Developer', count: 2, allocation: '100%' },
        { title: 'DevOps Engineer', count: 1, allocation: '50%' },
        { title: 'QA Engineer', count: 1, allocation: '100%' }
      ],
      skills_required: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'AWS/GCP', 'AI/ML APIs']
    },
    success_criteria: {
      kpis: [
        { metric: 'User Adoption Rate', target: '80% within 3 months', measurement: 'Monthly active users' },
        { metric: 'System Uptime', target: '99.9%', measurement: 'Monthly availability' },
        { metric: 'API Response Time', target: '< 200ms (p95)', measurement: 'Application monitoring' },
        { metric: 'User Satisfaction', target: 'NPS > 50', measurement: 'Quarterly surveys' },
        { metric: 'Cost per Transaction', target: '< $0.10', measurement: 'Monthly financial reports' }
      ],
      acceptance_criteria: [
        'All functional requirements implemented and tested',
        'Security audit passed with no critical findings',
        'Performance benchmarks met under peak load',
        'User training completed for 100% of end users'
      ]
    },
    ai_processing_metadata: {
      method: 'manual_test_data',
      created_for: 'TASK-716 drift resolution testing',
      entity_types_included: 13,
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * Create baseline components for detailed tracking
 */
async function createBaselineComponents(client: import('pg').PoolClient, baselineId: string, baselineData: ReturnType<typeof createComprehensiveBaselineData>): Promise<void> {
  const components = []

  // Add stakeholder components
  for (const stakeholder of baselineData.scope_baseline.stakeholders) {
    components.push({
      type: 'scope_stakeholder',
      title: stakeholder.name,
      description: `${stakeholder.role} - ${stakeholder.influence_level} influence, ${stakeholder.interest_level} interest`,
      priority: stakeholder.influence_level
    })
  }

  // Add risk components
  for (const risk of baselineData.scope_baseline.risks) {
    components.push({
      type: 'scope_risk',
      title: risk.title,
      description: `${risk.category} - ${risk.probability} probability, ${risk.impact} impact`,
      priority: risk.impact
    })
  }

  // Add milestone components
  for (const milestone of baselineData.timeline_baseline.milestones) {
    components.push({
      type: 'timeline_milestone',
      title: milestone.name,
      description: `Target date: ${milestone.date}`,
      priority: 'high'
    })
  }

  // Insert components
  for (const component of components) {
    await client.query(
      `INSERT INTO baseline_components (
        baseline_id,
        component_type,
        title,
        description,
        priority
      ) VALUES ($1, $2, $3, $4, $5)`,
      [baselineId, component.type, component.title, component.description, component.priority]
    )
  }

  logger.info(`Created ${components.length} baseline components`)
}

/**
 * Create test entities for baseline extraction
 * Note: Currently not implemented as the baseline data is comprehensive enough
 * without requiring pre-existing entities in the database.
 */
async function createTestEntities(client: import('pg').PoolClient, projectId: string, userId: string): Promise<void> {
  logger.warn('[createTestEntities] Not implemented - using comprehensive baseline data instead')
  logger.warn('The --with-entities flag currently has no effect. Baseline data is created directly.')
}

// CLI execution
async function main() {
  const args = process.argv.slice(2)
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
Usage: npm run create-test-baseline <projectId> [options]

Create a comprehensive test baseline for drift resolution testing (TASK-716)

Arguments:
  projectId             UUID of the project to create baseline for

Options:
  --with-entities       Create test entities before baseline (optional)
  --no-auto-approve     Don't auto-approve the baseline (default: auto-approve)
  --help, -h            Show this help message

Examples:
  npm run create-test-baseline 123e4567-e89b-12d3-a456-426614174000
  npm run create-test-baseline 123e4567-e89b-12d3-a456-426614174000 --with-entities
  npm run create-test-baseline 123e4567-e89b-12d3-a456-426614174000 --no-auto-approve

Note: This script is specifically designed for TASK-716 to enable testing
      of the Automatic Drift Detection & Resolution feature.
`)
    process.exit(0)
  }

  const projectId = args[0]
  const withEntities = args.includes('--with-entities')
  const autoApprove = !args.includes('--no-auto-approve')

  try {
    await createTestBaseline({
      projectId,
      withEntities,
      autoApprove
    })
    
    logger.info('✅ Test baseline creation completed successfully')
    process.exit(0)
  } catch (error) {
    logger.error('❌ Test baseline creation failed:', error)
    process.exit(1)
  }
}

// Execute if run directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}

export { createTestBaseline, createComprehensiveBaselineData }
