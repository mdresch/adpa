/**
 * Side-by-Side Diff Component
 * Displays a side-by-side comparison of original and resolved content
 */

'use client'

import { useMemo } from 'react'
import { Diff, Hunk, tokenize } from 'react-diff-view'
import { buildSideBySideDiffFiles } from './sideBySideDiffParser'
import 'react-diff-view/style/index.css'
import './diff-view.css'

interface SideBySideDiffProps {
  oldContent: string
  newContent: string
  filename?: string
}

export function SideBySideDiff({ oldContent, newContent, filename = 'document.md' }: SideBySideDiffProps) {
  // Validate inputs
  const validatedOldContent = useMemo(() => {
    if (!oldContent || typeof oldContent !== 'string') {
      console.warn('[SideBySideDiff] Invalid oldContent:', typeof oldContent)
      return ''
    }
    return oldContent
  }, [oldContent])

  const validatedNewContent = useMemo(() => {
    if (!newContent || typeof newContent !== 'string') {
      console.warn('[SideBySideDiff] Invalid newContent:', typeof newContent)
      return ''
    }
    return newContent
  }, [newContent])

  const files = useMemo(() => {
    if (validatedOldContent === validatedNewContent) {
      console.log('[SideBySideDiff] Content is identical, no changes to display')
      return []
    }

    try {
      const parsed = buildSideBySideDiffFiles({
        oldContent: validatedOldContent,
        newContent: validatedNewContent,
        filename,
      })
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[SideBySideDiff] Parsed diff files:', {
          fileCount: parsed.length,
          hunksCount: parsed[0]?.hunks?.length || 0
        })
      }

      return parsed
    } catch (error) {
      console.error('[SideBySideDiff] Error parsing diff:', error)
      return []
    }
  }, [validatedOldContent, validatedNewContent, filename])

  // Calculate change statistics from the parsed diff for accuracy
  const stats = useMemo(() => {
    if (files.length === 0) {
      return { additions: 0, deletions: 0, modifications: 0 }
    }
    
    let additions = 0
    let deletions = 0
    
    // Count changes from the actual diff hunks
    files.forEach(file => {
      file.hunks.forEach((hunk: any) => {
        hunk.changes.forEach((change: any) => {
          if (change.type === 'insert') {
            additions++
          } else if (change.type === 'delete') {
            deletions++
          }
        })
      })
    })
    
    return { additions, deletions, modifications: 0 }
  }, [files])

  const renderFile = (file: any) => {
    const tokens = useMemo(() => {
      try {
        return tokenize(file.hunks)
      } catch (error) {
        console.error('Error tokenizing hunks:', error)
        return undefined
      }
    }, [file.hunks])

    return (
      <Diff
        key={file.oldPath}
        viewType="split"
        diffType={file.type}
        hunks={file.hunks}
        tokens={tokens}
      >
        {(hunks: any[]) =>
          hunks.map(hunk => (
            <Hunk key={hunk.content} hunk={hunk} />
          ))
        }
      </Diff>
    )
  }

  // Check if content is identical
  const isIdentical = validatedOldContent === validatedNewContent
  const hasNoChanges = files.length === 0

  if (isIdentical) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p className="font-medium">✓ Content is Identical</p>
        <p className="text-xs mt-2">The original and proposed content are exactly the same.</p>
        <p className="text-xs mt-1">No changes to display.</p>
      </div>
    )
  }

  if (hasNoChanges) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p className="font-medium">Unable to generate diff preview</p>
        <p className="text-xs mt-2">The diff library could not detect meaningful changes.</p>
        <details className="mt-4 text-left max-w-md mx-auto">
          <summary className="cursor-pointer text-xs font-medium">Debug Information</summary>
          <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs">
            <p>Old content length: {validatedOldContent.length} chars</p>
            <p>New content length: {validatedNewContent.length} chars</p>
            <p>Old lines: {validatedOldContent.split('\n').length}</p>
            <p>New lines: {validatedNewContent.split('\n').length}</p>
          </div>
        </details>
      </div>
    )
  }

  return (
    <div className="diff-view-container">
      {/* Add change summary for clarity */}
      {stats.additions + stats.deletions > 0 && (
        <div className="diff-stats-summary">
          <span className="diff-stat-label">Changes:</span>
          {stats.additions > 0 && (
            <span className="diff-stat-additions">+{stats.additions} lines added</span>
          )}
          {stats.deletions > 0 && (
            <span className="diff-stat-deletions">-{stats.deletions} lines removed</span>
          )}
        </div>
      )}
      
      {/* Add headers for split view columns */}
      <div className="diff-split-header">
        <div className="diff-split-header-col">Original Content</div>
        <div className="diff-split-header-col">Resolved Content (After AI)</div>
      </div>
      {files.map(renderFile)}
    </div>
  )
}
