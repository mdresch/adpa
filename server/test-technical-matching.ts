import { findMatchingPlaybooks } from './src/services/playbookService'
import { connectDatabase } from './src/database/connection'

async function testTechnicalCritical() {
  console.log('🧪 Testing playbook matching for technical/critical issue...')
  
  try {
    await connectDatabase()
    console.log('✅ Database connected')
    
    // Test with the exact values from the escalated issue
    const playbooks = await findMatchingPlaybooks({
      project_id: '34f34700-32ba-4dfc-915e-3522c7f93534', // ADPA Digital Twins project
      risk_category: 'technical',
      priority_level: 'critical'
    })
    
    console.log(`\n📊 Results: Found ${playbooks.length} matching playbooks`)
    
    if (playbooks.length > 0) {
      console.log('\n🎯 Top Playbooks:')
      playbooks.forEach((playbook, index) => {
        console.log(`${index + 1}. ${playbook.title}`)
        console.log(`   Category: ${playbook.category}`)
        console.log(`   Risk Categories: ${JSON.stringify(playbook.applicable_risk_categories)}`)
        console.log(`   Severity Levels: ${JSON.stringify(playbook.applicable_severity_levels)}`)
        console.log(`   Priority Levels: ${JSON.stringify(playbook.applicable_priority_levels)}`)
        console.log('')
      })
    } else {
      console.log('❌ No matching playbooks found!')
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
  
  process.exit(0)
}

testTechnicalCritical()
