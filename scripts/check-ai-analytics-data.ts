/**
 * AI Analytics Data Health Check
 * 
 * Checks if AI usage analytics data is being collected and stored.
 * Run this to diagnose why analytics might show demo data.
 */

import { pool } from '../server/src/database/connection'

async function checkAIAnalyticsData() {
  console.log('🔍 AI Analytics Data Health Check\n')
  console.log('=' .repeat(60))
  
  try {
    // 1. Check AI providers configured
    console.log('\n1️⃣  Checking AI Providers...')
    const providers = await pool.query(`
      SELECT id, name, provider_type, enabled, api_key_hash IS NOT NULL as has_key
      FROM ai_providers
      ORDER BY priority
    `)
    
    console.log(`   Found ${providers.rows.length} AI providers:`)
    providers.rows.forEach(p => {
      const status = p.enabled ? '✅ Enabled' : '❌ Disabled'
      const key = p.has_key ? '🔑 Has key' : '⚠️  No key'
      console.log(`   - ${p.name} (${p.provider_type}): ${status}, ${key}`)
    })
    
    if (providers.rows.filter(p => p.enabled && p.has_key).length === 0) {
      console.log('\n   ⚠️  WARNING: No providers have API keys configured!')
      console.log('   → Add API keys in server/.env to enable AI usage')
    }
    
    // 2. Check audit_logs for AI usage
    console.log('\n2️⃣  Checking Audit Logs (AI Generation)...')
    const auditLogs = await pool.query(`
      SELECT COUNT(*) as count
      FROM audit_logs
      WHERE action = 'ai_generate'
    `)
    
    console.log(`   AI generation audit logs: ${auditLogs.rows[0].count}`)
    
    if (auditLogs.rows[0].count === 0) {
      console.log('   ⚠️  No AI generation requests logged yet')
      console.log('   → Generate a document with AI to create usage data')
    } else {
      // Show breakdown by provider
      const breakdown = await pool.query(`
        SELECT 
          ap.name as provider,
          COUNT(*) as requests,
          MAX(al.created_at) as last_used
        FROM audit_logs al
        JOIN ai_providers ap ON al.resource_id::uuid = ap.id
        WHERE al.action = 'ai_generate'
        GROUP BY ap.name
        ORDER BY requests DESC
      `)
      
      console.log('\n   Usage breakdown:')
      breakdown.rows.forEach(row => {
        console.log(`   - ${row.provider}: ${row.requests} requests (last used: ${row.last_used})`)
      })
    }
    
    // 3. Check if ai_usage_logs table exists
    console.log('\n3️⃣  Checking ai_usage_logs Table...')
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'ai_usage_logs'
      )
    `)
    
    if (tableExists.rows[0].exists) {
      const usageLogs = await pool.query('SELECT COUNT(*) as count FROM ai_usage_logs')
      console.log(`   ✅ Table exists with ${usageLogs.rows[0].count} records`)
      
      if (usageLogs.rows[0].count === 0) {
        console.log('   ⚠️  Table is empty - no usage tracked yet')
      }
    } else {
      console.log('   ❌ Table does not exist')
      console.log('   → May need to run migration to create ai_usage_logs table')
    }
    
    // 4. Check recent document generations
    console.log('\n4️⃣  Checking Recent Document Generations...')
    const recentDocs = await pool.query(`
      SELECT COUNT(*) as count
      FROM documents
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `)
    
    console.log(`   Documents created in last 30 days: ${recentDocs.rows[0].count}`)
    
    // 5. Summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 Summary:')
    console.log('=' .repeat(60))
    
    const hasKeys = providers.rows.filter(p => p.enabled && p.has_key).length > 0
    const hasUsage = auditLogs.rows[0].count > 0
    const hasTable = tableExists.rows[0].exists
    
    if (!hasKeys) {
      console.log('\n🔴 Issue: No AI provider API keys configured')
      console.log('   Fix: Add API keys to server/.env:')
      console.log('   OPENAI_API_KEY=sk-...')
      console.log('   GOOGLE_AI_API_KEY=...')
    }
    
    if (!hasUsage) {
      console.log('\n🟡 Issue: No AI usage data collected yet')
      console.log('   Fix: Generate documents with AI to create usage data')
    }
    
    if (!hasTable) {
      console.log('\n🟡 Issue: ai_usage_logs table not found')
      console.log('   Fix: Run migration or system uses audit_logs instead')
    }
    
    if (hasKeys && hasUsage) {
      console.log('\n✅ All good! Analytics should display real data')
      console.log('   Check: http://localhost:3001/ai-analytics')
    }
    
    console.log('\n')
    
  } catch (error) {
    console.error('❌ Error checking analytics data:', error)
  } finally {
    await pool.end()
  }
}

checkAIAnalyticsData()

