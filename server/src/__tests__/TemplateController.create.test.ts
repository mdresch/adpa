jest.mock('uuid', () => ({
  v4: jest.fn(() => 'generated-template-id'),
}));

jest.mock('../database/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

jest.mock('../utils/redis', () => ({
  cache: {
    del: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
  },
}));

jest.mock('../utils/logger', () => ({
  childLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

jest.mock('../middleware/analyticsMiddleware', () => ({
  trackActivity: {
    createTemplate: jest.fn(),
  },
}));

jest.mock('../services/templateAnalyticsService', () => ({
  __esModule: true,
  default: {
    createVersion: jest.fn(),
  },
}));

const { TemplateController } = require('../modules/templates/TemplateController');
const TemplateAnalyticsService = require('../services/templateAnalyticsService').default;
const { trackActivity } = require('../middleware/analyticsMiddleware');

describe('TemplateController.create', () => {
  it('defaults new templates to user scope before creating them', async () => {
    const controller = new TemplateController();
    const create = jest.fn().mockResolvedValue({
      id: 'template-1',
      name: 'New template',
    });
    (controller as any).repository = { create };

    const req = {
      body: {
        name: 'New template',
        description: '',
        framework: 'TOGAF',
        category: 'Architecture',
        content: { blocks: [] },
        variables: [],
        is_public: false,
      },
      user: {
        id: 'user-1',
        role: 'user',
      },
    } as any;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;
    const next = jest.fn();

    await controller.create(req, res, next);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        template_scope: 'user',
        is_read_only: false,
        company_id: null,
      }),
    );
    expect(TemplateAnalyticsService.createVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        template_id: 'template-1',
      }),
    );
    expect(trackActivity.createTemplate).toHaveBeenCalledWith(
      'user-1',
      'template-1',
      expect.objectContaining({
        name: 'New template',
      }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(next).not.toHaveBeenCalled();
  });
});
