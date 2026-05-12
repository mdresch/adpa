import type { Request, Response } from 'express'

jest.mock('../../../utils/logger', () => ({
  childLogger: jest.fn(() => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  })),
}))

jest.mock('../../../database/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}))

jest.mock('../../../modules/documents/DocumentRepository', () => ({
  DocumentRepository: jest.fn(),
}))

jest.mock('../../../services/pdfService', () => ({
  unifiedPdfService: {},
}))

jest.mock('../../../services/documentConversionService', () => ({
  documentConversionService: {},
}))

jest.mock('../../../services/queueService', () => ({
  extractionQueue: {
    add: jest.fn(),
  },
}))

jest.mock('../../../services/docxService', () => ({
  DocxService: jest.fn(),
}))

jest.mock('../../../services/storageArchivalService', () => ({
  storageArchivalService: {
    archiveDocument: jest.fn().mockResolvedValue(undefined),
  },
}))

jest.mock('../../../utils/redis', () => ({
  cache: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn().mockResolvedValue(undefined),
  },
}))

jest.mock('../../../middleware/analyticsMiddleware', () => ({
  trackActivity: {
    editDocument: jest.fn(),
  },
}))

jest.mock('../../../services/auditService', () => ({
  __esModule: true,
  default: {
    log: jest.fn().mockResolvedValue(undefined),
  },
}))

jest.mock('../../../infrastructure/logger', () => ({
  asyncLocalStorage: {
    getStore: jest.fn(),
  },
}))

import { asyncLocalStorage } from '../../../infrastructure/logger'
import { DocumentsController } from '../../../modules/documents/DocumentsController'

function createResponse(): Response {
  const res = {} as Response
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

describe('DocumentsController persistence payloads', () => {
  const originalSetImmediate = global.setImmediate

  beforeEach(() => {
    jest.clearAllMocks()
    ;(asyncLocalStorage.getStore as jest.Mock).mockReturnValue('corr-123')
    ;(DocumentsController as any)._documentRepository = undefined
  })

  afterEach(() => {
    global.setImmediate = originalSetImmediate
  })

  it('does not pass correlation_id when updating a document', async () => {
    const update = jest.fn().mockResolvedValue({
      rows: [{ id: 'doc-1', project_id: 'project-1', content: 'Updated content' }],
    })

    ;(DocumentsController as any)._documentRepository = {
      findById: jest.fn().mockResolvedValue({
        rows: [{ id: 'doc-1', project_id: 'project-1', version: 1, metadata: {} }],
      }),
      update,
    }

    const req = {
      params: { id: 'doc-1' },
      body: { content: 'Updated content', title: 'Ignored title', tags: ['ignored'] },
      user: { id: 'user-1', role: 'super_admin' },
      ip: '127.0.0.1',
    } as unknown as Request
    const res = createResponse()

    await DocumentsController.update(req, res)

    expect(update).toHaveBeenCalledTimes(1)
    expect(update.mock.calls[0][1]).not.toHaveProperty('correlation_id')
    expect(update.mock.calls[0][1]).toMatchObject({
      content: 'Updated content',
      word_count: 2,
      character_count: 15,
      version: 2,
    })
  })

  it('does not pass correlation_id when creating a document', async () => {
    const create = jest.fn().mockResolvedValue({
      rows: [{ id: 'doc-1', project_id: 'project-1', name: 'Doc name', content: 'Draft body' }],
    })

    ;(DocumentsController as any)._documentRepository = {
      create,
      saveVersion: jest.fn().mockResolvedValue({ rows: [] }),
    }

    global.setImmediate = jest.fn() as unknown as typeof setImmediate

    const req = {
      params: { projectId: 'project-1' },
      body: { name: 'Doc name', content: 'Draft body' },
      user: { id: 'user-1', role: 'super_admin' },
    } as unknown as Request
    const res = createResponse()

    await DocumentsController.create(req, res)

    expect(create).toHaveBeenCalledTimes(1)
    expect(create.mock.calls[0][0]).not.toHaveProperty('correlation_id')
    expect(create.mock.calls[0][0]).toMatchObject({
      project_id: 'project-1',
      name: 'Doc name',
      content: 'Draft body',
      created_by: 'user-1',
      word_count: 2,
      character_count: 10,
    })
  })
})