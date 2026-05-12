import { renderEditorMarkdown } from '@/lib/editor/markdown'

describe('editor markdown rendering', () => {
  it('preserves mermaid fences as mermaid code blocks for editor serialization', () => {
    const html = renderEditorMarkdown([
      '```mermaid',
      'quadrantChart',
      '  title Stakeholder Power/Interest Grid',
      '```',
    ].join('\n'))

    expect(html).toContain('<pre><code class="language-mermaid">')
    expect(html).toContain('quadrantChart')
  })
})