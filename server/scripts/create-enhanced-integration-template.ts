/**
 * Create Enhanced Integration Management Plan Template
 * Creates or updates the template with comprehensive structure
 */

import { pool } from '../src/database/connection'
import { logger } from '../src/utils/logger'

async function createEnhancedTemplate() {
  logger.info('🚀 Creating/Updating Integration Management Plan template...')
  
  try {
    // Check if template exists
    const checkResult = await pool.query(`
      SELECT id, name FROM templates 
      WHERE name = 'Integration Management Plan' 
      OR name = 'Project Integration Management Plan'
    `)
    
    if (checkResult.rows.length > 0) {
      logger.info(`Found existing template: ${checkResult.rows[0].name}`)
      logger.info('Updating existing template...')
    } else {
      logger.info('No existing template found. Creating new template...')
    }
    
    // Update or insert the enhanced template
    let result
    if (checkResult.rows.length > 0) {
      // Update existing template
      result = await pool.query(`
        UPDATE templates 
        SET 
          description = $1,
          content = $2::jsonb,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING id, name, framework, category
      `, [
        'Comprehensive Integration Management Plan with detailed sections covering Executive Summary, Project Charter, all 9 Knowledge Area Management Plans, Integrated Change Control with CCB structure, and Work Performance Monitoring with KPIs - production-ready and stakeholder-presentable',
        {
      sections: [
        {
          id: "executive_summary",
          title: "Executive Summary",
          guidance: "Comprehensive project overview (200+ words) with name, manager, sponsor, dates, budget, 3-5 key objectives, integration approach, expected benefits",
          min_words: 200
        },
        {
          id: "project_charter",
          title: "Project Charter",
          guidance: "Complete charter (400+ words) with purpose, objectives table, success criteria, requirements (functional/technical/performance), assumptions, constraints, stakeholders, risks",
          min_words: 400
        },
        {
          id: "project_management_plan",
          title: "Project Management Plan",
          guidance: "ALL 9 knowledge areas (800+ words total): Scope, Schedule, Cost, Quality, Resource, Communications, Risk, Procurement, Stakeholder. Each area 100+ words with specific processes, tools, deliverables, and tables",
          min_words: 800
        },
        {
          id: "integrated_change_control",
          title: "Integrated Change Control",
          guidance: "Complete change management (300+ words): 7-step workflow, CCB members table, change request form, impact assessment, approval criteria with thresholds",
          min_words: 300
        },
        {
          id: "project_work_performance",
          title: "Project Work Performance",
          guidance: "Performance framework (300+ words): KPI table with 6+ metrics, data collection methods, reporting schedule (weekly/monthly), corrective action process",
          min_words: 300
        }
      ],
      formatting_guidelines: {
        use_markdown: true,
        include_tables: true,
        table_minimum: 5,
        min_total_words: 2000,
        use_headers: "H1 for title, H2 for sections, H3 for subsections",
        professional_tone: true
      },
      metadata: {
        version: "2.0",
        last_updated: "2025-01-13",
        author: "ADPA System",
        methodology: "PMBOK 7th Edition",
        complexity: "advanced",
        estimated_length: "2000-3000 words"
      }
        },
        checkResult.rows[0].id
      ])
    } else {
      // Insert new template
      result = await pool.query(`
        INSERT INTO templates (
          name, 
          description, 
          framework, 
          category, 
          content, 
          is_public,
          created_by
        ) VALUES (
          'Integration Management Plan',
          $1,
          'PMBOK',
          'Integration Management',
          $2::jsonb,
          true,
          (SELECT id FROM users WHERE email = 'admin@adpa.com' LIMIT 1)
        )
        RETURNING id, name, framework, category
      `, [
        'Comprehensive Integration Management Plan with detailed sections covering Executive Summary, Project Charter, all 9 Knowledge Area Management Plans, Integrated Change Control with CCB structure, and Work Performance Monitoring with KPIs - production-ready and stakeholder-presentable',
        {
          sections: [
            {
              id: "executive_summary",
              title: "Executive Summary",
              guidance: "Comprehensive project overview (200+ words) with name, manager, sponsor, dates, budget, 3-5 key objectives, integration approach, expected benefits",
              min_words: 200
            },
            {
              id: "project_charter",
              title: "Project Charter",
              guidance: "Complete charter (400+ words) with purpose, objectives table, success criteria, requirements (functional/technical/performance), assumptions, constraints, stakeholders, risks",
              min_words: 400
            },
            {
              id: "project_management_plan",
              title: "Project Management Plan",
              guidance: "ALL 9 knowledge areas (800+ words total): Scope, Schedule, Cost, Quality, Resource, Communications, Risk, Procurement, Stakeholder. Each area 100+ words with specific processes, tools, deliverables, and tables",
              min_words: 800
            },
            {
              id: "integrated_change_control",
              title: "Integrated Change Control",
              guidance: "Complete change management (300+ words): 7-step workflow, CCB members table, change request form, impact assessment, approval criteria with thresholds",
              min_words: 300
            },
            {
              id: "project_work_performance",
              title: "Project Work Performance",
              guidance: "Performance framework (300+ words): KPI table with 6+ metrics, data collection methods, reporting schedule (weekly/monthly), corrective action process",
              min_words: 300
            }
          ],
          formatting_guidelines: {
            use_markdown: true,
            include_tables: true,
            table_minimum: 5,
            min_total_words: 2000,
            use_headers: "H1 for title, H2 for sections, H3 for subsections",
            professional_tone: true
          },
          metadata: {
            version: "2.0",
            last_updated: "2025-01-13",
            author: "ADPA System",
            methodology: "PMBOK 7th Edition",
            complexity: "advanced",
            estimated_length: "2000-3000 words"
          }
        }
      ])
    }
    
    if (result.rows.length > 0) {
      const template = result.rows[0]
      logger.info('✅ Template created/updated successfully!')
      logger.info('📊 Template Details:', {
        id: template.id,
        name: template.name,
        framework: template.framework,
        category: template.category
      })
    }
    
    logger.info('✨ Complete!')
    
  } catch (error) {
    logger.error('❌ Failed:', error)
    throw error
  } finally {
    await pool.end()
  }
}

// Run
createEnhancedTemplate()
  .then(() => {
    console.log('\n✅ Template ready!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error)
    process.exit(1)
  })

