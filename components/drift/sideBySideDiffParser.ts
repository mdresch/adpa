import { parseDiff } from 'react-diff-view'
import { diffLines, formatLines } from 'unidiff'

interface BuildSideBySideDiffFilesInput {
  oldContent: string
  newContent: string
  filename?: string
}

export function buildSideBySideUnifiedDiff({
  oldContent,
  newContent,
  filename = 'document.md',
}: BuildSideBySideDiffFilesInput) {
  if (oldContent === newContent) {
    return ''
  }

  const diffText = formatLines(diffLines(oldContent.split('\n'), newContent.split('\n')), {
    context: 5,
  })

  const lines = diffText.split('\n')
  if (lines[0]?.startsWith('--- ')) {
    lines[0] = `--- ${filename}`
  }
  if (lines[1]?.startsWith('+++ ')) {
    lines[1] = `+++ ${filename}`
  }

  return lines.join('\n')
}

export function buildSideBySideDiffFiles(input: BuildSideBySideDiffFilesInput) {
  const unifiedDiff = buildSideBySideUnifiedDiff(input)
  if (!unifiedDiff) {
    return []
  }

  return parseDiff(unifiedDiff)
}
