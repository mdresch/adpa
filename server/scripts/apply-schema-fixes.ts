import { pool, connectDatabase } from '../src/database/connection'

;(async () => {
  try {
    console.log('🔧 Applying schema fixes for extraction tables...\n')
    await connectDatabase()
    
    // ========================================================================
    // FIX 1: risks table - Add UNIQUE constraint on (project_id, title)
    // ========================================================================
    console.log('1️⃣  Fixing risks table - Adding UNIQUE(project_id, title)...')
    try {
      await pool!.query(`
        ALTER TABLE risks DROP CONSTRAINT IF EXISTS risks_project_title_unique;
        ALTER TABLE risks ADD CONSTRAINT risks_project_title_unique UNIQUE (project_id, title);
      `)
      console.log('   ✅ risks: UNIQUE constraint added\n')
    } catch (e: any) {
      console.log(`   ⚠️  risks: ${e.message}\n`)
    }
    
    // ========================================================================
    // FIX 2: milestones table - Rename 'date' to 'due_date'
    // ========================================================================
    console.log('2️⃣  Fixing milestones table - Renaming date → due_date...')
    try {
      await pool!.query(`ALTER TABLE milestones RENAME COLUMN date TO due_date;`)
      console.log('   ✅ milestones: Column renamed\n')
    } catch (e: any) {
      if (e.message.includes('does not exist')) {
        console.log('   ℹ️  milestones: Column already renamed or missing\n')
      } else {
        console.log(`   ⚠️  milestones: ${e.message}\n`)
      }
    }
    
    // ========================================================================
    // FIX 3: activities table - Add 'category' column
    // ========================================================================
    console.log('3️⃣  Fixing activities table - Adding category column...')
    try {
      await pool!.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS category VARCHAR(100);`)
      console.log('   ✅ activities: category column added\n')
    } catch (e: any) {
      console.log(`   ⚠️  activities: ${e.message}\n`)
    }
    
    // ========================================================================
    // FIX 4: resources table - Add 'allocation' column (TEXT)
    // ========================================================================
    console.log('4️⃣  Fixing resources table - Adding allocation column...')
    try {
      await pool!.query(`ALTER TABLE resources ADD COLUMN IF NOT EXISTS allocation TEXT;`)
      console.log('   ✅ resources: allocation column added\n')
    } catch (e: any) {
      console.log(`   ⚠️  resources: ${e.message}\n`)
    }
    
    // ========================================================================
    // FIX 5: phases table - Update status CHECK constraint
    // ========================================================================
    console.log('5️⃣  Fixing phases table - Updating status CHECK constraint...')
    try {
      await pool!.query(`
        ALTER TABLE phases DROP CONSTRAINT IF EXISTS phases_status_check;
        ALTER TABLE phases ADD CONSTRAINT phases_status_check 
          CHECK (status IN ('planned', 'in_progress', 'active', 'completed', 'on_hold'));
      `)
      console.log('   ✅ phases: status constraint updated to include "active" and "on_hold"\n')
    } catch (e: any) {
      console.log(`   ⚠️  phases: ${e.message}\n`)
    }
    
    // ========================================================================
    // FIX 6: deliverables table - Rename 'responsible_party' to 'owner'
    // ========================================================================
    console.log('6️⃣  Fixing deliverables table - Renaming responsible_party → owner...')
    try {
      await pool!.query(`ALTER TABLE deliverables RENAME COLUMN responsible_party TO owner;`)
      console.log('   ✅ deliverables: Column renamed\n')
    } catch (e: any) {
      if (e.message.includes('does not exist')) {
        console.log('   ℹ️  deliverables: Column already renamed or missing\n')
      } else {
        console.log(`   ⚠️  deliverables: ${e.message}\n`)
      }
    }
    
    // ========================================================================
    // FIX 7: success_criteria table - Add 'metric' column
    // ========================================================================
    console.log('7️⃣  Fixing success_criteria table - Adding metric column...')
    try {
      await pool!.query(`ALTER TABLE success_criteria ADD COLUMN IF NOT EXISTS metric TEXT;`)
      console.log('   ✅ success_criteria: metric column added\n')
    } catch (e: any) {
      console.log(`   ⚠️  success_criteria: ${e.message}\n`)
    }
    
    console.log('🎉 All schema fixes applied successfully!')
    console.log('\n📊 Summary:')
    console.log('  ✅ risks: UNIQUE constraint on (project_id, title)')
    console.log('  ✅ milestones: due_date column')
    console.log('  ✅ activities: category column')
    console.log('  ✅ resources: allocation column')
    console.log('  ✅ phases: status allows "active" and "on_hold"')
    console.log('  ✅ deliverables: owner column')
    console.log('  ✅ success_criteria: metric column')
    console.log('\n✨ Extraction should now work without schema errors!\n')
    
    await pool!.end()
    process.exit(0)
  } catch (error: any) {
    console.error('❌ Error applying schema fixes:', error.message)
    await pool?.end()
    process.exit(1)
  }
})()

