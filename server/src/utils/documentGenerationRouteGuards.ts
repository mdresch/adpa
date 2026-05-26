import type { Pool } from "pg"

export type ExistingTemplateDocument = {
  id: string
  name: string
  version: number | string | null
  semantic_version: string | null
  updated_at: string | Date | null
}

export function getAIProviderQuotaDetails(error: unknown): string | null {
  const retryError = error as {
    name?: string
    message?: string
    lastError?: {
      statusCode?: number
      data?: {
        error?: {
          status?: string
          message?: string
        }
      }
    }
  }

  const providerError = retryError.lastError
  const providerStatus = providerError?.data?.error?.status
  const providerMessage = providerError?.data?.error?.message
  const message = retryError.message ?? ""

  if (
    retryError.name === "AI_RetryError" &&
    (providerError?.statusCode === 429 ||
      providerStatus === "RESOURCE_EXHAUSTED" ||
      /quota|resource_exhausted/i.test(providerMessage ?? message))
  ) {
    return providerMessage || message || "The selected AI provider quota has been exceeded."
  }

  return null
}

export async function findExistingTemplateDocument(
  db: Pick<Pool, "query">,
  projectId: string,
  templateId: string,
): Promise<ExistingTemplateDocument | null> {
  const existingTemplateDocument = await db.query(
    `SELECT 
      d.id,
      d.name,
      d.version,
      d.semantic_version,
      d.updated_at
     FROM documents d
     WHERE d.project_id = $1 
       AND d.template_id = $2 
       AND d.deleted_at IS NULL
       AND d.parent_document_id IS NULL
     ORDER BY d.updated_at DESC
     LIMIT 1`,
    [projectId, templateId],
  )

  return (existingTemplateDocument.rows[0] as ExistingTemplateDocument | undefined) ?? null
}
