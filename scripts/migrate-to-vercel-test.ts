import { migrateToVercel, rollbackMigration } from './migrate-to-vercel-final';

/**
 * Test migration script
 */
async function testMigration() {
  try {
    console.log('🧪 Testing migration script...');
    
    // Test migration
    await migrateToVercel();
    
    console.log('✅ Migration test successful!');
    
    // Test rollback
    console.log('🧪 Testing rollback...');
    await rollbackMigration();
    
    console.log('✅ Rollback test successful!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testMigration();
}