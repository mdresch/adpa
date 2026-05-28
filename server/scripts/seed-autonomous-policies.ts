import { pool, connectDatabase } from '../src/database/connection';
import { logger } from '../src/utils/logger';

async function seedAutonomousPolicies() {
  logger.info('🌱 Seeding Autonomous Policy Library...');

  const policies = [
    {
      rule_code: 'GOV-SEC-001',
      title: 'Mandatory Security Classification',
      description: 'All governance and architectural documents must explicitly state their security classification (e.g., PUBLIC, INTERNAL, CONFIDENTIAL) in the header.',
      status: 'ACTIVE',
      version: 1,
      is_automated_discovery: false,
      execution_schema: {
        type: 'REGEX_CHECK',
        pattern: '(Security Classification|Sensitivity):\\s*(PUBLIC|INTERNAL|CONFIDENTIAL|RESTRICTED)',
        flags: 'i'
      },
      telemetry_metrics: {
        falsePositiveCount: 0,
        userOverrideCount: 0,
        totalRuns: 142
      }
    },
    {
      rule_code: 'GOV-ARC-004',
      title: 'Architectural Decision Record (ADR) Linkage',
      description: 'Any system design document must include a direct link to the corresponding approved ADR in the corporate registry.',
      status: 'ACTIVE',
      version: 2,
      is_automated_discovery: false,
      target_document_types: ['System Architecture', 'Technical Spec'],
      execution_schema: {
        type: 'LLM_EVALUATION',
        prompt: 'Does this document contain a reference or hyperlink to an Architectural Decision Record (ADR)?'
      },
      telemetry_metrics: {
        falsePositiveCount: 12,
        userOverrideCount: 3,
        totalRuns: 89
      }
    },
    {
      rule_code: 'AUTO-DISC-099',
      title: 'Identify Single Points of Failure',
      description: 'Discovered via telemetry: Recent incident reports indicate a lack of SPOF analysis. All technical specifications should include a SPOF mitigation section.',
      status: 'CANDIDATE',
      version: 1,
      is_automated_discovery: true,
      execution_schema: {
        type: 'SEMANTIC_SIMILARITY',
        target_concept: 'Single Point of Failure (SPOF) mitigation strategies and redundancy planning.'
      },
      telemetry_metrics: {
        falsePositiveCount: 0,
        userOverrideCount: 0,
        totalRuns: 0
      }
    },
    {
      rule_code: 'AUTO-DISC-102',
      title: 'Data Retention Clause Verification',
      description: 'Discovered via regulatory drift: Documents describing databases must include exact data retention limits.',
      status: 'CANDIDATE',
      version: 1,
      is_automated_discovery: true,
      execution_schema: {
        type: 'LLM_EVALUATION',
        prompt: 'Check if data retention periods (e.g. 30 days, 7 years) are explicitly defined for all stored data.'
      },
      telemetry_metrics: {
        falsePositiveCount: 0,
        userOverrideCount: 0,
        totalRuns: 0
      }
    },
    {
      rule_code: 'LEGACY-REQ-001',
      title: 'Require Physical Signatures',
      description: 'Documents must contain a blank line for physical ink signatures from stakeholders.',
      status: 'DEPRECATED',
      version: 1,
      is_automated_discovery: false,
      execution_schema: {
        type: 'KEYWORD_MATCH',
        keywords: ['Signature:', 'Date:', 'Sign here']
      },
      telemetry_metrics: {
        falsePositiveCount: 450,
        userOverrideCount: 312,
        totalRuns: 1050
      }
    }
  ];

  try {
    await connectDatabase();
    
    for (const policy of policies) {
      await pool.query(
        `INSERT INTO policy_library (
          rule_code, title, description, status, version, 
          is_automated_discovery, target_document_types, domain_tags,
          execution_schema, telemetry_metrics,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        ON CONFLICT (rule_code) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          status = EXCLUDED.status,
          target_document_types = EXCLUDED.target_document_types,
          domain_tags = EXCLUDED.domain_tags,
          telemetry_metrics = EXCLUDED.telemetry_metrics,
          updated_at = NOW()`,
        [
          policy.rule_code,
          policy.title,
          policy.description,
          policy.status,
          policy.version,
          policy.is_automated_discovery,
          (policy as any).target_document_types || [],
          (policy as any).domain_tags || [],
          JSON.stringify(policy.execution_schema),
          JSON.stringify(policy.telemetry_metrics)
        ]
      );
      logger.info(`✅ Seeded policy: ${policy.rule_code}`);
    }
    
    logger.info('🎉 Autonomous policies seeded successfully!');
  } catch (error) {
    logger.error('❌ Failed to seed policies:', error);
  } finally {
    await pool.end();
  }
}

seedAutonomousPolicies();
