import MarkdownIt from "markdown-it"

const md = new MarkdownIt({ html: true, breaks: true })

export function renderEditorMarkdown(markdown: string): string {
  return md.render(markdown)
}