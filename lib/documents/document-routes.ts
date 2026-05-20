export function getProjectDocumentsPath(projectId: string): string {
  return `/projects/${projectId}/documents`
}

export function isProjectContextDocumentId(documentId: string): boolean {
  return documentId.startsWith('project_context:')
}

export function getProjectContextPath(projectId: string): string {
  return `/projects/${projectId}?tab=context`
}

export function getProjectDocumentViewPath(projectId: string, documentId: string): string {
  return `/projects/${projectId}/documents/${documentId}/view`
}

export function getProjectSourceDocumentPath(projectId: string, documentId: string): string {
  if (isProjectContextDocumentId(documentId)) {
    return getProjectContextPath(projectId)
  }

  return getProjectDocumentViewPath(projectId, documentId)
}

export function getProjectDocumentEntitiesPath(projectId: string, documentId: string): string {
  return `/projects/${projectId}/documents/${documentId}/entities`
}

export function getProjectDocumentGenUIPath(projectId: string, documentId: string): string {
  return `/projects/${projectId}/documents/${documentId}/genui`
}

export function getDocumentSignPath(documentId: string): string {
  return `/documents/${documentId}/sign`
}
