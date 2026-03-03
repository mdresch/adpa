#!/usr/bin/env ts-node
/**
 * Phase 3.1 Assisted Search - Interactive Test Script
 * 
 * Usage:
 *   npx ts-node scripts/test-phase-3-1-prompts.ts
 * 
 * Environment:
 *   ADPA_TOKEN=your-bearer-token (or set in .env)
 *   BACKEND_URL=http://localhost:3001 (default)
 */

import * as dotenv from 'dotenv'
import fetch from 'node-fetch'

dotenv.config()

const TOKEN = process.env.ADPA_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJseHpqYnhjenBtbWdpd2J0bWRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5MjIwMzAsImV4cCI6MjA3NjQ5ODAzMH0.2U4c5wrUBAD6BM8yRwJcS0MwgcSEVpzfS3gXUeVtNYM'
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000'

interface ContextAssemblyResponse {
  success: boolean
  query: string
  totalResults: number
  results: Array<{ id: string; type: string; title: string; relevance: number }>
  sources: Array<{ title: string; relevance: number; relationshipCount: number }>
  followUpSuggestions: Array<{ text: string; relatedEntity: string }>
  contextPrompt: string
}

interface AssistedSearchResponse extends ContextAssemblyResponse {
  answer?: string
  providerUsed?: string
  usage?: { inputTokens: number; outputTokens: number }
}

const SAMPLE_QUERIES = [
  // Strategic & Portfolio
  'What is our AI adoption strategy?',
  'Which portfolios have the highest risk?',
  'Show me all active transformation initiatives',
  
  // Risk & Governance
  'Summarize our key business risks',
  'What compliance issues need attention?',
  'How are our programs aligned with strategy?',
  
  // Dependencies & Impact
  'What are the dependencies between our major programs?',
  'Which projects are blocking other critical work?',
  'What is the impact of delaying this initiative?',
  
  // People & Skills
  'What skills do we need for our AI roadmap?',
  'Which roles have the highest vacancy rates?',
  'Show me teams working on digital transformation',
  
  // Recommendations
  'How should we prioritize our AI transformation roadmap?',
  'What is the recommended path for cloud migration?',
  'Which quick wins should we tackle first?'
]

