/**
 * Validate the migration was successful
 */
async function validateMigration() {
  try {
    logger.info('Validating migration...');
    
    // 1. Check if all tables were created
    const requiredTables = [
      'users', 'projects', 'documents', 'templates', 'ai_providers', 
      'jobs', 'integrations', 'security_events', 'audit_logs', 
      'analytics_events', 'integration_sync_metadata', 'migrations'
    ];
    
    const tablesResult = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    const existingTables = tablesResult.rows.map(row => row.table_name);
    
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length > 0) {
      throw new Error(`Missing tables: ${missingTables.join(', ')}`);
    }
    
    // 2. Check if indexes were created
    const indexesResult = await sql`
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public'
    `;
    
    const requiredIndexes = [
      'idx_projects_owner',
      'idx_documents_project',
      'idx_jobs_status'
    ];
    
    const existingIndexes = indexesResult.rows.map(row => row.indexname);
    
    const missingIndexes = requiredIndexes.filter(index => !existingIndexes.some(i => i.includes(index)));
    
    if (missingIndexes.length > 0) {
      logger.warn(`Some indexes may be missing: ${missingIndexes.join(', ')}`);
    }
    
    // 3. Check if seed data was inserted
    const usersResult = await sql`SELECT COUNT(*) as count FROM users`;
    if (usersResult.rows[0].count < 3) {
      throw new Error('Seed data validation failed: Missing user records');
    }
    
    // 4. Check if functions/triggers were created
    const triggersResult = await sql`
      SELECT trigger_name 
      FROM information_schema.triggers 
      WHERE trigger_schema = 'public'
    `;
    
    const requiredTriggers = [
      'update_users_updated_at',
      'update_projects_updated_at',
      'update_documents_updated_at'
    ];
    
    const existingTriggers = triggersResult.rows.map(row => row.trigger_name);
    
    const missingTriggers = requiredTriggers.filter(trigger => !existingTriggers.includes(trigger));
    
    if (missingTriggers.length > 0) {
      logger.warn(`Some triggers may be missing: ${missingTriggers.join(', ')}`);
    }
    
    logger.success('Migration validation completed successfully');
  } catch (error) {
    logger.error('Migration validation failed:', error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateToVercel()
    .then(() => {
      logger.success('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration failed:', error);
      
      // Ask if user wants to rollback
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      readline.question('Do you want to rollback the migration? (y/n) ', async (answer) => {
        if (answer.toLowerCase() === 'y') {
          try {
            await rollbackMigration();
            logger.success('Rollback completed');
          } catch (rollbackError) {
            logger.error('Rollback failed:', rollbackError);
          }
        }
        
        readline.close();
        process.exit(1);
      });
    });
}