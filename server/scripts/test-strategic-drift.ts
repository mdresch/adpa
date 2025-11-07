import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const projectId = 'e8edf585-a14d-42dc-8009-660784d31387';

async function testStrategicDrift() {
  try {
    console.log('\n🚨 TESTING DRIFT DETECTION ON STRATEGIC VISION DOCUMENTS\n');
    console.log('=' .repeat(70));

    // Import drift detection service
    const { driftDetectionService } = await import('../src/services/driftDetectionService');

    // Get the 3 strategic documents
    const docsResult = await pool.query(`
      SELECT id, name, created_at
      FROM documents
      WHERE project_id = $1
      AND (
        name ILIKE '%vision%' OR 
        name ILIKE '%implementation%' OR 
        name ILIKE '%immediate%'
      )
      ORDER BY created_at DESC
      LIMIT 3
    `, [projectId]);

    console.log(`\n📄 Found ${docsResult.rows.length} strategic documents:\n`);
    docsResult.rows.forEach((doc, idx) => {
      console.log(`${idx + 1}. ${doc.name}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Uploaded: ${doc.created_at}\n`);
    });

    if (docsResult.rows.length === 0) {
      console.log('⚠️  No strategic documents found!');
      await pool.end();
      return;
    }

    console.log('=' .repeat(70));

    // Get baseline info
    const baselineResult = await pool.query(`
      SELECT id, version, status, 
             jsonb_array_length(document_corpus) as doc_count
      FROM project_baselines
      WHERE project_id = $1 
      AND status = 'approved'
      ORDER BY approved_at DESC
      LIMIT 1
    `, [projectId]);

    if (baselineResult.rows.length > 0) {
      const baseline = baselineResult.rows[0];
      console.log(`\n📊 Baseline v${baseline.version}:`);
      console.log(`   ID: ${baseline.id}`);
      console.log(`   Status: ${baseline.status}`);
      console.log(`   Documents in baseline: ${baseline.doc_count || 0}\n`);
    }

    console.log('=' .repeat(70));

    // Trigger drift detection for each document
    for (const doc of docsResult.rows) {
      console.log(`\n🔍 Analyzing: ${doc.name}`);
      console.log(`   Document ID: ${doc.id}`);
      
      try {
        const driftResult = await driftDetectionService.checkForDrift(projectId, doc.id);
        
        console.log(`\n   ✅ Drift Detection Complete!`);
        console.log(`   Has Drift: ${driftResult.hasDrift ? '🚨 YES' : '✅ NO'}`);
        console.log(`   Severity: ${driftResult.severity.toUpperCase()}`);
        console.log(`   Drift Points: ${driftResult.driftPoints.length}`);
        console.log(`   Summary: ${driftResult.summary}`);
        
        if (driftResult.hasDrift && driftResult.driftPoints.length > 0) {
          console.log(`\n   🔍 Drift Details:`);
          driftResult.driftPoints.forEach((dp, idx) => {
            console.log(`\n      ${idx + 1}. [${dp.entityType.toUpperCase()}] ${dp.driftType}`);
            console.log(`         Baseline: ${dp.baselineValue || 'N/A'}`);
            console.log(`         Current:  ${dp.currentValue || 'N/A'}`);
            console.log(`         Impact: ${dp.impact?.substring(0, 100)}...`);
          });
        }

        // Now save the drift record if drift was detected
        if (driftResult.hasDrift) {
          console.log(`\n   💾 Saving drift record to database...`);
          
          const driftRecord = await driftDetectionService.createDriftRecord({
            projectId,
            documentId: doc.id,
            baselineId: baselineResult.rows[0].id,
            driftPoints: driftResult.driftPoints,
            severity: driftResult.severity,
            triggeredBy: 'system-test'
          });
          
          console.log(`   ✅ Drift record saved!`);
          console.log(`      Record ID: ${driftRecord.id}`);
          console.log(`      Status: ${driftRecord.status}`);
          
          // Check for escalation
          if (driftRecord.drift_severity === 'critical' || driftRecord.drift_severity === 'high') {
            console.log(`   🚨 High severity - checking escalation...`);
            await driftDetectionService.checkAndTriggerEscalation(driftRecord, driftResult.driftPoints);
            console.log(`   ✅ Escalation check complete`);
          }
        }
        
      } catch (error: any) {
        console.error(`   ❌ Error: ${error.message}`);
        console.error(`   Stack: ${error.stack}`);
      }
      
      console.log('\n' + '-'.repeat(70));
    }

    console.log('\n' + '=' .repeat(70));
    console.log('\n✨ DRIFT DETECTION TEST COMPLETE!\n');

    // Show all drift records in database
    const allDrifts = await pool.query(`
      SELECT 
        id,
        detection_type,
        drift_severity,
        drift_description,
        status,
        detection_date
      FROM baseline_drift_detection
      WHERE project_id = $1
      ORDER BY detection_date DESC
      LIMIT 10
    `, [projectId]);

    console.log(`📊 Total Drift Records in Database: ${allDrifts.rows.length}\n`);
    
    if (allDrifts.rows.length > 0) {
      console.log('Recent drift records:');
      allDrifts.rows.forEach((drift, idx) => {
        const icon = drift.drift_severity === 'critical' ? '🔴' : 
                     drift.drift_severity === 'high' ? '🟠' :
                     drift.drift_severity === 'medium' ? '🟡' : '🟢';
        console.log(`\n${idx + 1}. ${icon} [${drift.drift_severity.toUpperCase()}] ${drift.detection_type}`);
        console.log(`   ${drift.drift_description?.substring(0, 100)}...`);
        console.log(`   Status: ${drift.status}`);
        console.log(`   Detected: ${drift.detection_date}`);
      });
    }

    console.log('\n');
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testStrategicDrift();

