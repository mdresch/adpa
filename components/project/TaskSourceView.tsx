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
  if (!task.source_document_id && !task.imported_from_wbs) {
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
      {task.imported_from_wbs && (
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
                {task.wbs_code && (
                  <Badge variant="outline" className="font-mono">
                    WBS {task.wbs_code}
                  </Badge>
                )}
                {task.source_entity_id && (
                  // When we have a source document id, make the entity clickable
                  // so users can jump directly to the source document and context
                  task.source_document_id ? (
                    <Link
                      href={`/documents/${task.source_document_id}#entity-${task.source_entity_id}`}
                      target="_blank"
                      className="inline-block"
                    >
                      <Badge variant="outline" className="font-mono text-xs underline decoration-dotted">
                        Entity: {task.source_entity_id}
                      </Badge>
                    </Link>
                  ) : (
                    <Badge variant="outline" className="font-mono text-xs">
                      Entity: {task.source_entity_id}
                    </Badge>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Source Document */}
      {task.source_document_id && (
        <div className="border rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold mb-1">Source Document</h4>
              <p className="text-sm text-muted-foreground mb-3">
                This task was extracted from a project document
              </p>
              {task.source_document_title && (
                <div className="mb-2 text-sm font-medium">{task.source_document_title}</div>
              )}

              {/* Expose the raw document id so users can copy or verify provenance */}
              {task.source_document_id && (
                <div className="mb-3 text-xs text-muted-foreground flex items-center gap-2">
                  <span className="font-semibold">Document ID:</span>
                  <code className="bg-background px-2 py-1 rounded font-mono text-sm">{task.source_document_id}</code>
                </div>
              )}

              <Link 
                href={`/documents/${task.source_document_id}`}
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
            <dd className="font-mono mt-1">{task.task_number}</dd>
          </div>
          {task.wbs_code && (
            <div>
              <dt className="text-muted-foreground">WBS Code</dt>
              <dd className="font-mono mt-1">{task.wbs_code}</dd>
            </div>
          )}
          <div>
            <dt className="text-muted-foreground">Created At</dt>
            <dd className="mt-1">{new Date(task.created_at).toLocaleDateString()}</dd>
          </div>
          {task.updated_at && (
            <div>
              <dt className="text-muted-foreground">Last Updated</dt>
              <dd className="mt-1">{new Date(task.updated_at).toLocaleDateString()}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* AI Extraction Info */}
      {task.source_entity_id && (
        <div className="bg-muted rounded-lg p-4">
          <h4 className="text-sm font-semibold mb-2">AI Extraction Details</h4>
          <p className="text-xs text-muted-foreground mb-2">
            This task was identified and extracted using AI-powered document analysis
          </p>
            <div className="flex flex-wrap gap-2 text-xs">
            {task.source_entity_id && task.source_document_id ? (
              <Link href={`/documents/${task.source_document_id}#entity-${task.source_entity_id}`} target="_blank">
                <code className="bg-background px-2 py-1 rounded underline decoration-dotted text-xs">
                  Entity ID: {task.source_entity_id}
                </code>
              </Link>
            ) : (
              <code className="bg-background px-2 py-1 rounded">
                Entity ID: {task.source_entity_id}
              </code>
            )}
            {task.project_id && (
              <code className="bg-background px-2 py-1 rounded">
                Project: {task.project_id.substring(0, 8)}...
              </code>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

