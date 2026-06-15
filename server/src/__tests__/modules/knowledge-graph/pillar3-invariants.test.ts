import { InlineH8Parser } from '../../../modules/knowledge-graph/InlineH8Parser'
import { DualStoreTransactionManager, PostgresLedger, Neo4jGraph } from '../../../modules/knowledge-graph/DualStoreTransactionManager'

describe('Pillar 3: H8 Parser and Dual-Store Transaction Invariants', () => {
  beforeEach(() => {
    // Reset mock data stores before each test
    PostgresLedger.reset()
    Neo4jGraph.reset()
  })

  it('should extract entities amidst hallucinations and enforce dual-store atomicity', async () => {
    const hallucinatedText = `
      Some random text here...
      ######## risks: {"title": "API Outage", "description": "Third-party failure", "category": "technical", "probability": "high", "impact": "high"}
      More hallucinated text and malformed markdown trailing off...
    `

    // Invariant: Parser must successfully isolate and parse the H8 block
    const extractedEntities = InlineH8Parser.parse(hallucinatedText)
    expect(extractedEntities).toHaveLength(1)
    expect(extractedEntities[0].title).toBe('API Outage')

    // Invariant: Failed Neo4j commit must roll back PostgreSQL write
    const transaction = await DualStoreTransactionManager.start()
    try {
      await transaction.writeToPostgres({ id: 'E-101', name: 'API Outage' })
      await transaction.writeToNeo4j({ id: 'E-101', label: 'Risk', failTrigger: true }) // Forced failure
      await transaction.commit()
    } catch (error) {
      await transaction.rollback()
    }

    const postgresRecord = await PostgresLedger.findEntityById('E-101')
    const neo4jNode = await Neo4jGraph.findNodeById('E-101')

    expect(postgresRecord).toBeNull()
    expect(neo4jNode).toBeNull()
  })
})
