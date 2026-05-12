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

import { MarkdownRenderer } from '@/components/documents/MarkdownRenderer'

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