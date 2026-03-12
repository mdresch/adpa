#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
}

const checks = []

function check(name, condition, message) {
  checks.push({
    name,
    passed: condition,
    message: message || (condition ? 'OK' : 'FAILED'),
  })
}

function log(color, text) {
  console.log(`${color}${text}${colors.reset}`)
}

function fileExists(filePath, description) {
  const fullPath = path.join(__dirname, filePath)
  const exists = fs.existsSync(fullPath)
  check(
    `File: ${description}`,
    exists,
    exists ? `Found at ${filePath}` : `Missing: ${filePath}`
  )
  return exists
}

function fileContains(filePath, search, description) {
  const fullPath = path.join(__dirname, filePath)
  if (!fs.existsSync(fullPath)) {
    check(`Content: ${description}`, false, `File not found: ${filePath}`)
    return false
  }
  const content = fs.readFileSync(fullPath, 'utf-8')
  const contains = content.includes(search)
  check(
    `Content: ${description}`,
    contains,
    contains ? 'Found' : `Missing string: "${search}"`
  )
  return contains
}

function printResults() {
  console.log('\n')
  log(colors.blue, '╔════════════════════════════════════════════════════════════════╗')
  log(colors.blue, '║     STARTUP DEPENDENCY GRAPH VERIFICATION REPORT              ║')
  log(colors.blue, '╠════════════════════════════════════════════════════════════════╣')

  let passed = 0
  let failed = 0

  for (const check of checks) {
    const icon = check.passed ? '✅' : '❌'
    const color = check.passed ? colors.green : colors.red
    passed += check.passed ? 1 : 0
    failed += check.passed ? 0 : 1
    console.log(`║ ${icon} ${check.name.padEnd(50)} ║`)
    if (check.message !== 'OK') {
      log(color, `   └─ ${check.message}`)
    }
  }

  log(colors.blue, '╠════════════════════════════════════════════════════════════════╣')
  log(colors.blue, `║ Total: ${passed}/${checks.length} passed                ${' '.repeat(43 - String(passed).length - String(checks.length).length)}║`)
  log(colors.blue, '╚════════════════════════════════════════════════════════════════╝')

  return failed === 0
}

console.log('🔍 Verifying Startup Dependency Graph implementation...\n')

// Core files
log(colors.yellow, 'Core Implementation Files:')
fileExists('src/startup/dependencyGraph.ts', 'DependencyGraph')
fileExists('src/startup/startupManager.ts', 'StartupManager')
fileExists('src/startup/serverBootstrap.ts', 'Server Bootstrap')

// Dependency files
log(colors.yellow, '\nDependency Implementations:')
fileExists('src/startup/dependencies/index.ts', 'Dependencies barrel export')
fileExists('src/startup/dependencies/database.ts', 'Database dependency')
fileExists('src/startup/dependencies/redis.ts', 'Redis dependency')
fileExists('src/startup/dependencies/neo4j.ts', 'Neo4j dependency')
fileExists('src/startup/dependencies/rabbitmq.ts', 'RabbitMQ dependency')
fileExists('src/startup/dependencies/aiProviders.ts', 'AI Providers dependency')
fileExists('src/startup/dependencies/workers.ts', 'Workers dependency')

// Test files
log(colors.yellow, '\nTest Files:')
fileExists('__tests__/startup/dependencyGraph.test.ts', 'DependencyGraph tests')

// Documentation
log(colors.yellow, '\nDocumentation:')
fileExists('src/startup/README.md', 'Startup system README')
fileExists('DEPENDENCY_GRAPH_INTEGRATION.md', 'Integration guide')
fileExists('ISSUE_606_IMPLEMENTATION.md', 'Issue 606 summary')

// Content validation
log(colors.yellow, '\nContent Validation:')
fileContains(
  'src/startup/dependencyGraph.ts',
  'FAIL_FAST_MODE',
  'DependencyGraph supports fail-fast mode'
)
fileContains(
  'src/startup/dependencyGraph.ts',
  'getSummary',
  'DependencyGraph has summary method'
)
fileContains(
  'src/startup/startupManager.ts',
  'registerDependencies',
  'StartupManager registers dependencies'
)
fileContains(
  '__tests__/startup/dependencyGraph.test.ts',
  'describe',
  'Tests use Jest format'
)

// Final result
console.log()
const allPassed = printResults()

if (allPassed) {
  log(colors.green, '\n✅ All verifications passed! Ready for integration.\n')
  process.exit(0)
} else {
  log(colors.red, '\n❌ Some verifications failed. Please check the errors above.\n')
  process.exit(1)
}
