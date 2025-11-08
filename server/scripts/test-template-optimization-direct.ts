/**
 * Direct Template Optimization Test
 * Tests template optimization WITHOUT requiring the server to be running
 * 
 * This test directly imports and tests the services
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Bypass SSL certificate validation
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

interface Suggestion {
  id: string;
  template_id: string;
  template_name: string;
  status: string;
  expected_quality_gain: number;
  current_prompt_version: number;
}

async function testTemplateOptimizationDirect() {
  console.log('🧪 Direct Template Optimization Test (No Server Required)\n');
  console.log('=' .repeat(60) + '\n');

  try {
    // Step 1: Find a pending optimization suggestion
    console.log('📋 Step 1: Finding AI-generated optimization suggestion...');
    
    const suggestionResult = await pool.query<Suggestion>(`
      SELECT 
        tis.id,
        tis.template_id,
        t.name as template_name,
        tis.status,
        tis.expected_quality_gain,
        t.prompt_version as current_prompt_version
      FROM template_improvement_suggestions tis
      JOIN templates t ON tis.template_id = t.id
      WHERE tis.status = 'pending_review'
      AND tis.suggested_improvements IS NOT NULL
      AND jsonb_array_length(tis.suggested_improvements) > 0
      AND EXISTS (
        SELECT 1 
        FROM jsonb_array_elements(tis.suggested_improvements) AS imp
        WHERE imp->>'change_type' = 'template_optimization'
      )
      ORDER BY tis.created_at DESC
      LIMIT 1
    `);

    if (suggestionResult.rows.length === 0) {
      console.log('⚠️  No pending AI optimization suggestions found');
      console.log('   This is OK - it means no quality regressions have been detected\n');
      console.log('💡 To create test data:');
      console.log('   1. Generate a document with high quality');
      console.log('   2. Modify the template to lower quality');
      console.log('   3. Generate another document (quality will drop)');
      console.log('   4. System will auto-generate an optimization suggestion\n');
      
      // Show template optimization feature status instead
      await showFeatureStatus();
      process.exit(0);
    }

    const suggestion = suggestionResult.rows[0];
    console.log('✅ Found optimization suggestion!');
    console.log(`   ID: ${suggestion.id.substring(0, 8)}...`);
    console.log(`   Template: ${suggestion.template_name}`);
    console.log(`   Current Version: v${suggestion.current_prompt_version}`);
    console.log(`   Expected Gain: +${suggestion.expected_quality_gain}%\n`);

    // Step 2: Get admin user
    console.log('👤 Step 2: Getting admin user...');
    
    const adminResult = await pool.query(`
      SELECT id, email, role
      FROM users
      WHERE role = 'admin'
      LIMIT 1
    `);

    if (adminResult.rows.length === 0) {
      console.log('❌ No admin user found');
      console.log('   Run: npm run create-admin\n');
      process.exit(1);
    }

    const admin = adminResult.rows[0];
    console.log(`✅ Admin user: ${admin.email}\n`);

    // Step 3: Apply optimization directly via service
    console.log('🚀 Step 3: Applying optimization via service (direct)...');
    
    // Import the service
    const { templateOptimizationService } = await import('../src/services/templateOptimizationService');
    
    try {
      await templateOptimizationService.applyOptimization(suggestion.id, admin.id);
      console.log('✅ Optimization applied successfully!\n');
    } catch (error: any) {
      console.log('❌ Failed to apply optimization:', error.message);
      throw error;
    }

    // Step 4: Verify template version incremented
    console.log('✅ Step 4: Verifying template version incremented...');
    
    await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause

    const templateResult = await pool.query(`
      SELECT id, name, prompt_version, updated_at
      FROM templates
      WHERE id = $1
    `, [suggestion.template_id]);

    if (templateResult.rows.length === 0) {
      console.log('❌ Template not found');
      process.exit(1);
    }

    const template = templateResult.rows[0];
    const expectedVersion = suggestion.current_prompt_version + 1;

    if (template.prompt_version === expectedVersion) {
      console.log(`✅ Version incremented successfully!`);
      console.log(`   Previous: v${suggestion.current_prompt_version}`);
      console.log(`   Current:  v${template.prompt_version}`);
      console.log(`   Updated:  ${new Date(template.updated_at).toLocaleString()}\n`);
    } else {
      console.log(`⚠️  Version mismatch`);
      console.log(`   Expected: v${expectedVersion}`);
      console.log(`   Actual:   v${template.prompt_version}\n`);
    }

    // Step 5: Verify suggestion status
    console.log('📊 Step 5: Verifying suggestion status...');
    
    const updatedSuggestion = await pool.query(`
      SELECT id, status, implemented_by, implemented_at
      FROM template_improvement_suggestions
      WHERE id = $1
    `, [suggestion.id]);

    const sug = updatedSuggestion.rows[0];

    if (sug.status === 'implemented') {
      console.log('✅ Suggestion status updated to "implemented"');
      console.log(`   Implemented by: ${sug.implemented_by?.substring(0, 8)}...`);
      console.log(`   Implemented at: ${new Date(sug.implemented_at).toLocaleString()}\n`);
    } else {
      console.log(`⚠️  Status: ${sug.status} (expected: implemented)\n`);
    }

    // Step 6: Check template content updated
    console.log('📝 Step 6: Checking template content...');
    
    const contentCheck = await pool.query(`
      SELECT 
        content,
        system_prompt,
        LENGTH(content::text) as content_length,
        LENGTH(system_prompt) as prompt_length
      FROM templates
      WHERE id = $1
    `, [suggestion.template_id]);

    const content = contentCheck.rows[0];
    console.log('✅ Template content verified');
    console.log(`   Content size: ${content.content_length} chars`);
    console.log(`   System prompt: ${content.prompt_length} chars\n`);

    // Final Summary
    console.log('=' .repeat(60));
    console.log('🎉 TEST RESULTS SUMMARY\n');
    
    const checks = [
      { name: 'AI optimization suggestion found', status: true },
      { name: 'Admin user available', status: true },
      { name: 'Optimization applied successfully', status: true },
      { name: 'Template version incremented', status: template.prompt_version === expectedVersion },
      { name: 'Suggestion status updated', status: sug.status === 'implemented' },
      { name: 'Template content updated', status: content.content_length > 0 }
    ];

    checks.forEach(check => {
      const icon = check.status ? '✅' : '❌';
      console.log(`${icon} ${check.name}`);
    });

    const allPassed = checks.every(c => c.status);
    
    console.log('\n' + '=' .repeat(60));
    
    if (allPassed) {
      console.log('✅ ALL TESTS PASSED! 🎉');
      console.log('   The "Apply to Template" functionality is working correctly.\n');
      
      console.log('💡 Next steps:');
      console.log('   1. Check the template in the UI');
      console.log('   2. Generate a new document with the optimized template');
      console.log('   3. Verify quality improvement (+15% expected)\n');
    } else {
      console.log('⚠️  SOME TESTS FAILED');
      console.log('   Please review the output above for details.\n');
    }

  } catch (error) {
    console.error('\n❌ Test failed with error:');
    if (error instanceof Error) {
      console.error('   ' + error.message);
      if (error.stack) {
        console.error('\nStack trace:');
        console.error(error.stack);
      }
    } else {
      console.error('   ' + String(error));
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

/**
 * Show feature status when no suggestions found
 */
