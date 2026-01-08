import * as dotenv from 'dotenv';
import * as path from 'path';
// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });
const dbModule = require('../src/lib/db')
const db = dbModule.default || dbModule

async function checkTemplateAnalysis() {
  try {
    await db.initDb()
    // Get recent quality audits
    const audits = await db.query(`
      SELECT 
        qa.id as audit_id,
        qa.document_id,
        d.title as document_name,
        d.template_id,
        t.name as template_name,
        qa.overall_score,
        qa.completeness_score,
        qa.standards_compliance_score,
        qa.consistency_score,
        qa.professional_quality_score,
        qa.audited_at,
        qa.ai_provider
      FROM quality_audits qa
      JOIN documents d ON qa.document_id = d.id
      LEFT JOIN templates t ON d.template_id = t.id
      WHERE qa.audited_at > NOW() - INTERVAL '2 hours'
      ORDER BY qa.audited_at DESC
      LIMIT 10
    `);
    
    console.log('\n📊 Recent Quality Audits (last 2 hours):\n');
    console.log(`Found ${audits.rows.length} audits\n`);
    
    audits.rows.forEach((audit, index) => {
      console.log(`[${index + 1}] ${audit.document_name}`);
      console.log(`    Template: ${audit.template_name || 'N/A'}`);
      console.log(`    Overall: ${audit.overall_score}%`);
      console.log(`    Completeness: ${audit.completeness_score}%`);
      console.log(`    Standards: ${audit.standards_compliance_score}%`);
      console.log(`    Consistency: ${audit.consistency_score}%`);
      console.log(`    Professional: ${audit.professional_quality_score}%`);
      console.log(`    AI Provider: ${audit.ai_provider || 'N/A'}`);
      console.log(`    Audit ID: ${audit.audit_id}`);
      
      // Check if should have triggered analysis
      const hasLowScore = 
        audit.completeness_score < 80 || 
        audit.standards_compliance_score < 80 ||
        audit.consistency_score < 80 ||
        audit.professional_quality_score < 80;
      
      if (audit.overall_score < 90 && hasLowScore) {
        console.log(`    ⚠️  Should trigger analysis: Score ${audit.overall_score}% < 90% AND has dimension < 80%`);
      }
      
      console.log('');
    });
    
    // Check for template improvement suggestions
    const suggestions = await db.query(`
      SELECT 
        tis.id,
        tis.template_id,
        t.name as template_name,
        tis.status,
        tis.priority,
        tis.current_avg_quality,
        tis.documents_analyzed,
        tis.expected_quality_gain,
        tis.created_at,
        CASE 
          WHEN jsonb_array_length(tis.common_issues) > 0 
          THEN jsonb_array_length(tis.common_issues)
          ELSE 0
        END as issue_count,
        CASE 
          WHEN jsonb_array_length(tis.suggested_improvements) > 0 
          THEN jsonb_array_length(tis.suggested_improvements)
          ELSE 0
        END as improvement_count
      FROM template_improvement_suggestions tis
      JOIN templates t ON tis.template_id = t.id
      WHERE tis.created_at > NOW() - INTERVAL '24 hours'
      ORDER BY tis.created_at DESC
      LIMIT 10
    `);
    
    console.log('\n💡 Template Improvement Suggestions (last 24 hours):\n');
    console.log(`Found ${suggestions.rows.length} suggestions\n`);
    
    if (suggestions.rows.length === 0) {
      console.log('❌ No template improvement suggestions found.\n');
      console.log('Possible reasons:');
      console.log('1. All quality scores were above threshold (90% + no dimension < 80%)');
      console.log('2. Recent suggestion already exists for this template');
      console.log('3. Template analysis trigger condition not met');
      console.log('4. Error in template analysis service\n');
    } else {
      suggestions.rows.forEach((sug, index) => {
        console.log(`[${index + 1}] ${sug.template_name}`);
        console.log(`    Status: ${sug.status}`);
        console.log(`    Priority: ${sug.priority}`);
        console.log(`    Current Avg Quality: ${sug.current_avg_quality}%`);
        console.log(`    Docs Analyzed: ${sug.documents_analyzed}`);
        console.log(`    Expected Quality Gain: +${sug.expected_quality_gain}%`);
        console.log(`    Common Issues: ${sug.issue_count}`);
        console.log(`    Suggested Improvements: ${sug.improvement_count}`);
        console.log(`    Created: ${sug.created_at}`);
        console.log(`    Suggestion ID: ${sug.id}`);
        console.log('');
      });
    }
    
    await db.end();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkTemplateAnalysis();

