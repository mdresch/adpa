"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Task } from "@/hooks/use-tasks"
import { FileText, ExternalLink, Database } from "lucide-react"
import Link from "next/link"

interface TaskSourceViewProps {
  task: Task
}

export function TaskSourceView({ task }: TaskSourceViewProps) {
  const sourceDocumentId = task.sourceDocumentId || task.source_document_id
  const importedFromWbs = task.importedFromWbs || task.imported_from_wbs
  const sourceDocumentTitle = task.sourceDocumentTitle || task.source_document_title
  const sourceEntityId = task.sourceEntityId || task.source_entity_id
  const wbsCode = task.wbsCode || task.wbs_code
  const projectId = task.projectId || task.project_id

  if (!sourceDocumentId && !importedFromWbs) {
    return (
      <div className="border border-dashed rounded-lg p-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground mb-2">This task was created manually</p>
        <p className="text-sm text-muted-foreground">
          No source document or import information available
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Import Information */}
      {importedFromWbs && (
        <div className="border rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Database className="h-5 w-5 text-blue-500 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold mb-1">Imported from WBS Data</h4>
              <p className="text-sm text-muted-foreground mb-3">
                This task was automatically imported from Work Breakdown Structure (WBS) extraction
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                  WBS Import
                </Badge>
                {wbsCode && (
                  <Badge variant="outline" className="font-mono">
                    WBS {wbsCode}
                  </Badge>
                )}
                {sourceEntityId && (
                  // When we have a source document id, make the entity clickable
                  // so users can jump directly to the source document and context
                  sourceDocumentId ? (
                    <Link
                      href={`/documents/${sourceDocumentId}#entity-${sourceEntityId}`}
                      target="_blank"
                      className="inline-block"
                    >
                      <Badge variant="outline" className="font-mono text-xs underline decoration-dotted">
                        Entity: {sourceEntityId}
                      </Badge>
                    </Link>
                  ) : (
                    <Badge variant="outline" className="font-mono text-xs">
                      Entity: {sourceEntityId}
                    </Badge>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Source Document */}
      {sourceDocumentId && (
        <div className="border rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold mb-1">Source Document</h4>
              <p className="text-sm text-muted-foreground mb-3">
                This task was extracted from a project document
              </p>
              {sourceDocumentTitle && (
                <div className="mb-2 text-sm font-medium">{sourceDocumentTitle}</div>
              )}

              {/* Expose the raw document id so users can copy or verify provenance */}
              {sourceDocumentId && (
                <div className="mb-3 text-xs text-muted-foreground flex items-center gap-2">
                  <span className="font-semibold">Document ID:</span>
                  <code className="bg-background px-2 py-1 rounded font-mono text-sm">{sourceDocumentId}</code>
                </div>
              )}

              <Link 
                href={`/documents/${sourceDocumentId}`}
                target="_blank"
              >
                <Button variant="outline" size="sm">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Source Document
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Task Metadata */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-semibold mb-3">Task Metadata</h4>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-muted-foreground">Task Number</dt>
            <dd className="font-mono mt-1">{task.taskNumber || task.task_number || '-'}</dd>
          </div>
          {wbsCode && (
            <div>
              <dt className="text-muted-foreground">WBS Code</dt>
              <dd className="font-mono mt-1">{wbsCode}</dd>
            </div>
          )}
          <div>
            <dt className="text-muted-foreground">Created At</dt>
            <dd className="mt-1">
              {task.createdAt || task.created_at 
                ? new Date(task.createdAt || task.created_at).toLocaleDateString() 
                : '-'}
            </dd>
          </div>
          {(task.updatedAt || task.updated_at) && (
            <div>
              <dt className="text-muted-foreground">Last Updated</dt>
              <dd className="mt-1">
                {new Date(task.updatedAt || task.updated_at).toLocaleDateString()}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* AI Extraction Info */}
      {sourceEntityId && (
        <div className="bg-muted rounded-lg p-4">
          <h4 className="text-sm font-semibold mb-2">AI Extraction Details</h4>
          <p className="text-xs text-muted-foreground mb-2">
            This task was identified and extracted using AI-powered document analysis
          </p>
            <div className="flex flex-wrap gap-2 text-xs">
            {sourceEntityId && sourceDocumentId ? (
              <Link href={`/documents/${sourceDocumentId}#entity-${sourceEntityId}`} target="_blank">
                <code className="bg-background px-2 py-1 rounded underline decoration-dotted text-xs">
                  Entity ID: {sourceEntityId}
                </code>
              </Link>
            ) : (
              <code className="bg-background px-2 py-1 rounded">
                Entity ID: {sourceEntityId}
              </code>
            )}
            {projectId && (
              <code className="bg-background px-2 py-1 rounded">
                Project: {projectId.substring(0, 8)}...
              </code>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

