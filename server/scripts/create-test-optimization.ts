const db = require('../src/lib/db')
import { v4 as uuidv4 } from 'uuid'
import * as dotenv from 'dotenv'

dotenv.config()

async function createTestOptimization() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  })

  try {
    const templateId = 'b04ab57d-9cab-49bf-99ba-c39daf1c241b' // Quality Management Plan

    console.log('\n🧪 Creating Test Optimization Suggestion...\n')

    const suggestionId = uuidv4()

    await db.query(
      `INSERT INTO template_improvement_suggestions
       (id, template_id, status, priority, expected_quality_gain, current_avg_quality,
        analysis_period_start, analysis_period_end, documents_analyzed,
        common_issues, suggested_improvements, improvement_rationale, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '1 day', NOW(), $7, $8, $9, $10, NOW())`,
      [
        suggestionId,
        templateId,
        'pending_review',
        'high',
        15, // Expected quality gain
        80, // Current score after regression
        2, // Documents analyzed
        JSON.stringify([{
          dimension: 'overall',
          description: 'Quality regression detected: 89% → 80% (-9%)',
          count: 1
        }]),
        JSON.stringify([{
          issue_addressed: 'Quality Regression from Template v2',
          proposed_change: 'AI analyzed your template changes and found that:\n\n1. Removing detailed examples reduced Content Depth\n2. Simplified prompts led to shorter, less comprehensive output\n3. Missing active voice requirements caused Professional Quality drop\n\nThe optimized template restores these elements while keeping your structural improvements.',
          change_type: 'template_optimization',
          section: 'entire_template',
          system_prompt: `You are a senior project management consultant with deep expertise in PMBOK 7 Quality Management principles.

Generate a comprehensive Quality Management Plan that:
- Uses ACTIVE VOICE throughout (e.g., "The team performs..." not "Quality is performed...")
- Includes DETAILED sections with minimum 200 words each
- Provides SPECIFIC examples relevant to the project
- Maintains EXECUTIVE-LEVEL formality and precision
- Cross-references related plans (Risk Management, Stakeholder Management)

Output must be in Markdown format with proper structure, tables, and professional tone.`,
          template_content: `# Quality Management Plan (QMP)

## Project: {{projectName}}
## Version: 1.0
## Date: {{currentDate}}
*Confidential – Internal Use Only*

---

## 1. Introduction (Min 200 words)

### 1.1 Purpose of the QMP

The project team establishes this Quality Management Plan to define how the team achieves quality objectives...

[REST OF TEMPLATE WITH IMPROVED STRUCTURE]

**Key Improvements from v2:**
- Added active voice requirements
- Restored detailed section guidelines  
- Included cross-reference requirements
- Enhanced formality standards`,
          changes_summary: {
            system_prompt_changes: [
              'Added explicit active voice requirement',
              'Specified minimum word counts per section (200 words)',
              'Enhanced formality guidelines for executive audience',
              'Added cross-referencing requirements'
            ],
            content_changes: [
              'Restored detailed section templates',
              'Added more examples and tables',
              'Improved structure with clearer subsections',
              'Enhanced variable placeholders'
            ],
            key_improvements: [
              'Addresses passive voice issue (Professional Quality: +15%)',
              'Restores content depth (Content Depth: +20%)',
              'Enhances cross-referencing (Standards Compliance: +10%)',
              'Overall predicted improvement: +15%'
            ]
          },
          metadata: {
            optimization_type: 'ai_generated',
            trigger: 'quality_regression',
            score_before: 89,
            score_after: 80,
            regression_amount: 9,
            generated_at: new Date().toISOString()
          }
        }]),
        'AI-generated optimization triggered by quality regression: 89% → 80% (-9%)'
      ]
    )

    console.log('✅ Test optimization created!')
    console.log(`   ID: ${suggestionId}`)
    console.log(`   Template: Quality Management Plan`)
    console.log(`   Expected Gain: +15%`)
    console.log(`   Status: pending_review`)
    console.log('')
    console.log('🧪 Ready to Test!')
    console.log('\n📋 Test Steps:')
    console.log('   1. Go to: http://localhost:3000/templates/b04ab57d-9cab-49bf-99ba-c39daf1c241b')
    console.log('   2. Click "Recommendations" tab')
    console.log('   3. Should see purple gradient AI optimization card')
    console.log('   4. Click "View Full Diff" to see comparison')
    console.log('   5. Click "✅ Apply to Template"')
    console.log('   6. Template will update to v3!')
    console.log('')

  } catch (error: any) {
    console.error('❌ Error:', error.message)
    console.error('Stack:', error.stack)
  } finally {
    try { await db.end() } catch (e) {}}
}

createTestOptimization()

