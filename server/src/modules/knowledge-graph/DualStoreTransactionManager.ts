export class PostgresLedger {
  private static store = new Map<string, any>()

  static async write(entity: any) {
    PostgresLedger.store.set(entity.id, entity)
  }

  static async findEntityById(id: string) {
    return PostgresLedger.store.get(id) || null
  }

  static async delete(id: string) {
    PostgresLedger.store.delete(id)
  }

  static reset() {
    PostgresLedger.store.clear()
  }
}

export class Neo4jGraph {
  private static store = new Map<string, any>()

  static async write(node: any) {
    if (node.failTrigger) {
      throw new Error('Forced Neo4j failure')
    }
    Neo4jGraph.store.set(node.id, node)
  }

  static async findNodeById(id: string) {
    return Neo4jGraph.store.get(id) || null
  }

  static async delete(id: string) {
    Neo4jGraph.store.delete(id)
  }

  static reset() {
    Neo4jGraph.store.clear()
  }
}

export class DualStoreTransactionManager {
  private pendingPostgresWrites: any[] = []
  private pendingNeo4jWrites: any[] = []

  static async start() {
    return new DualStoreTransactionManager()
  }

  async writeToPostgres(entity: any) {
    this.pendingPostgresWrites.push(entity)
    await PostgresLedger.write(entity)
  }

  async writeToNeo4j(node: any) {
    try {
      this.pendingNeo4jWrites.push(node)
      await Neo4jGraph.write(node)
    } catch (e) {
      // If a write fails during the transaction, we must immediately throw to trigger rollback
      throw e
    }
  }

  async commit() {
    // In a real implementation, this would commit the DB transactions.
    // For this architectural guard, the writes are already tentatively applied,
    // so we just clear the pending arrays.
    this.pendingPostgresWrites = []
    this.pendingNeo4jWrites = []
  }

  async rollback() {
    // Reverse the operations
    for (const entity of this.pendingPostgresWrites) {
      await PostgresLedger.delete(entity.id)
    }
    for (const node of this.pendingNeo4jWrites) {
      await Neo4jGraph.delete(node.id)
    }
    this.pendingPostgresWrites = []
    this.pendingNeo4jWrites = []
  }
}