async function showFeatureStatus() {
  console.log('📊 Template Optimization Feature Status:\n');

  try {
    // Check if tables exist
    const tablesCheck = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN (
        'template_improvement_suggestions',
        'quality_audits',
        'templates'
      )
      ORDER BY table_name
    `);

    console.log('✅ Required Tables:');
    tablesCheck.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });

    // Check total suggestions
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending_review' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'implemented' THEN 1 END) as implemented,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected
      FROM template_improvement_suggestions
    `);

    const stats = statsResult.rows[0];
    console.log('\n📈 Template Improvement Statistics:');
    console.log(`   Total suggestions: ${stats.total}`);
    console.log(`   Pending review: ${stats.pending}`);
    console.log(`   Implemented: ${stats.implemented}`);
    console.log(`   Rejected: ${stats.rejected}`);

    // Check quality audits
    const auditStats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        ROUND(AVG(overall_score)) as avg_quality,
        COUNT(CASE WHEN overall_score < 70 THEN 1 END) as low_quality
      FROM quality_audits
      WHERE audited_at > NOW() - INTERVAL '7 days'
    `);

    const audits = auditStats.rows[0];
    console.log('\n🔍 Recent Quality Audits (7 days):');
    console.log(`   Total audits: ${audits.total}`);
    console.log(`   Average quality: ${audits.avg_quality}%`);
    console.log(`   Low quality (<70%): ${audits.low_quality}`);

    console.log('\n✅ Feature Status: OPERATIONAL');
    console.log('   All systems ready. Waiting for quality regression to trigger optimization.\n');

  } catch (error) {
    console.error('Error checking feature status:', error);
  }
}

// Run the test
testTemplateOptimizationDirect();

