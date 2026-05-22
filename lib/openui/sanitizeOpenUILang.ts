/**
 * Deterministic fixes for common LLM mistakes in OpenUI Lang before parse/render.
 * OpenUI Lang uses POSITIONAL args only — named/colon syntax is not supported.
 */

type ComponentSanitizeSpec = {
  name: string
  maxArgs: number
  namedKeys: string[]
  stripSecondIf?: (arg: string) => boolean
}

const CARD_HEADER: ComponentSanitizeSpec = {
  name: "CardHeader",
  maxArgs: 2,
  namedKeys: ["title", "subtitle"],
  stripSecondIf: isDefaultSizeArg,
}

const TEXT_CONTENT: ComponentSanitizeSpec = {
  name: "TextContent",
  maxArgs: 2,
  namedKeys: ["text", "size"],
}

/** GenUI Table is column-oriented: Table([Col(...), Col(...)]). No caption/title second arg. */
const TABLE: ComponentSanitizeSpec = {
  name: "Table",
  maxArgs: 1,
  namedKeys: ["columns"],
}

function isDefaultSizeArg(arg: string): boolean {
  const t = arg.trim()
  return t === "default" || t === '"default"' || t === "'default'"
}

/** Split function-call argument list at top-level commas (respects nesting and strings). */
export function splitTopLevelLangArgs(inner: string): string[] {
  const args: string[] = []
  let depth = 0
  let start = 0
  let inString: '"' | "'" | null = null
  let escape = false

  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i]
    if (inString) {
      if (escape) {
        escape = false
        continue
      }
      if (ch === "\\") {
        escape = true
        continue
      }
      if (ch === inString) inString = null
      continue
    }
    if (ch === '"' || ch === "'") {
      inString = ch
      continue
    }
    if (ch === "(" || ch === "[" || ch === "{") {
      depth++
      continue
    }
    if (ch === ")" || ch === "]" || ch === "}") {
      depth--
      continue
    }
    if (ch === "," && depth === 0) {
      const part = inner.slice(start, i).trim()
      if (part) args.push(part)
      start = i + 1
    }
  }

  const last = inner.slice(start).trim()
  if (last) args.push(last)
  return args
}

function parseNamedArg(arg: string): { key: string; value: string } | null {
  const m = arg.trim().match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/s)
  if (!m) return null
  return { key: m[1], value: m[2].trim() }
}

function normalizeArgs(spec: ComponentSanitizeSpec, rawArgs: string[]): string[] {
  const hasNamed = rawArgs.some((a) => parseNamedArg(a) !== null)
  let ordered: string[]

  if (hasNamed) {
    const map = new Map<string, string>()
    const positionalExtras: string[] = []
    for (const a of rawArgs) {
      const named = parseNamedArg(a)
      if (named) map.set(named.key, named.value)
      else positionalExtras.push(a)
    }
    ordered = spec.namedKeys
      .map((k) => map.get(k))
      .filter((v): v is string => v != null && v !== "")
    if (ordered.length === 0 && positionalExtras.length > 0) {
      ordered = positionalExtras
    }
  } else {
    ordered = [...rawArgs]
  }

  if (spec.stripSecondIf && ordered.length >= 2 && spec.stripSecondIf(ordered[1])) {
    ordered = [ordered[0]]
  }

  if (ordered.length > spec.maxArgs) {
    ordered = ordered.slice(0, spec.maxArgs)
  }

  return ordered
}

function sanitizeComponentCalls(lang: string, spec: ComponentSanitizeSpec): string {
  const re = new RegExp(`\\b${spec.name}\\s*\\(`, "g")
  let result = ""
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = re.exec(lang)) !== null) {
    const openParen = match.index + match[0].length - 1
    const closeParen = findMatchingParen(lang, openParen)
    if (closeParen < 0) continue

    result += lang.slice(lastIndex, match.index)
    const inner = lang.slice(openParen + 1, closeParen)
    const normalized = normalizeArgs(spec, splitTopLevelLangArgs(inner))
    result += `${spec.name}(${normalized.join(", ")})`
    lastIndex = closeParen + 1
    re.lastIndex = lastIndex
  }

  result += lang.slice(lastIndex)
  return result
}

function findMatchingParen(source: string, openIndex: number): number {
  let depth = 0
  let inString: '"' | "'" | null = null
  let escape = false

  for (let i = openIndex; i < source.length; i++) {
    const ch = source[i]
    if (inString) {
      if (escape) {
        escape = false
        continue
      }
      if (ch === "\\") {
        escape = true
        continue
      }
      if (ch === inString) inString = null
      continue
    }
    if (ch === '"' || ch === "'") {
      inString = ch
      continue
    }
    if (ch === "(") depth++
    else if (ch === ")") {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

/**
 * Fix CardHeader / TextContent arity and convert named props to positional strings.
 */
export function sanitizeOpenUILang(lang: string): string {
  if (!lang.trim()) return lang
  let out = sanitizeComponentCalls(lang, CARD_HEADER)
  out = sanitizeComponentCalls(out, TEXT_CONTENT)
  out = sanitizeComponentCalls(out, TABLE)
  return out
}

/** @deprecated Use sanitizeOpenUILang */
export function sanitizeCardHeaderCalls(lang: string): string {
  return sanitizeComponentCalls(lang, CARD_HEADER)
}
