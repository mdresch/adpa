/**
 * Seed Playbook Templates
 * Deploys standardized ADPA playbook templates to the database
 */

import { pool, connectDatabase } from '../src/database/connection'
import { PlaybookTemplateGenerator, PLAYBOOK_TEMPLATE_CONFIGS } from '../src/modules/documentTemplates/playbookTemplate'
import { logger } from '../src/utils/logger'

async function seedPlaybookTemplates() {
  console.log('🌱 Starting playbook template seeding...')

  try {
    // Connect to database
    await connectDatabase()
    const client = await pool!.connect()
    console.log('✅ Connected to database')

    try {
      // Get or create system user
      const userResult = await client.query('SELECT id FROM users WHERE email = $1', ['system@adpa.org'])
      let systemUserId: string

      if (userResult.rows.length === 0) {
        // Create system user
        const createUserResult = await client.query(`
          INSERT INTO users (id, email, name, role, is_active, created_at, updated_at)
          VALUES (gen_random_uuid(), 'system@adpa.org', 'ADPA System', 'system', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING id
        `)
        systemUserId = createUserResult.rows[0].id
        console.log('👤 Created system user')
      } else {
        systemUserId = userResult.rows[0].id
        console.log('👤 Using existing system user')
      }

      console.log('\n📋 Seeding playbook templates...')

      // Seed each template configuration
      const templateConfigs = [
        { key: 'programExecutive', config: PLAYBOOK_TEMPLATE_CONFIGS.programExecutive },
        { key: 'programTechnical', config: PLAYBOOK_TEMPLATE_CONFIGS.programTechnical },
        { key: 'frameworkTechnical', config: PLAYBOOK_TEMPLATE_CONFIGS.frameworkTechnical },
        { key: 'operationalStandard', config: PLAYBOOK_TEMPLATE_CONFIGS.operationalStandard }
      ]

      for (const { key, config } of templateConfigs) {
        // Check if template already exists
        const existingTemplate = await client.query(
          'SELECT id FROM document_templates WHERE name = $1 AND created_by = $2',
          [`ADPA ${key.replace(/([A-Z])/g, ' $1').trim()} Playbook`, systemUserId]
        )

        if (existingTemplate.rows.length > 0) {
          console.log(`  - ${key}: Template already exists, skipping`)
          continue
        }

        // Generate template
        const template = PlaybookTemplateGenerator.generatePlaybookTemplate(config)
        
        // Override created_by with system user ID
        template.created_by = systemUserId

        // Insert template into database
        const insertResult = await client.query(`
          INSERT INTO document_templates (
            id, name, description, framework, category, content, variables, 
            is_public, created_by, usage_count, created_at, updated_at,
            system_prompt, context_injection_config, prompt_build_up,
            template_paragraphs, gkg_context_strategy
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
          )
          RETURNING id
        `, [
          template.id,
          template.name,
          template.description,
          template.framework,
          template.category,
          JSON.stringify(template.content),
          JSON.stringify(template.variables),
          template.is_public,
          template.created_by,
          template.usage_count,
          template.created_at,
          template.updated_at,
          template.system_prompt || null,
          template.context_injection_config ? JSON.stringify(template.context_injection_config) : null,
          template.prompt_build_up ? JSON.stringify(template.prompt_build_up) : null,
          template.template_paragraphs ? JSON.stringify(template.template_paragraphs) : null,
          template.gkg_context_strategy ? JSON.stringify(template.gkg_context_strategy) : null
        ])

        console.log(`  ✅ ${key}: Created template ${insertResult.rows[0].id}`)
      }

      console.log('\n✨ Playbook template seeding complete!')

      // Summary
      const countResult = await client.query(
        'SELECT COUNT(*) as count FROM document_templates WHERE created_by = $1',
        [systemUserId]
      )
      console.log(`📊 Total playbook templates in database: ${countResult.rows[0].count}`)

    } finally {
      client.release()
    }

  } catch (error) {
    console.error('❌ Template seeding failed:', error)
    throw error
  } finally {
    if (pool) await pool.end()
  }
}

// Run the seed
if (require.main === module) {
  seedPlaybookTemplates().catch(console.error)
}

export { seedPlaybookTemplates }
