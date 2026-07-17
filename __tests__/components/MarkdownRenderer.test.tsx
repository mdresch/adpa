import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children, components }: { children: string; components: any }) => {
    const content = String(children)
    const mermaidMatch = content.match(/```(\w+)\n([\s\S]*?)```/)

    if (!mermaidMatch) {
      return React.createElement('div', null, content)
    }

    const [, language, code] = mermaidMatch
    return React.createElement(
      React.Fragment,
      null,
      components.code({
        inline: false,
        className: `language-${language}`,
        children: code,
      }),
    )
  },
}))

jest.mock('remark-gfm', () => ({
  __esModule: true,
  default: () => null,
}))

jest.mock('react-syntax-highlighter', () => ({
  Prism: ({ children, language }: { children: React.ReactNode; language?: string }) => (
    <pre data-testid="syntax-highlighter" data-language={language}>{children}</pre>
  ),
}))

jest.mock('react-syntax-highlighter/dist/cjs/styles/prism', () => ({
  vscDarkPlus: {},
}))

jest.mock('@/components/documents/MermaidDiagram', () => ({
  MermaidDiagram: ({ code }: { code: string }) => <div data-testid="mermaid-diagram">{code}</div>,
}))

jest.mock('@/components/documents/EntityPill', () => ({
  EntityPill: ({ type, data }: { type: string; data: any }) => (
    <div data-testid="entity-pill" data-type={type}>{JSON.stringify(data)}</div>
  ),
}))

import { MarkdownRenderer, buildMarkdownComponents } from '@/components/documents/MarkdownRenderer'

describe('MarkdownRenderer', () => {
  it('renders mermaid fences with the Mermaid diagram component', () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        content={[
          '```mermaid',
          'quadrantChart',
          '  title Stakeholder Power/Interest Grid',
          '```',
        ].join('\n')}
      />,
    )

    expect(html).toContain('data-testid="mermaid-diagram"')
    expect(html).toContain('quadrantChart')
  })

  it('keeps non-mermaid code fences on the syntax highlighter path', () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        content={[
          '```ts',
          'const answer = 42',
          '```',
        ].join('\n')}
      />,
    )

    expect(html).toContain('data-testid="syntax-highlighter"')
    expect(html).toContain('data-language="ts"')
    expect(html).not.toContain('data-testid="mermaid-diagram"')
  })
})

// REQ-TYPESET-001..004 (docs/superpowers/specs/2026-07-11-typeset-document-viewer-design.md).
// buildMarkdownComponents is the pure, per-variant factory MarkdownRenderer passes to
// ReactMarkdown -- tested directly so these assertions don't depend on the mocked
// react-markdown parser above understanding tables/paragraphs.
describe('buildMarkdownComponents', () => {
  describe('variant="typeset"', () => {
    const components = buildMarkdownComponents('typeset')

    it('REQ-TYPESET-001: table/th/td render with no className', () => {
      expect(renderToStaticMarkup(components.table({ children: 'body' }) as React.ReactElement))
        .toBe('<table>body</table>')
      expect(renderToStaticMarkup(components.th({ children: 'head' }) as React.ReactElement))
        .toBe('<th>head</th>')
      expect(renderToStaticMarkup(components.td({ children: 'cell' }) as React.ReactElement))
        .toBe('<td>cell</td>')
    })

    it('REQ-TYPESET-003: ordinary paragraphs render with no className', () => {
      const html = renderToStaticMarkup(
        components.p({ children: 'Just a paragraph.' }) as React.ReactElement,
      )
      expect(html).toBe('<p>Just a paragraph.</p>')
    })

    it('REQ-TYPESET-003: entity-marker paragraphs render EntityPill wrapped in not-typeset', () => {
      const entityJson = JSON.stringify({ id: '1', entity_name: 'Legal' })
      const html = renderToStaticMarkup(
        components.p({ children: `######## stakeholders: ${entityJson}` }) as React.ReactElement,
      )
      expect(html).toContain('class="not-typeset"')
      expect(html).toContain('data-testid="entity-pill"')
      expect(html).toContain('data-type="stakeholders"')
    })

    it('REQ-TYPESET-004: mermaid code blocks are wrapped in not-typeset', () => {
      const html = renderToStaticMarkup(
        components.code({
          inline: false,
          className: 'language-mermaid',
          children: 'graph TD',
        }) as React.ReactElement,
      )
      expect(html).toContain('class="not-typeset"')
      expect(html).toContain('data-testid="mermaid-diagram"')
    })

    it('REQ-TYPESET-004: syntax-highlighted code blocks are wrapped in not-typeset', () => {
      const html = renderToStaticMarkup(
        components.code({
          inline: false,
          className: 'language-ts',
          children: 'const answer = 42',
        }) as React.ReactElement,
      )
      expect(html).toContain('class="not-typeset"')
      expect(html).toContain('data-testid="syntax-highlighter"')
    })
  })

  describe('variant="default" (regression guard)', () => {
    const components = buildMarkdownComponents('default')

    it('REQ-TYPESET-002: table/th/td keep their existing hardcoded classes', () => {
      const tableHtml = renderToStaticMarkup(components.table({ children: 'body' }) as React.ReactElement)
      expect(tableHtml).toContain('overflow-x-auto')
      expect(tableHtml).toContain('border-gray-300')

      const thHtml = renderToStaticMarkup(components.th({ children: 'head' }) as React.ReactElement)
      expect(thHtml).toContain('bg-gray-50')

      const tdHtml = renderToStaticMarkup(components.td({ children: 'cell' }) as React.ReactElement)
      expect(tdHtml).toContain('border-gray-300')
    })

    it('REQ-TYPESET-002: ordinary paragraphs keep mb-4', () => {
      const html = renderToStaticMarkup(
        components.p({ children: 'Just a paragraph.' }) as React.ReactElement,
      )
      expect(html).toBe('<p class="mb-4">Just a paragraph.</p>')
    })

    it('REQ-TYPESET-002/004: entity-marker paragraphs and code blocks are not wrapped in not-typeset', () => {
      const entityJson = JSON.stringify({ id: '1', entity_name: 'Legal' })
      const pHtml = renderToStaticMarkup(
        components.p({ children: `######## stakeholders: ${entityJson}` }) as React.ReactElement,
      )
      expect(pHtml).not.toContain('not-typeset')
      expect(pHtml).toContain('data-testid="entity-pill"')

      const codeHtml = renderToStaticMarkup(
        components.code({ inline: false, className: 'language-mermaid', children: 'graph TD' }) as React.ReactElement,
      )
      expect(codeHtml).not.toContain('not-typeset')
      expect(codeHtml).toContain('data-testid="mermaid-diagram"')
    })
  })
})