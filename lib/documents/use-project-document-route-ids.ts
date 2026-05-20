"use client"

import { useParams, useSearchParams } from "next/navigation"

/** Resolves project + document IDs from static routes (?docId=) or legacy nested /[docId]/ segments. */
export function useProjectDocumentRouteIds() {
  const params = useParams()
  const searchParams = useSearchParams()
  const projectId = (params?.id as string) ?? ""
  const documentId =
    (params?.docId as string) || searchParams?.get("docId") || ""

  return { projectId, documentId }
}
