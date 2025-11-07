/**
 * Side-by-Side Diff Component
 * Displays a side-by-side comparison of original and resolved content
 */

'use client'

import { useMemo } from 'react'
import { parseDiff, Diff, Hunk, tokenize } from 'react-diff-view'
import { diffLines, formatLines } from 'unidiff'
import 'react-diff-view/style/index.css'
import './diff-view.css'

interface SideBySideDiffProps {
  oldContent: string
  newContent: string
  filename?: string
}

export function SideBySideDiff({ oldContent, newContent, filename = 'document.md' }: SideBySideDiffProps) {
  const diffText = useMemo(() => {
    // Create unified diff format
    const oldLines = oldContent.split('\n')
    const newLines = newContent.split('\n')
    
    // Use unidiff to create a proper diff with expanded context for better clarity
    return formatLines(diffLines(oldLines, newLines), {
      context: 5  // Increased from 3 to 5 for more context around changes
    })
  }, [oldContent, newContent])

  const files = useMemo(() => {
    try {
      // Parse the diff text into structured format
      const diffHeader = [
        `--- ${filename}`,
        `+++ ${filename}`,
        diffText
      ].join('\n')
      return parseDiff(diffHeader)
    } catch (error) {
      console.error('Error parsing diff:', error)
      return []
    }
  }, [diffText, filename])

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

  if (files.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p>Unable to generate diff preview</p>
        <p className="text-xs mt-2">The content may be too similar or malformed</p>
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
