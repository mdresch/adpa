/**
 * AI Provider & Model Checker and Fixer
 * 
 * This script:
 * 1. Checks all AI providers in the database
 * 2. Validates models for each provider
 * 3. Updates missing models based on provider type
 * 4. Tests metrics tracking
 * 5. Reports on provider health and configuration
 * 
 * Usage: npm run check:ai-providers
 */

import * as dotenv from 'dotenv'
import { AIService } from '../src/services/aiService'
import AnalyticsTrackingService from '../src/services/analyticsTrackingService'
import { connectDatabase } from '../src/database/connection'
const dbModule = require('../src/lib/db')
const db = dbModule.default || dbModule

dotenv.config()

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL or POSTGRES_URL environment variable is required')
  process.exit(1)
}

// Use shared DB wrapper for script

interface ProviderInfo {
  id: string
  name: string
  type: string
  is_active: boolean
  priority: number
  default_model: string | null
  available_models: string[] | null
  has_api_key: boolean
  usage_stats: any
}

async function checkProviders(): Promise<ProviderInfo[]> {
  console.log('🔍 Checking AI providers...')
  console.log('')

  const result = await db.query(`
    SELECT 
      id, name, provider_type, is_active, priority,
      default_model, available_models, 
      CASE WHEN api_key_encrypted IS NOT NULL AND api_key_encrypted != '' THEN true ELSE false END as has_api_key,
      usage_stats
    FROM ai_providers
    ORDER BY priority, name
  `)

  return result.rows.map(row => ({
    id: row.id,
    name: row.name,
    type: row.provider_type,
    is_active: row.is_active,
    priority: row.priority,
    default_model: row.default_model,
    available_models: row.available_models || null,
    has_api_key: row.has_api_key,
    usage_stats: row.usage_stats || {}
  }))
}

async function fixProviderModels(provider: ProviderInfo, aiService: AIService): Promise<void> {
  const expectedModels = aiService.getModelsForProvider(provider.type)
  
  if (!expectedModels || expectedModels.length === 0) {
    console.log(`  ⚠️  No default models defined for provider type: ${provider.type}`)
    return
  }

  // Check if models need updating
  const currentModels = provider.available_models || []
  const missingModels = expectedModels.filter(m => !currentModels.includes(m))
  const extraModels = currentModels.filter(m => !expectedModels.includes(m))

  if (missingModels.length > 0 || extraModels.length > 0) {
    console.log(`  🔧 Updating models for ${provider.name}...`)
    
    // Update with expected models (merge with existing if they're valid)
    const validExtraModels = extraModels.filter(m => {
      // Keep models that might be valid but not in default list
      return m && m.trim().length > 0
    })
    
    const updatedModels = [...expectedModels, ...validExtraModels]
    
    await db.query(
      `UPDATE ai_providers 
       SET available_models = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [JSON.stringify(updatedModels), provider.id]
    )
    
    console.log(`    ✅ Updated: ${updatedModels.length} models`)
    if (missingModels.length > 0) {
      console.log(`    ➕ Added: ${missingModels.join(', ')}`)
    }
  }

  // Set default_model if missing
  if (!provider.default_model && expectedModels.length > 0) {
    await db.query(
      `UPDATE ai_providers 
       SET default_model = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [expectedModels[0], provider.id]
    )
    console.log(`    ✅ Set default model: ${expectedModels[0]}`)
  }
}