async function testContextAssembly(query: string) {
  console.log(`\n📋 Context Assembly: "${query}"`)
  console.log('─'.repeat(60))
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/rag/context-assembly`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query,
        limit: 10,
        offset: 0,
        includeRelationships: true,
        relationshipDepth: 2
      })
    })

    if (!response.ok) {
      console.error(`❌ Error: ${response.status} ${response.statusText}`)
      const text = await response.text()
      console.error(text)
      return
    }

    const data = (await response.json()) as ContextAssemblyResponse

    if (!data.success) {
      console.error('❌ Request failed:', data)
      return
    }

    // Display results
    console.log(`✅ Found ${data.totalResults} results`)
    console.log(`\n📊 Top Sources:`)
    data.sources.slice(0, 3).forEach((source, i) => {
      console.log(
        `  ${i + 1}. ${source.title} (relevance: ${(source.relevance * 100).toFixed(0)}%, relationships: ${source.relationshipCount})`
      )
    })

    if (data.followUpSuggestions.length > 0) {
      console.log(`\n💡 Suggested Follow-ups:`)
      data.followUpSuggestions.slice(0, 2).forEach((suggestion) => {
        console.log(`  • ${suggestion.text} (${suggestion.relatedEntity})`)
      })
    }

    console.log(`\n📝 Context Prompt (first 300 chars):`)
    console.log(`  ${data.contextPrompt.substring(0, 300)}...`)

  } catch (error) {
    console.error('❌ Request failed:', error instanceof Error ? error.message : error)
  }
}

async function testAssistedSearchJson(query: string) {
  console.log(`\n✨ Assisted Search (JSON): "${query}"`)
  console.log('─'.repeat(60))
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/rag/assisted-search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query,
        limit: 8,
        offset: 0,
        includeAnswer: true,
        stream: false,
        includeRelationships: true,
        relationshipDepth: 2
      })
    })

    if (!response.ok) {
      console.error(`❌ Error: ${response.status} ${response.statusText}`)
      return
    }

    const data = (await response.json()) as AssistedSearchResponse

    console.log(`✅ Found ${data.totalResults} results`)
    console.log(`\n🤖 AI Answer (first 400 chars):`)
    const answer = data.answer || 'No answer generated'
    console.log(`  ${answer.substring(0, 400)}...`)

    if (data.usage) {
      console.log(`\n📈 Token Usage:`)
      console.log(`  Input: ${data.usage.inputTokens}, Output: ${data.usage.outputTokens}`)
    }

    if (data.providerUsed) {
      console.log(`  Provider: ${data.providerUsed}`)
    }

  } catch (error) {
    console.error('❌ Request failed:', error instanceof Error ? error.message : error)
  }
}

async function testAssistedSearchStream(query: string) {
  console.log(`\n⚡ Assisted Search (Streaming): "${query}"`)
  console.log('─'.repeat(60))
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/rag/assisted-search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query,
        limit: 8,
        offset: 0,
        includeAnswer: true,
        stream: true,
        includeRelationships: true,
        relationshipDepth: 2
      })
    })

    if (!response.ok) {
      console.error(`❌ Error: ${response.status} ${response.statusText}`)
      return
    }

    if (!response.body) {
      console.error('❌ No response body')
      return
    }

    console.log('📡 Streaming response:')
    console.log('  [Context] ')

    let tokenCount = 0
    let buffer = ''

    for await (const chunk of response.body as any) {
      const text = chunk.toString()
      buffer += text

      // Parse SSE events
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const event = JSON.parse(line.slice(6))

            if (event.type === 'context') {
              console.log(`  ✓ Context: ${event.totalResults} results, ${event.sources?.length || 0} sources`)
            } else if (event.type === 'token') {
              process.stdout.write(event.content)
              tokenCount++
            } else if (event.type === 'done') {
              console.log(`\n  ✓ Done (${tokenCount} tokens, ${event.usage?.outputTokens} total output tokens)`)
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Request failed:', error instanceof Error ? error.message : error)
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗')
  console.log('║  Phase 3.1 Assisted Search - Test Harness               ║')
  console.log('╚══════════════════════════════════════════════════════════╝')
  
  console.log(`\n🔧 Configuration:`)
  console.log(`  Backend URL: ${BACKEND_URL}`)
  console.log(`  Token: ${TOKEN.substring(0, 20)}...`)
  
  // Verify connection
  try {
    const healthCheck = await fetch(`${BACKEND_URL}/health`, {
      method: 'GET'
    }).catch(() => null)
    
    if (!healthCheck?.ok) {
      console.error('\n⚠️  Backend server may not be running.')
      console.error(`   Make sure: cd server && npm run dev`)
      process.exit(1)
    }
  } catch (e) {
    console.error('\n⚠️  Could not connect to backend:', e instanceof Error ? e.message : e)
    process.exit(1)
  }

  console.log('\n✅ Backend connection OK')

  // Run sample queries
  const testQueries = SAMPLE_QUERIES.slice(0, 3) // First 3 for quick demo

  console.log(`\n📚 Running ${testQueries.length} sample queries...\n`)

  // Test context assembly on first query
  await testContextAssembly(testQueries[0])

  // Test JSON mode on second query
  await testAssistedSearchJson(testQueries[1])

  // Test streaming mode on third query
  await testAssistedSearchStream(testQueries[2])

  console.log('\n' + '═'.repeat(60))
  console.log('✅ All tests completed!')
  console.log('\n💡 Pro Tips:')
  console.log('  • Run with different queries to test graph enrichment')
  console.log('  • Check server logs for [RAG], [AISearch] debug output')
  console.log('  • Context assembly typically takes 300-500ms')
  console.log('  • Full assisted search (AI generation) takes 1-3s')
  console.log('  • Streaming allows users to see tokens arrive in real-time')
  console.log('')
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
