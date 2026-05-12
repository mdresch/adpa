import {
  getProjectDocumentsPath,
  getProjectDocumentViewPath,
  getProjectDocumentEntitiesPath,
  getProjectSourceDocumentPath,
  getDocumentSignPath,
} from '../../lib/documents/document-routes'

describe('document routes', () => {
  const projectId = 'project-123'
  const documentId = 'document-456'

  it('builds the project documents list route', () => {
    expect(getProjectDocumentsPath(projectId)).toBe('/projects/project-123/documents')
  })

  it('builds the project document view route', () => {
    expect(getProjectDocumentViewPath(projectId, documentId)).toBe('/projects/project-123/documents/document-456/view')
  })

  it('builds the project document entities route', () => {
    expect(getProjectDocumentEntitiesPath(projectId, documentId)).toBe('/projects/project-123/documents/document-456/entities')
  })

  it('builds the document sign route', () => {
    expect(getDocumentSignPath(documentId)).toBe('/documents/document-456/sign')
  })

  it('routes project context sources to the project context tab', () => {
    expect(getProjectSourceDocumentPath(projectId, `project_context:${projectId}`)).toBe('/projects/project-123?tab=context')
  })

  it('routes normal source documents to the document view page', () => {
    expect(getProjectSourceDocumentPath(projectId, documentId)).toBe('/projects/project-123/documents/document-456/view')
  })
})