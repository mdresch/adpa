import { extractMermaidBlocks, hasMermaidBlocks, isMermaidLanguage, looksLikeMermaidCode, normalizeMermaidMarkdown } from '@/lib/documents/mermaid'

describe('mermaid helpers', () => {
  it('detects mermaid language classes', () => {
    expect(isMermaidLanguage('language-mermaid')).toBe(true)
    expect(isMermaidLanguage('language-ts')).toBe(false)
  })

  it('detects mermaid code even when the language class is absent', () => {
    expect(looksLikeMermaidCode('quadrantChart\n  title Stakeholder Power/Interest Grid')).toBe(true)
    expect(looksLikeMermaidCode('graph TD\n  A --> B')).toBe(true)
    expect(looksLikeMermaidCode('const value = 1')).toBe(false)
  })

  it('extracts mermaid fenced blocks', () => {
    const markdown = [
      '# Stakeholder Matrix',
      '',
      '```mermaid',
      'quadrantChart',
      '  title Stakeholder Power/Interest Grid',
      '```',
    ].join('\n')

    expect(extractMermaidBlocks(markdown)).toEqual([
      ['quadrantChart', '  title Stakeholder Power/Interest Grid'].join('\n'),
    ])
  })

  it('reports whether markdown contains mermaid blocks', () => {
    expect(hasMermaidBlocks('```mermaid\nquadrantChart\n```')).toBe(true)
    expect(hasMermaidBlocks('```ts\nconst x = 1\n```')).toBe(false)
  })

  it('normalizes flattened quadrant charts back into mermaid fences', () => {
    const markdown = 'quadrantChart title Stakeholder Power/Interest Grid x-axis "Interest (Low --> High)" y-axis "Power (Low --> High)" quadrant-1 "Manage Closely" G-01: [0.9, 0.9]'

    expect(normalizeMermaidMarkdown(markdown)).toContain('```mermaid')
    expect(normalizeMermaidMarkdown(markdown)).toContain('\nquadrant-1 "Manage Closely"')
    expect(normalizeMermaidMarkdown(markdown)).toContain('\nG-01: [0.9, 0.9]')
  })
})