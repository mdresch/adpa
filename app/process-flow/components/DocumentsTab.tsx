"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { DocumentPriority } from "../types"

interface DocumentsTabProps {
  isLoadingPriorities: boolean
  prioritizedDocuments: DocumentPriority[]
}

// Format numbers consistently
const formatNumber = (num: number): string => {
  if (typeof num !== 'number' || isNaN(num)) return '0'
  return num.toLocaleString('en-US')
}

// Helper function to format last modified date
const formatLastModified = (date: string | Date | undefined): string => {
  if (!date) return 'Unknown'
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diff = now.getTime() - dateObj.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  return `${Math.floor(days / 30)} months ago`
}

export function DocumentsTab({ isLoadingPriorities, prioritizedDocuments }: DocumentsTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Document Prioritization</CardTitle>
          <CardDescription>
            Documents prioritized by relevance and importance for optimal context injection
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingPriorities ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Calculating document priorities...</p>
              </div>
            </div>
          ) : prioritizedDocuments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No documents available for prioritization</p>
              <p className="text-sm text-muted-foreground mt-1">Select a project to load documents</p>
            </div>
          ) : (
            <div className="space-y-4">
              {prioritizedDocuments.slice(0, 10).map((doc, index) => (
                <div key={`doc-${index}-${doc.id || doc.title || 'unknown'}`} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${index < 3 ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                        #{index + 1}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-base text-foreground mb-1">
                        <Link 
                          href={`/documents/${doc.id}/view`}
                          className="text-primary hover:text-primary/80 hover:underline transition-colors"
                        >
                          {doc.title || `Document ${index + 1}`}
                        </Link>
                      </h4>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                          Priority Score: <span className="font-medium">{(doc.relevanceScore * 100).toFixed(1)}%</span>
                        </p>
                        {(doc as any).lastModified && (
                          <p className="text-sm text-muted-foreground">
                            Last updated: {formatLastModified((doc as any).lastModified)}
                          </p>
                        )}
                        {(doc as any).type && (
                          <p className="text-sm text-muted-foreground">
                            Type: <span className="font-medium">{(doc as any).type}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium font-mono">{formatNumber(doc.estimatedTokens)}</div>
                    <div className="text-xs text-muted-foreground">estimated tokens</div>
                  </div>
                </div>
              ))}
              
              {/* Summary */}
              <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-semibold">{prioritizedDocuments.length}</div>
                    <div className="text-xs text-muted-foreground">Total Documents</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">
                      {formatNumber(prioritizedDocuments.reduce((sum, doc) => sum + (doc.estimatedTokens || 0), 0))}
                    </div>
                    <div className="text-xs text-muted-foreground">Total Tokens</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">
                      {formatNumber(Math.round(prioritizedDocuments.reduce((sum, doc) => sum + (doc.estimatedTokens || 0), 0) / prioritizedDocuments.length))}
                    </div>
                    <div className="text-xs text-muted-foreground">Avg Tokens</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

