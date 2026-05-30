import db from '../src/lib/db';

async function run() {
    await db.initDb();
    const auditId = '28883a1b-3ff5-483e-85fb-9c3d5a33c53e';
    
    // 1. Reset Audit Record
    await db.query('UPDATE governance_audit_ledger SET decision_status = \'PENDING\', reviewed_by = NULL, resolved_at = NULL WHERE audit_id = $1', [auditId]);
    
    // 2. Reset Policy Status
    await db.query('UPDATE policy_library SET control_effectiveness_status = \'INEFFECTIVE\' WHERE rule_code = \'GOV-SEC-001\'');
    
    console.log(`🔄 RESET COMPLETE: GOV-SEC-001 is now INEFFECTIVE and Audit ${auditId} is PENDING.`);
    
    await db.end();
}

run();
