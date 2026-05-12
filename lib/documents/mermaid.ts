export function isMermaidLanguage(className?: string): boolean {
  const match = /language-([\w-]+)/i.exec(className || '')

  return match?.[1]?.toLowerCase() === 'mermaid'
}

const MERMAID_DIAGRAM_PATTERNS = [
  /^%%\{.*\}%%/i,
  /^(?:graph|flowchart|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|journey|gantt|pie|mindmap|timeline|gitGraph|quadrantChart|requirementDiagram|kanban|architecture)\b/i,
  /^C4(?:Context|Container|Component|Dynamic|Deployment)\b/i,
  /^block-beta\b/i,
  /^packet-beta\b/i,
]

export function looksLikeMermaidCode(code?: string): boolean {
  if (!code) {
    return false
  }

  const trimmedCode = code.trim()
  if (!trimmedCode) {
    return false
  }

  return MERMAID_DIAGRAM_PATTERNS.some((pattern) => pattern.test(trimmedCode))
}

function normalizeQuadrantChartLine(line: string): string {
  const decodedLine = line
    .replace(/&gt;/g, '>')
    .replace(/\\\[/g, '[')
    .replace(/\\\]/g, ']')
    .trim()

  let normalized = decodedLine.replace(/^quadrantChart\s+/i, 'quadrantChart\n')
  normalized = normalized.replace(/\s+(title|x-axis|y-axis|quadrant-1|quadrant-2|quadrant-3|quadrant-4)\b/g, '\n$1')
  normalized = normalized.replace(/\s+([A-Za-z][\w-]*:\s*\[[^\]]+\])/g, '\n$1')

  return ['```mermaid', normalized, '```'].join('\n')
}

export function extractMermaidBlocks(markdown?: string): string[] {
  if (!markdown) {
    return []
  }

  const mermaidBlocks: string[] = []
  const regex = /```mermaid\s*\n([\s\S]*?)```/gi

  let match: RegExpExecArray | null
  while ((match = regex.exec(markdown)) !== null) {
    const code = match[1]?.trim()
    if (code) {
      mermaidBlocks.push(code)
    }
  }

  return mermaidBlocks
}

export function hasMermaidBlocks(markdown?: string): boolean {
  return extractMermaidBlocks(markdown).length > 0
}

export function normalizeMermaidMarkdown(markdown?: string): string {
  if (!markdown) {
    return ''
  }

  if (hasMermaidBlocks(markdown)) {
    return markdown
  }

  return markdown.replace(/(^|\n)(quadrantChart\s+[^\n]+)(?=\n|$)/g, (_match, prefix, line) => {
    return `${prefix}${normalizeQuadrantChartLine(line)}`
  })
}