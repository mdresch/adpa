describe('MongoVectorStore.connect', () => {
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

  it('deduplicates concurrent connect into a single performConnect', async () => {
    const { MongoVectorStore } = await import('../../services/mongoVectorStore');
    const store = new MongoVectorStore();

    const performConnect = jest
      .spyOn(store as unknown as { performConnect: () => Promise<void> }, 'performConnect')
      .mockImplementation(async function (this: InstanceType<typeof MongoVectorStore>) {
        await new Promise((resolve) => setTimeout(resolve, 25));
        (store as unknown as { isConnected: boolean }).isConnected = true;
        (store as unknown as { client: object }).client = {};
        (store as unknown as { _db: object })._db = {
          collection: () => ({
            countDocuments: jest.fn().mockResolvedValue(0),
            listSearchIndexes: () => ({ toArray: jest.fn().mockResolvedValue([]) }),
          }),
        };
      });

    await Promise.all([store.connect(), store.connect(), store.connect()]);

    expect(performConnect).toHaveBeenCalledTimes(1);
    expect(store.isConnectionReady()).toBe(true);

    performConnect.mockRestore();
  });
});
