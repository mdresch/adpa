import { getDocumentApiPath } from '../../lib/documents/document-api-routes'

describe('document api routes', () => {
  it('builds the document update endpoint without the project prefix', () => {
    expect(getDocumentApiPath('document-456')).toBe('/documents/document-456')
  })
})