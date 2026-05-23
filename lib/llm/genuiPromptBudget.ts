import type { LayoutPlan, LayoutPlanNode } from '@/lib/openui/layoutPlanTypes'

/** Max document characters embedded in GenUI system prompt (excerpt; layout plan carries section text). */
export const GENUI_SYSTEM_DOCUMENT_MAX_CHARS = 16_000

/** Target total sourceText across all layout-plan nodes sent to the executor LLM. */
export const GENUI_LAYOUT_PLAN_MAX_SOURCE_CHARS = 80_000

/** Per-leaf cap when the plan has few nodes. */
export const GENUI_LAYOUT_LEAF_SOURCE_MAX_CHARS = 6_000

/** Container nodes (Card/Stack/Accordion) with children — avoid duplicating child bodies on parents. */
export const GENUI_LAYOUT_CONTAINER_SOURCE_MAX_CHARS = 400

const CONTAINER_WITH_CHILDREN = new Set([
  'Card',
  'Stack',
  'Accordion',
  'AccordionItem',
  'Tabs',
  'Tab',
])

const TRUNCATION_NOTE =
  '\n\n[Truncated for API limits — preserve this text in output; do not invent missing sections.]'

export function trimTextForGenuiPrompt(
  text: string,
  maxChars: number = GENUI_SYSTEM_DOCUMENT_MAX_CHARS
): { text: string; truncated: boolean; originalChars: number } {
  const trimmed = text.trim()
  if (trimmed.length <= maxChars) {
    return { text: trimmed, truncated: false, originalChars: trimmed.length }
  }
  return {
    text: trimmed.slice(0, maxChars),
    truncated: true,
    originalChars: trimmed.length,
  }
}

export function estimateGenuiChatPayloadChars(
  systemPrompt: string,
  messages: { content: string }[]
): number {
  const messageChars = messages.reduce(
    (sum, m) => sum + (typeof m.content === 'string' ? m.content.length : 0),
    0
  )
  return systemPrompt.length + messageChars
}

function countLayoutPlanNodes(nodes: LayoutPlanNode[]): number {
  let n = 0
  for (const node of nodes) {
    n += 1
    if (node.children?.length) n += countLayoutPlanNodes(node.children)
  }
  return n
}

function sumLayoutPlanSourceChars(nodes: LayoutPlanNode[]): number {
  let sum = 0
  for (const node of nodes) {
    sum += node.sourceText.length
    if (node.children?.length) sum += sumLayoutPlanSourceChars(node.children)
  }
  return sum
}

function trimLeafSourceText(text: string, maxChars: number): string {
  const trimmed = text.trim()
  if (trimmed.length <= maxChars) return trimmed
  return `${trimmed.slice(0, maxChars)}${TRUNCATION_NOTE}`
}

function countPipeColumns(text: string): number {
  const header = text.split("\n").find((l) => /^\|/.test(l.trim()))
  if (!header) return 0
  return header.split("|").filter((c) => c.trim().length > 0).length
}

function leafSourceMaxChars(node: LayoutPlanNode, baseLeafMax: number): number {
  if (node.component !== "Table") return baseLeafMax
  const pipeRows = node.sourceText.split("\n").filter((l) => /^\|/.test(l.trim())).length
  const pipeCols = countPipeColumns(node.sourceText)
  if (
    node.hints?.attributeTable === "true" ||
    node.hints?.wbsDictionary === "true" ||
    node.hints?.wideTable === "true" ||
    pipeRows >= 10
  ) {
    return Math.max(baseLeafMax, 10_000, Math.min(20_000, pipeRows * 180 + pipeCols * 400))
  }
  if (pipeRows >= 6 || pipeCols >= 6) {
    return Math.max(baseLeafMax, 6_000, Math.min(14_000, pipeRows * 160))
  }
  return baseLeafMax
}

function compactLayoutPlanNode(node: LayoutPlanNode, leafMaxChars: number): LayoutPlanNode {
  const children = node.children?.map((c) =>
    compactLayoutPlanNode(c, leafSourceMaxChars(c, leafMaxChars))
  )
  const hasChildren = Boolean(children?.length)
  const effectiveLeafMax = leafSourceMaxChars(node, leafMaxChars)

  let sourceText = node.sourceText
  if (hasChildren && CONTAINER_WITH_CHILDREN.has(node.component)) {
    const hint = (node.label ?? sourceText).trim()
    sourceText = hint.slice(0, GENUI_LAYOUT_CONTAINER_SOURCE_MAX_CHARS)
  } else {
    sourceText = trimLeafSourceText(sourceText, effectiveLeafMax)
  }

  return { ...node, sourceText, children }
}

/**
 * Shrink layout-plan sourceText before serializing to the executor prompt.
 * Removes parent/child duplication and enforces a total character budget.
 */
export function compactLayoutPlanForExecutor(plan: LayoutPlan): LayoutPlan {
  const nodeCount = Math.max(1, countLayoutPlanNodes(plan.nodes))
  const leafMax = Math.max(
    1_200,
    Math.min(
      GENUI_LAYOUT_LEAF_SOURCE_MAX_CHARS,
      Math.floor(GENUI_LAYOUT_PLAN_MAX_SOURCE_CHARS / nodeCount)
    )
  )

  let nodes = plan.nodes.map((n) => compactLayoutPlanNode(n, leafMax))
  let totalChars = sumLayoutPlanSourceChars(nodes)

  if (totalChars > GENUI_LAYOUT_PLAN_MAX_SOURCE_CHARS) {
    const ratio = GENUI_LAYOUT_PLAN_MAX_SOURCE_CHARS / totalChars
    const tighterLeaf = Math.max(800, Math.floor(leafMax * ratio))
    nodes = plan.nodes.map((n) => compactLayoutPlanNode(n, tighterLeaf))
    totalChars = sumLayoutPlanSourceChars(nodes)
  }

  return {
    ...plan,
    nodes,
    sourceCoverage: {
      segmentCount: plan.sourceCoverage.segmentCount,
      totalChars,
    },
  }
}
