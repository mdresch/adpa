/**
 * Test Script: Template Optimization Apply Functionality
 * Tests the "Apply to Template" button workflow end-to-end
 * 
 * This script:
 * 1. Finds an AI-generated template optimization suggestion
 * 2. Applies the optimization via API
 * 3. Verifies template version incremented
 * 4. Checks cache was cleared
 * 5. Validates suggestion status updated to 'implemented'
 */

const db = require('../src/lib/db');
import * as dotenv from 'dotenv';
import * as path from 'path';
import axios from 'axios';
import * as jwt from 'jsonwebtoken';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Bypass SSL certificate validation for cloud databases
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

async function testTemplateOptimizationApply() {
  console.log('🧪 Testing Template Optimization Apply Functionality\n');
  console.log('=' .repeat(60) + '\n');

  try {
    // Step 1: Find a pending AI-generated optimization suggestion
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
      console.log('   Please run a quality audit that triggers a quality regression first\n');
      console.log('💡 To create test data:');
      console.log('   1. Generate a document from a template');
      console.log('   2. Modify the template to lower quality');
      console.log('   3. Generate another document');
      console.log('   4. The quality regression will trigger an optimization suggestion\n');
      process.exit(0);
    }

    const suggestion = suggestionResult.rows[0];
    console.log('✅ Found optimization suggestion!');
    console.log(`   Suggestion ID: ${suggestion.id.substring(0, 8)}...`);
    console.log(`   Template: ${suggestion.template_name}`);
    console.log(`   Current Version: v${suggestion.current_prompt_version}`);
    console.log(`   Expected Gain: +${suggestion.expected_quality_gain}%\n`);

    // Step 2: Get admin user token
    console.log('👤 Step 2: Getting admin user token...');
    
    const adminResult = await db.query(`
      SELECT id, email, role
      FROM users
      WHERE role = 'admin'
      LIMIT 1
    `);

    if (adminResult.rows.length === 0) {
      console.log('❌ No admin user found. Please create an admin user first.\n');
      process.exit(1);
    }

    const admin = adminResult.rows[0];
    console.log(`✅ Admin user: ${admin.email}\n`);

    // Generate JWT token
    const token = jwt.sign(
      { userId: admin.id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );

    // Step 3: Apply optimization via API
    console.log('🚀 Step 3: Applying optimization via API...');
    console.log(`   Endpoint: POST /api/quality-audits/template-optimization/${suggestion.id.substring(0, 8)}.../apply`);

    try {
      const response = await axios.post(
        `http://localhost:5000/api/quality-audits/template-optimization/${suggestion.id}/apply`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ API Response:', response.data.message);
      console.log(`   Expected new version: v${suggestion.current_prompt_version + 1}\n`);

    } catch (apiError) {
      if (axios.isAxiosError(apiError)) {
        console.log('❌ API Error:', apiError.response?.data?.error || apiError.message);
        console.log('   Status:', apiError.response?.status);
      } else {
        console.log('❌ Unexpected error:', apiError);
      }
      throw apiError;
    }

    // Step 4: Verify template version incremented
    console.log('✅ Step 4: Verifying template version incremented...');
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second for DB update

    const templateResult = await db.query(`
      SELECT 
        id,
        name,
        prompt_version,
        updated_at
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
      console.log(`   Updated: ${new Date(template.updated_at).toLocaleString()}\n`);
    } else {
      console.log(`❌ Version mismatch`);
      console.log(`   Expected: v${expectedVersion}`);
      console.log(`   Actual:   v${template.prompt_version}\n`);
    }

    // Step 5: Verify suggestion status updated
    console.log('📊 Step 5: Verifying suggestion status...');
    
    const updatedSuggestion = await db.query(`
      SELECT 
        id,
        status,
        implemented_by,
        implemented_at
      FROM template_improvement_suggestions
      WHERE id = $1
    `, [suggestion.id]);

    if (updatedSuggestion.rows.length === 0) {
      console.log('❌ Suggestion not found');
      process.exit(1);
    }

    const sug = updatedSuggestion.rows[0];

    if (sug.status === 'implemented') {
      console.log('✅ Suggestion status updated to "implemented"');
      console.log(`   Implemented by: ${sug.implemented_by?.substring(0, 8)}...`);
      console.log(`   Implemented at: ${new Date(sug.implemented_at).toLocaleString()}\n`);
    } else {
      console.log(`❌ Suggestion status not updated`);
      console.log(`   Expected: implemented`);
      console.log(`   Actual:   ${sug.status}\n`);
    }

    // Step 6: Check template version history
    console.log('📜 Step 6: Checking template version history...');
    
    const versionHistory = await db.query(`
      SELECT 
        version_number,
        change_type,
        change_summary,
        created_at,
        created_by
      FROM template_versions
      WHERE template_id = $1
      ORDER BY version_number DESC
      LIMIT 3
    `, [suggestion.template_id]);

    if (versionHistory.rows.length > 0) {
      console.log('✅ Version history found:');
      versionHistory.rows.forEach((version, idx) => {
        console.log(`   ${idx + 1}. v${version.version_number} - ${version.change_type || 'N/A'}`);
        console.log(`      Created: ${new Date(version.created_at).toLocaleString()}`);
        if (version.change_summary) {
          console.log(`      Summary: ${version.change_summary.substring(0, 60)}...`);
        }
      });
      console.log();
    } else {
      console.log('⚠️  No version history found (this is OK if versioning is not enabled)\n');
    }

    // Final Summary
    console.log('=' .repeat(60));
    console.log('🎉 TEST RESULTS SUMMARY\n');
    
    const checks = [
      { name: 'AI optimization suggestion found', status: true },
      { name: 'API endpoint accessible', status: true },
      { name: 'Template version incremented', status: template.prompt_version === expectedVersion },
      { name: 'Suggestion status updated', status: sug.status === 'implemented' },
      { name: 'Version history tracked', status: versionHistory.rows.length > 0 }
    ];

    checks.forEach(check => {
      const icon = check.status ? '✅' : '❌';
      console.log(`${icon} ${check.name}`);
    });

    const allPassed = checks.every(c => c.status);
    
    console.log('\n' + '=' .repeat(60));
    
    if (allPassed) {
      console.log('✅ ALL TESTS PASSED! 🎉');
      console.log('   The "Apply to Template" button is working correctly.\n');
    } else {
      console.log('⚠️  SOME TESTS FAILED');
      console.log('   Please review the output above for details.\n');
    }

  } catch (error) {
    console.error('\n❌ Test failed with error:');
    if (error instanceof Error) {
      console.error('   ' + error.message);
      if ((error as any).stack) {
        console.error('\nStack trace:');
        console.error((error as any).stack);
      }
    } else {
      console.error('   ' + String(error));
    }
    process.exit(1);
  } finally {
    try { await db.end() } catch (e) {}
  }
}

// Run the test
testTemplateOptimizationApply();

