describe('MongoVectorStore.getStats cache', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      MONGODB_URI: 'mongodb://localhost:27017',
      MONGODB_DB_NAME: 'test_rag',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns persisted stats immediately and schedules background refresh', async () => {
    const { MongoVectorStore } = await import('../../services/mongoVectorStore');
    const store = new MongoVectorStore();

    const persisted = {
      _id: 'vector_store_stats',
      documents: 10,
      chunks: 100,
      embeddedChunks: 80,
      embeddingPercentage: 80,
      indexStatus: 'active',
      database: 'test_rag',
      updatedAt: new Date().toISOString(),
    };

    const metadataCollection = {
      findOne: jest.fn().mockResolvedValue(persisted),
      updateOne: jest.fn().mockResolvedValue({ acknowledged: true }),
    };

    jest.spyOn(store as unknown as { performConnect: () => Promise<void> }, 'performConnect').mockImplementation(
      async function (this: InstanceType<typeof MongoVectorStore>) {
        (store as unknown as { isConnected: boolean }).isConnected = true;
        (store as unknown as { client: object }).client = {};
        (store as unknown as { _db: object })._db = {
          collection: (name: string) => {
            if (name === 'rag_metadata') return metadataCollection;
            return {
              estimatedDocumentCount: jest.fn().mockResolvedValue(0),
              countDocuments: jest.fn().mockResolvedValue(0),
              listSearchIndexes: () => ({ toArray: jest.fn().mockResolvedValue([]) }),
            };
          },
        };
      }
    );

    const scheduleSpy = jest.spyOn(store, 'scheduleStatsRefresh').mockImplementation(() => {});

    const stats = await store.getStats();

    expect(stats.documents).toBe(10);
    expect(stats.chunks).toBe(100);
    expect(stats.embeddedChunks).toBe(80);
    expect(stats.refreshing).toBe(false);
    expect(scheduleSpy).toHaveBeenCalled();

    scheduleSpy.mockRestore();
  });
});
