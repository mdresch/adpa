/**
 * Dead-Letter Debug CLI
 * 
 * Quick tool to inspect extraction failures from the command line.
 * 
 * Usage:
 *   npx ts-node server/src/debug/dead-letter-cli.ts list <projectId>
 *   npx ts-node server/src/debug/dead-letter-cli.ts show <failureId>
 *   npx ts-node server/src/debug/dead-letter-cli.ts correlation <correlationId>
 *   npx ts-node server/src/debug/dead-letter-cli.ts stats <projectId>
 */

import { connectDatabase } from '../database/connection'
import { deadLetterService } from '../services/extraction/DeadLetterService'
import { logger } from '../utils/logger'

const command = process.argv[2]
const arg1 = process.argv[3]
const arg2 = process.argv[4]

async function main() {
  try {
    await connectDatabase()

    if (!command) {
      console.log(`
Dead-Letter CLI - Extraction Failure Inspector

Usage:
  list <projectId>           - List all pending failures for a project
  show <failureId>           - Show details of a specific failure
  correlation <correlationId> - Show all failures for a correlation ID
  stats <projectId>          - Show failure statistics by entity type
  resolve <failureId>        - Mark a failure as resolved

Examples:
  npx ts-node server/src/debug/dead-letter-cli.ts list 123e4567-e89b-12d3-a456-426614174000
  npx ts-node server/src/debug/dead-letter-cli.ts show 223e4567-e89b-12d3-a456-426614174000
  npx ts-node server/src/debug/dead-letter-cli.ts correlation abc123
  npx ts-node server/src/debug/dead-letter-cli.ts stats 123e4567-e89b-12d3-a456-426614174000
      `)
      process.exit(0)
    }

    switch (command.toLowerCase()) {
      case 'list':
        if (!arg1) {
          console.error('❌ projectId required: list <projectId>')
          process.exit(1)
        }
        await listFailures(arg1)
        break

      case 'show':
        if (!arg1) {
          console.error('❌ failureId required: show <failureId>')
          process.exit(1)
        }
        await showFailure(arg1)
        break

      case 'correlation':
        if (!arg1) {
          console.error('❌ correlationId required: correlation <correlationId>')
          process.exit(1)
        }
        await showByCorrelation(arg1)
        break

      case 'stats':
        if (!arg1) {
          console.error('❌ projectId required: stats <projectId>')
          process.exit(1)
        }
        await showStats(arg1)
        break

      case 'resolve':
        if (!arg1) {
          console.error('❌ failureId required: resolve <failureId>')
          process.exit(1)
        }
        await resolveFailure(arg1, arg2)
        break

      default:
        console.error(`❌ Unknown command: ${command}`)
        process.exit(1)
    }

    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

async function listFailures(projectId: string) {
  console.log(`\n📋 Pending failures for project ${projectId}:\n`)

  const failures = await deadLetterService.getPendingFailures(projectId)

  if (failures.length === 0) {
    console.log('✅ No pending failures!')
    return
  }

  failures.forEach((f, idx) => {
    console.log(`[${idx + 1}] ${f.entityType}`)
    console.log(`    ID: ${f.id}`)
    console.log(`    Error: ${f.errorMessage.substring(0, 100)}...`)
    console.log(`    Correlation: ${f.correlationId || 'N/A'}`)
    console.log(`    Retries: ${f.retryCount}`)
    console.log(`    Status: ${f.status}`)
    console.log(`    Created: ${f.resolvedAt || f.createdAt}`)
    console.log()
  })
}

async function showFailure(failureId: string) {
  console.log(`\n📄 Failure details:\n`)

  const failures = await deadLetterService.getFailuresByCorrelationId(failureId)
  
  // Note: ideally we'd query by ID directly, but using correlation for now
  const failure = failures[0]

  if (!failure) {
    console.log('❌ Failure not found')
    return
  }

  console.log(`ID: ${failure.id}`)
  console.log(`Project: ${failure.projectId}`)
  console.log(`Entity Type: ${failure.entityType}`)
  console.log(`Status: ${failure.status}`)
  console.log(`Retry Count: ${failure.retryCount}`)
  console.log(`Correlation ID: ${failure.correlationId}`)
  console.log(`\nError Message:\n${failure.errorMessage}\n`)

  if (failure.stackTrace) {
    console.log(`Stack Trace:\n${JSON.stringify(failure.stackTrace, null, 2)}\n`)
  }

  if (failure.aiResponseRaw) {
    console.log(`AI Response:\n${failure.aiResponseRaw.substring(0, 500)}...\n`)
  }

  if (failure.resolutionNotes) {
    console.log(`Resolution Notes: ${failure.resolutionNotes}\n`)
  }
}

async function showByCorrelation(correlationId: string) {
  console.log(`\n🔗 Failures for correlation ${correlationId}:\n`)

  const failures = await deadLetterService.getFailuresByCorrelationId(correlationId)

  if (failures.length === 0) {
    console.log('✅ No failures for this correlation ID')
    return
  }

  failures.forEach((f, idx) => {
    console.log(`[${idx + 1}] ${f.entityType} - ${f.status.toUpperCase()}`)
    console.log(`    Error: ${f.errorMessage.substring(0, 80)}`)
    console.log()
  })
}

async function showStats(projectId: string) {
  console.log(`\n📊 Failure statistics for project ${projectId}:\n`)

  const stats = await deadLetterService.getFailureStats(projectId)

  if (Object.keys(stats).length === 0) {
    console.log('✅ No failures!')
    return
  }

  let total = 0
  Object.entries(stats).forEach(([entityType, count]) => {
    console.log(`  ${entityType}: ${count}`)
    total += count
  })

  console.log(`\nTotal pending failures: ${total}\n`)
}

async function resolveFailure(failureId: string, notes?: string) {
  console.log(`\n✅ Marking failure ${failureId} as resolved...\n`)

  try {
    await deadLetterService.markResolved(failureId, notes)
    console.log('✅ Failure resolved successfully')
  } catch (error) {
    console.error('❌ Failed to resolve:', error instanceof Error ? error.message : String(error))
  }
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