async function testMetricsTracking(provider: ProviderInfo): Promise<void> {
  console.log(`  🧪 Testing metrics tracking for ${provider.name}...`)
  
  try {
    const testUsage = {
      prompt_tokens: 100,
      completion_tokens: 50,
      total_tokens: 150
    }

    await AnalyticsTrackingService.trackAIUsage({
      providerId: provider.id,
      providerType: provider.type,
      modelName: provider.default_model || 'test-model',
      requestType: 'text_generation',
      inputTokens: testUsage.prompt_tokens,
      outputTokens: testUsage.completion_tokens,
      totalTokens: testUsage.total_tokens,
      responseTimeMs: 1200,
      success: true,
    })

    // Verify it was tracked
    const result = await db.query(
      `SELECT id, total_tokens, response_time_ms, success
       FROM ai_usage_logs 
       WHERE provider_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [provider.id]
    )

    if (result.rows.length > 0) {
      console.log(`    ✅ Metrics tracked successfully`)
      console.log(`       Tokens: ${result.rows[0].total_tokens}, Time: ${result.rows[0].response_time_ms}ms`)
    } else {
      console.log(`    ⚠️  Metrics tracking may have failed (no record found)`)
    }
  } catch (error: any) {
    console.log(`    ❌ Metrics tracking failed: ${error.message}`)
  }
}

async function testErrorTracking(provider: ProviderInfo): Promise<void> {
  console.log(`  🧪 Testing error tracking for ${provider.name}...`)
  
  try {
    const errorTypes = [
      { message: 'Rate limit exceeded', code: 429 },
      { message: 'Insufficient funds', code: 402 },
      { message: 'Service unavailable', code: 503 },
    ]

    for (const error of errorTypes) {
      await AnalyticsTrackingService.trackAIUsage({
        providerId: provider.id,
        providerType: provider.type,
        modelName: provider.default_model || 'test-model',
        requestType: 'text_generation',
        inputTokens: 100,
        outputTokens: 0,
        totalTokens: 100,
        responseTimeMs: 500,
        success: false,
        errorMessage: error.message,
        statusCode: error.code,
      })
    }

    const result = await db.query(
      `SELECT COUNT(*) as count, 
              COUNT(CASE WHEN success = false THEN 1 END) as errors
       FROM ai_usage_logs 
       WHERE provider_id = $1 AND success = false`,
      [provider.id]
    )

    const errorCount = parseInt(result.rows[0]?.errors || '0')
    if (errorCount >= errorTypes.length) {
      console.log(`    ✅ Error tracking working (${errorCount} errors tracked)`)
    } else {
      console.log(`    ⚠️  Expected ${errorTypes.length} errors, found ${errorCount}`)
    }
  } catch (error: any) {
    console.log(`    ❌ Error tracking test failed: ${error.message}`)
  }
}

async function testCostCalculation(provider: ProviderInfo): Promise<void> {
  console.log(`  🧪 Testing cost calculation for ${provider.name}...`)
  
  try {
    const testCases = [
      { input: 1000, output: 500 },
      { input: 5000, output: 2000 },
      { input: 10000, output: 5000 },
    ]

    for (const testCase of testCases) {
      const cost = AnalyticsTrackingService.calculateAICost(
        provider.type,
        provider.default_model || 'test-model',
        testCase.input,
        testCase.output
      )

      if (cost >= 0) {
        console.log(`    ✅ Cost calculated: $${cost.toFixed(6)} for ${testCase.input + testCase.output} tokens`)
      } else {
        console.log(`    ⚠️  Invalid cost: $${cost}`)
      }
    }
  } catch (error: any) {
    console.log(`    ❌ Cost calculation test failed: ${error.message}`)
  }
}

async function getProviderHealthMetrics(provider: ProviderInfo): Promise<any> {
  const result = await db.query(
    `SELECT 
       COUNT(*) as total_requests,
       SUM(CASE WHEN success = true THEN 1 ELSE 0 END) as successful,
       SUM(CASE WHEN success = false THEN 1 ELSE 0 END) as failed,
       AVG(response_time_ms) as avg_response_time,
       SUM(total_tokens) as total_tokens,
       SUM(estimated_cost) as total_cost
     FROM ai_usage_logs 
     WHERE provider_id = $1
     AND created_at > NOW() - INTERVAL '30 days'`,
    [provider.id]
  )

  return result.rows[0] || {
    total_requests: 0,
    successful: 0,
    failed: 0,
    avg_response_time: null,
    total_tokens: 0,
    total_cost: 0
  }
}

async function main() {
  console.log('🔧 AI Provider & Model Checker and Fixer')
  console.log('━'.repeat(60))
  console.log('')

  try {
    // Initialize database connection for analytics service
    try {
      await connectDatabase()
      console.log('✅ Database connection initialized for analytics service')
    } catch (error: any) {
      console.warn('⚠️  Could not initialize analytics database connection:', error.message)
      console.warn('   Analytics tracking tests will be skipped')
    }

    await db.initDb()
    console.log('✅ Connected to database (via shared DB wrapper)')
    console.log('')

    try {
      const aiService = new AIService()
      // Note: aiService.initializeProviders() may fail if pool is null, but that's okay
      try {
        await aiService.initializeProviders()
      } catch (error: any) {
        console.warn('⚠️  Could not initialize AI service providers:', error.message)
        console.warn('   Continuing with provider checks...')
      }

      // Check all providers
      const providers = await checkProviders()

      if (providers.length === 0) {
        console.log('⚠️  No AI providers found in database')
        console.log('   Create providers via the UI or API first')
        return
      }

      console.log(`📊 Found ${providers.length} AI provider(s)`)
      console.log('')

      let fixedCount = 0
      let testedCount = 0

      for (const provider of providers) {
        console.log(`📋 Provider: ${provider.name}`)
        console.log(`   Type: ${provider.type}`)
        console.log(`   Status: ${provider.is_active ? '✅ Active' : '❌ Inactive'}`)
        console.log(`   Priority: ${provider.priority}`)
        console.log(`   API Key: ${provider.has_api_key ? '✅ Configured' : '❌ Missing'}`)
        console.log(`   Default Model: ${provider.default_model || '❌ Not set'}`)
        console.log(`   Available Models: ${provider.available_models?.length || 0}`)
        
        if (provider.available_models && provider.available_models.length > 0) {
          console.log(`     ${provider.available_models.slice(0, 5).join(', ')}${provider.available_models.length > 5 ? '...' : ''}`)
        }

        // Get health metrics
        const health = await getProviderHealthMetrics(provider)
        if (parseInt(health.total_requests) > 0) {
          const successRate = (parseInt(health.successful) / parseInt(health.total_requests)) * 100
          console.log(`   📈 Health (30 days):`)
          console.log(`      Requests: ${health.total_requests}`)
          console.log(`      Success Rate: ${successRate.toFixed(1)}%`)
          console.log(`      Avg Response: ${health.avg_response_time ? `${parseInt(health.avg_response_time)}ms` : 'N/A'}`)
          console.log(`      Total Tokens: ${parseInt(health.total_tokens).toLocaleString()}`)
          console.log(`      Total Cost: $${parseFloat(health.total_cost || 0).toFixed(4)}`)
        }

        console.log('')

        // Fix models if needed
        if (provider.is_active && provider.has_api_key) {
          await fixProviderModels(provider, aiService)
          fixedCount++

          // Test metrics tracking
          await testMetricsTracking(provider)
          await testErrorTracking(provider)
          await testCostCalculation(provider)
          testedCount++
        } else {
          console.log(`  ⏭️  Skipping fixes (inactive or missing API key)`)
        }

        console.log('')
      }

      console.log('━'.repeat(60))
      console.log(`✅ Check complete!`)
      console.log(`   Providers checked: ${providers.length}`)
      console.log(`   Providers fixed: ${fixedCount}`)
      console.log(`   Providers tested: ${testedCount}`)
      console.log('')

      // Summary of active providers
      const activeProviders = providers.filter(p => p.is_active && p.has_api_key)
      console.log('📊 Active Providers Summary:')
      console.log('─'.repeat(60))
      if (activeProviders.length === 0) {
        console.log('   ⚠️  No active providers with API keys configured')
      } else {
        activeProviders.forEach(p => {
          console.log(`   ✅ ${p.name} (${p.type}) - ${p.available_models?.length || 0} models`)
        })
      }

    } finally {
      // nothing to release from db wrapper; connection pool managed centrally
    }

  } catch (error: any) {
    console.error('')
    console.error('❌ Error:', error.message)
    console.error('')
    process.exit(1)
  } finally {
    await db.end()
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error)
  process.exit(1)
})

