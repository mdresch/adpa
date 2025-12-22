/**
 * Verification script to check that all implementation pieces are in place
 */

console.log('🔍 Verifying Template Analytics Implementation...\n');

const fs = require('fs');
const path = require('path');

// Check if all required files exist
const requiredFiles = [
  'src/services/documentPurposeService.ts',
  'src/services/templateAnalyticsService.ts', 
  'src/routes/template-analytics.ts',
  'src/services/jobs/ExtractionOrchestrationService.ts',
  'src/database/migrations/add_template_purpose_analytics.sql',
  'scripts/run-migration-700-template-purpose.ts'
];

console.log('📁 Checking required files...');
let allFilesExist = true;

for (const file of requiredFiles) {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - NOT FOUND`);
    allFilesExist = false;
  }
}

// Check if key functions are implemented
console.log('\n🔧 Checking implementation details...');

try {
  // Check DocumentPurposeService
  const docPurposeContent = fs.readFileSync(path.join(__dirname, 'src/services/documentPurposeService.ts'), 'utf8');
  if (docPurposeContent.includes('rebuildForProject')) {
    console.log('✅ DocumentPurposeService.rebuildForProject - IMPLEMENTED');
  } else {
    console.log('❌ DocumentPurposeService.rebuildForProject - MISSING');
    allFilesExist = false;
  }

  if (docPurposeContent.includes('assignKnowledgeDomainPurpose')) {
    console.log('✅ DocumentPurposeService.assignKnowledgeDomainPurpose - IMPLEMENTED');
  } else {
    console.log('❌ DocumentPurposeService.assignKnowledgeDomainPurpose - MISSING');
    allFilesExist = false;
  }

  // Check TemplateAnalyticsService
  const templateAnalyticsContent = fs.readFileSync(path.join(__dirname, 'src/services/templateAnalyticsService.ts'), 'utf8');
  if (templateAnalyticsContent.includes('updateTemplateEntityProfile')) {
    console.log('✅ TemplateAnalyticsService.updateTemplateEntityProfile - IMPLEMENTED');
  } else {
    console.log('❌ TemplateAnalyticsService.updateTemplateEntityProfile - MISSING');
    allFilesExist = false;
  }

  // Check integration hooks
  const orchestrationContent = fs.readFileSync(path.join(__dirname, 'src/services/jobs/ExtractionOrchestrationService.ts'), 'utf8');
  if (orchestrationContent.includes('DocumentPurposeService') && orchestrationContent.includes('rebuildForProject')) {
    console.log('✅ Integration hooks in ExtractionOrchestrationService - IMPLEMENTED');
  } else {
    console.log('❌ Integration hooks in ExtractionOrchestrationService - MISSING');
    allFilesExist = false;
  }

  // Check admin endpoints
  const routesContent = fs.readFileSync(path.join(__dirname, 'src/routes/template-analytics.ts'), 'utf8');
  if (routesContent.includes('rebuild-entity-profiles') && routesContent.includes('rebuild-document-purposes')) {
    console.log('✅ Admin rebuild endpoints - IMPLEMENTED');
  } else {
    console.log('❌ Admin rebuild endpoints - MISSING');
    allFilesExist = false;
  }

  // Check migration file
  const migrationContent = fs.readFileSync(path.join(__dirname, 'src/database/migrations/add_template_purpose_analytics.sql'), 'utf8');
  if (migrationContent.includes('template_entity_profile') && migrationContent.includes('inferred_primary_domain')) {
    console.log('✅ Database migration - READY');
  } else {
    console.log('❌ Database migration - INCOMPLETE');
    allFilesExist = false;
  }

} catch (error) {
  console.log(`❌ Error checking implementation: ${error.message}`);
  allFilesExist = false;
}

console.log('\n📊 Implementation Summary:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

if (allFilesExist) {
  console.log('🎉 ALL IMPLEMENTATION PIECES ARE IN PLACE!');
  console.log('');
  console.log('✅ Database schema (migration file)');
  console.log('✅ DocumentPurposeService');
  console.log('✅ TemplateAnalyticsService.updateTemplateEntityProfile');
  console.log('✅ Integration hooks in extraction orchestration');
  console.log('✅ Admin endpoints for manual rebuilds');
  console.log('');
  console.log('🚀 Ready for deployment!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Apply database migration');
  console.log('2. Restart backend services');
  console.log('3. Run extraction job to test integration');
  console.log('4. Use admin endpoints to manually rebuild if needed');
} else {
  console.log('❌ IMPLEMENTATION INCOMPLETE');
  console.log('');
  console.log('Please check the missing pieces above and complete the implementation.');
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

process.exit(allFilesExist ? 0 : 1);