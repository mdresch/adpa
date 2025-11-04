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
    
    // Use unidiff to create a proper diff
    return formatLines(diffLines(oldLines, newLines), {
      context: 3
    })
  }, [oldContent, newContent])

  const files = useMemo(() => {
    try {
      // Parse the diff text into structured format
      const diff = `--- ${filename}
+++ ${filename}
${diffText}`
      return parseDiff(diff)
    } catch (error) {
      console.error('Error parsing diff:', error)
      return []
    }
  }, [diffText, filename])

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
      {files.map(renderFile)}
    </div>
  )
}
