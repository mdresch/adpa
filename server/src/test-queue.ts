/**
 * Simple RabbitMQ Queue Test
 * Run with: npx ts-node -r tsconfig-paths/register src/test-queue.ts
 */

import { createRabbitConnection, RabbitQueueAdapter } from './services/jobs/queue/RabbitQueueAdapter'
import { logger } from './utils/logger'

const RABBIT_URL = process.env.RABBITMQ_URL || 'amqp://localhost'
const TEST_QUEUE = 'test-queue'

async function testQueue() {
  console.log('🧪 Starting RabbitMQ Queue Test...\n')
  
  try {
    // Step 1: Create connection
    console.log('📡 Connecting to RabbitMQ:', RABBIT_URL)
    const connection = createRabbitConnection(RABBIT_URL)
    
    // Step 2: Create test queue
    console.log('📦 Creating test queue:', TEST_QUEUE)
    const queue = new RabbitQueueAdapter({
      connection,
      queueName: TEST_QUEUE,
      prefetch: 1,
      defaultAttempts: 3,
      defaultBackoffMs: 1000
    })

    // Step 3: Set up processor
    let jobProcessed = false
    let receivedData: any = null

    console.log('👷 Setting up job processor...')
    queue.process('test-job', 1, async (job) => {
      console.log(`\n✅ Job received! ID: ${job.id}`)
      console.log('📄 Job data:', JSON.stringify(job.data, null, 2))
      receivedData = job.data
      jobProcessed = true
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 500))
      
      return { success: true, processedAt: new Date().toISOString() }
    })

    // Wait for queue to be ready
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Step 4: Add a test job
    const testJobData = {
      type: 'test-job',
      message: 'Hello from RabbitMQ!',
      timestamp: new Date().toISOString(),
      testId: Math.random().toString(36).substring(7)
    }

    console.log('\n📤 Adding test job to queue...')
    const job = await queue.add('test-job', testJobData)
    console.log('✅ Job added with ID:', job.id)

    // Step 5: Wait for processing
    console.log('\n⏳ Waiting for job to be processed...')
    const timeout = 10000 // 10 seconds
    const startTime = Date.now()
    
    while (!jobProcessed && (Date.now() - startTime) < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Step 6: Check results
    console.log('\n📊 Test Results:')
    console.log('─'.repeat(50))
    
    if (jobProcessed) {
      console.log('✅ SUCCESS: Job was processed!')
      console.log('📨 Sent data:', JSON.stringify(testJobData, null, 2))
      console.log('📬 Received data:', JSON.stringify(receivedData, null, 2))
      
      if (JSON.stringify(testJobData) === JSON.stringify(receivedData)) {
        console.log('✅ Data integrity: PASSED')
      } else {
        console.log('❌ Data integrity: FAILED (data mismatch)')
      }
    } else {
      console.log('❌ FAILED: Job was not processed within timeout')
    }

    // Step 7: Get queue info
    console.log('\n📈 Queue Information:')
    const info = await queue.getInfo()
    console.log('Queue details:', JSON.stringify(info, null, 2))

    // Cleanup
    console.log('\n🧹 Cleaning up...')
    await queue.close()
    await connection.close()
    
    console.log('\n✨ Test completed!')
    process.exit(jobProcessed ? 0 : 1)

  } catch (error: any) {
    console.error('\n❌ Test failed with error:')
    console.error(error.message)
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Tip: Make sure RabbitMQ is running on:', RABBIT_URL)
      console.error('   You can start it with: docker run -d -p 5672:5672 -p 15672:15672 rabbitmq:management')
    }
    
    process.exit(1)
  }
}

// Run the test
testQueue()
