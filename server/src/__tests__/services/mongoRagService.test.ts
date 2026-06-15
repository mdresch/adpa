describe('mongoRagService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('isMongoRagEnabled is false unless explicitly enabled with credentials', async () => {
    delete process.env.MONGODB_RAG_ENABLED;
    process.env.MONGODB_URI = 'mongodb://localhost:27017';
    process.env.VOYAGE_API_KEY = 'test-key';

    const { isMongoRagEnabled } = await Promise.resolve().then(() => require());
    expect(isMongoRagEnabled()).toBe(false);
  });

  it('isMongoRagEnabled is true when flag and credentials are set', async () => {
    process.env.MONGODB_RAG_ENABLED = 'true';
    process.env.MONGODB_URI = 'mongodb://localhost:27017';
    process.env.VOYAGE_API_KEY = 'test-key';

    const { isMongoRagEnabled } = await Promise.resolve().then(() => require());
    expect(isMongoRagEnabled()).toBe(true);
  });
});
