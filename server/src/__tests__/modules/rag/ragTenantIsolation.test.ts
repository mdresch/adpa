import { VectorQueryController } from '../../../modules/rag/VectorQueryController'
import { VectorDBProvider } from '../../../modules/rag/VectorDBProvider'

describe('Pillar 2: RAG Tenant Isolation & Failover Invariants', () => {
  beforeEach(() => {
    VectorDBProvider.simulateOutage(false) // Reset state before each test
  })

  it('should block cross-tenant queries and successfully fall back to PostgreSQL', async () => {
    const invalidQuery = {
      tenantId: 'Tenant_A',
      vectorQuery: [0.12, -0.43, 0.98],
      filter: { tenantId: 'Tenant_B' } // Malicious cross-tenant attempt
    };

    // Invariant: Query must be rejected by the security layer before hitting the database
    await expect(VectorQueryController.execute(invalidQuery)).rejects.toThrow('Tenant Isolation Violation');

    // Simulate Qdrant/Pinecone outage
    VectorDBProvider.simulateOutage(true);

    // Invariant: System must fall back to PostgreSQL full-text search
    const results = await VectorQueryController.execute({
      tenantId: 'Tenant_A',
      vectorQuery: [0.12, -0.43, 0.98],
      filter: { tenantId: 'Tenant_A' }
    });

    expect(results.source).toBe('POSTGRESQL_FULL_TEXT_FALLBACK');
    expect(results.data).toBeDefined();
  });

  it('should return VECTOR_DATABASE source when healthy', async () => {
    VectorDBProvider.simulateOutage(false);

    const results = await VectorQueryController.execute({
      tenantId: 'Tenant_Healthy',
      vectorQuery: [0.1, 0.2, 0.3],
      filter: { tenantId: 'Tenant_Healthy' }
    });

    expect(results.source).toBe('VECTOR_DATABASE');
    expect(results.data).toBeDefined();
  });
});
