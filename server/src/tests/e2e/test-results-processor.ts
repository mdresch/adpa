/**
 * Test Results Processor for E2E Tests
 * Processes and formats test results for reporting
 */

interface TestResult {
  numFailingTests: number
  numPassingTests: number
  numPendingTests: number
  numTodoTests: number
  testResults: Array<{
    assertionResults: Array<{
      ancestorTitles: string[]
      failureMessages: string[]
      fullName: string
      status: string
      title: string
    }>
    perfStats: {
      end: number
      start: number
    }
    testFilePath: string
    failureMessage?: string
  }>
}

interface ProcessedResult {
  summary: {
    total: number
    passed: number
    failed: number
    skipped: number
    duration: number
  }
  suites: Array<{
    name: string
    tests: Array<{
      name: string
      status: string
      duration: number
      failureMessage?: string
    }>
    summary: {
      total: number
      passed: number
      failed: number
      skipped: number
      duration: number
    }
  }>
  performance: {
    averageTestDuration: number
    slowestTest: {
      name: string
      duration: number
    }
    fastestTest: {
      name: string
      duration: number
    }
  }
  quality: {
    overallPassRate: number
    pipelineStagePassRates: Record<string, number>
    performanceBenchmarks: {
      withinThreshold: number
      total: number
    }
  }
}

export default function testResultsProcessor(results: TestResult): ProcessedResult {
  const totalDuration = results.testResults.reduce((sum, result) => {
    return sum + (result.perfStats.end - result.perfStats.start)
  }, 0)

  const summary = {
    total: results.numFailingTests + results.numPassingTests + results.numPendingTests + results.numTodoTests,
    passed: results.numPassingTests,
    failed: results.numFailingTests,
    skipped: results.numPendingTests + results.numTodoTests,
    duration: totalDuration
  }

  // Process test suites
  const suiteMap = new Map<string, any>()
  
  results.testResults.forEach(testResult => {
    const suiteName = testResult.testFilePath.split('/').pop()?.replace('.test.ts', '') || 'Unknown'
    
    if (!suiteMap.has(suiteName)) {
      suiteMap.set(suiteName, {
        name: suiteName,
        tests: [],
        summary: {
          total: 0,
          passed: 0,
          failed: 0,
          skipped: 0,
          duration: 0
        }
      })
    }
    
    const suite = suiteMap.get(suiteName)
    
    testResult.assertionResults.forEach(assertion => {
      const test = {
        name: assertion.fullName,
        status: assertion.status,
        duration: testResult.perfStats.end - testResult.perfStats.start,
        failureMessage: assertion.failureMessages[0]
      }
      
      suite.tests.push(test)
      suite.summary.total++
      
      if (assertion.status === 'passed') {
        suite.summary.passed++
      } else if (assertion.status === 'failed') {
        suite.summary.failed++
      } else {
        suite.summary.skipped++
      }
      
      suite.summary.duration += test.duration
    })
  })

  const suites = Array.from(suiteMap.values())

  // Calculate performance metrics
  const allTestDurations = results.testResults.map(r => r.perfStats.end - r.perfStats.start)
  const averageTestDuration = allTestDurations.reduce((sum, duration) => sum + duration, 0) / allTestDurations.length
  
  const slowestTest = results.testResults.reduce((slowest, current) => {
    const currentDuration = current.perfStats.end - current.perfStats.start
    const slowestDuration = slowest.perfStats.end - slowest.perfStats.start
    return currentDuration > slowestDuration ? current : slowest
  }, results.testResults[0])

  const fastestTest = results.testResults.reduce((fastest, current) => {
    const currentDuration = current.perfStats.end - current.perfStats.start
    const fastestDuration = fastest.perfStats.end - fastest.perfStats.start
    return currentDuration < fastestDuration ? current : fastest
  }, results.testResults[0])

  const performance = {
    averageTestDuration,
    slowestTest: {
      name: slowestTest.testFilePath,
      duration: slowestTest.perfStats.end - slowestTest.perfStats.start
    },
    fastestTest: {
      name: fastestTest.testFilePath,
      duration: fastestTest.perfStats.end - fastestTest.perfStats.start
    }
  }

  // Calculate quality metrics
  const overallPassRate = summary.passed / summary.total

  // Calculate pipeline stage pass rates
  const pipelineStagePassRates: Record<string, number> = {
    context_gathering: 0,
    template_processing: 0,
    ai_generation: 0,
    context_injection: 0,
    quality_assurance: 0,
    output_formatting: 0
  }

  suites.forEach(suite => {
    const stageTests = suite.tests.filter(test => 
      test.name.toLowerCase().includes('stage') ||
      test.name.toLowerCase().includes('pipeline')
    )
    
    if (stageTests.length > 0) {
      const passedStageTests = stageTests.filter(test => test.status === 'passed').length
      const passRate = passedStageTests / stageTests.length
      
      // Map suite name to pipeline stage
      const suiteName = suite.name.toLowerCase()
      if (suiteName.includes('context') && suiteName.includes('gathering')) {
        pipelineStagePassRates.context_gathering = passRate
      } else if (suiteName.includes('template')) {
        pipelineStagePassRates.template_processing = passRate
      } else if (suiteName.includes('ai') && suiteName.includes('generation')) {
        pipelineStagePassRates.ai_generation = passRate
      } else if (suiteName.includes('context') && suiteName.includes('injection')) {
        pipelineStagePassRates.context_injection = passRate
      } else if (suiteName.includes('quality')) {
        pipelineStagePassRates.quality_assurance = passRate
      } else if (suiteName.includes('output') || suiteName.includes('formatting')) {
        pipelineStagePassRates.output_formatting = passRate
      }
    }
  })

  // Calculate performance benchmarks
  const performanceTests = results.testResults.filter(result =>
    result.testFilePath.includes('performance') || 
    result.testFilePath.includes('stress')
  )

  const performanceBenchmarks = {
    withinThreshold: performanceTests.filter(test => {
      const duration = test.perfStats.end - test.perfStats.start
      return duration < 300000 // 5 minutes threshold
    }).length,
    total: performanceTests.length
  }

  const quality = {
    overallPassRate,
    pipelineStagePassRates,
    performanceBenchmarks
  }

  return {
    summary,
    suites,
    performance,
    quality
  }
}
