import { mockDeep } from "jest-mock-extended"
import { createMockQueueService } from "../../services/jobs/queue/QueueServiceFactory"
import { QueueService } from "../../services/jobs/queue/QueueService"
import { IQueue } from "../../services/jobs/queue/IQueue"

/**
 * Mock Job Queue Double
 * 
 * Provides a mockable Job Queue service for testing.
 * Uses the existing QueueServiceFactory to ensure compatibility with the system.
 */
export class MockJobQueue {
  public service: QueueService
  public mockDependencies: any

  constructor() {
    this.mockDependencies = {
      database: {
        query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
        connect: jest.fn(),
        end: jest.fn(),
      },
      websocket: {
        emit: jest.fn(),
        to: jest.fn().mockReturnThis(),
        on: jest.fn(),
        off: jest.fn(),
      },
      cache: {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue(true),
        del: jest.fn().mockResolvedValue(true),
        exists: jest.fn().mockResolvedValue(false),
      },
      aiService: {
        generateText: jest.fn().mockResolvedValue({ content: "Mocked content" })
      },
      logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
      },
      contextAwareAIService: null,
      documentPurposeService: null,
      templateAnalyticsService: null
    }

    this.service = createMockQueueService(this.mockDependencies)
    
    // Create mock queues and register them for common types
    // We register for all queues currently defined in types
    const commonQueues = [
      "ai-processing", "document-processing", "document-upload",
      "pipeline-processing", "baseline-processing", "process-flow-processing",
      "document-regeneration", "quality-audit", "project-data-extraction",
      "confluence-publishing", "digital-twin-events", "digital-twin-triggers",
      "gkg-sync"
    ] as const

    for (const queueName of commonQueues) {
      const mockQueue = mockDeep<IQueue>()
      this.service.registerQueue(queueName as any, mockQueue)
    }
  }

  /**
   * Helper to set a mock response for a database query
   */
  setQueryResponse(rows: any[]) {
    this.mockDependencies.database.query.mockResolvedValue({ rows, rowCount: rows.length })
  }

  /**
   * Helper to set a mock error for a database query
   */
  setQueryError(error: Error) {
    this.mockDependencies.database.query.mockRejectedValue(error)
  }
}

/**
 * Factory function to create a MockJobQueue instance
 */
export const createMockJobQueue = () => new MockJobQueue()
