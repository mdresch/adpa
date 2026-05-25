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

/** Precompiled patterns (Codacy: avoid `new RegExp` with dynamic component names). */
const COMPONENT_CALL_RE: Record<string, RegExp> = {
  CardHeader: /\bCardHeader\s*\(/g,
  TextContent: /\bTextContent\s*\(/g,
  Table: /\bTable\s*\(/g,
  Bullets: /\bBullets\s*\(/g,
  TwoColumnProse: /\bTwoColumnProse\s*\(/g,
  TableOfContents: /\bTableOfContents\s*\(/g,
  ReportCoverHero: /\bReportCoverHero\s*\(/g,
  Comparison: /\bComparison\s*\(/g,
  Team: /\bTeam\s*\(/g,
}

const BULLETS_STYLE_VALUES = new Set(["bullet", "numbered", "checklist"])

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
  const re = COMPONENT_CALL_RE[spec.name]
  if (!re) return lang
  re.lastIndex = 0
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

export function isArrayLikeLangArg(arg: string): boolean {
  const t = arg.trim()
  return t.startsWith("[") && t.endsWith("]")
}

function escapeLangStringLiteral(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
}

/** Strip **bold** and `backticks` inside Lang double-quoted strings (breaks some parsers). */
export function stripInlineMarkdownInLangStrings(lang: string): string {
  return lang.replace(/"((?:[^"\\]|\\.)*)"/g, (match, raw: string) => {
    const inner = raw.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\")
    const cleaned = inner.replace(/\*\*/g, "").replace(/`/g, "'")
    if (cleaned === inner) return match
    return `"${escapeLangStringLiteral(cleaned)}"`
  })
}

/** True when Bullets(...) already has a 2+ item array (do not plan-overwrite). */
export function bulletsCallHasCompleteItems(inner: string): boolean {
  const args = splitTopLevelLangArgs(inner)
  const arrayArg = args.find(isArrayLikeLangArg)
  if (!arrayArg) return false
  const body = arrayArg.trim().replace(/^\[|\]$/g, "").trim()
  if (!body) return false
  return splitTopLevelLangArgs(body).length >= 2
}

/** True when TableOfContents(...) already has an entries array. */
export function tableOfContentsCallHasEntries(inner: string): boolean {
  if (/\bentries\s*=/.test(inner)) return true
  const args = splitTopLevelLangArgs(inner)
  return args.some(isArrayLikeLangArg)
}

function isBulletsStyleArg(arg: string): boolean {
  const t = arg.trim().replace(/^["']|["']$/g, "")
  return BULLETS_STYLE_VALUES.has(t)
}

function quoteBulletsStyle(style: string): string {
  const bare = style.trim().replace(/^["']|["']$/g, "")
  const normalized = BULLETS_STYLE_VALUES.has(bare) ? bare : "bullet"
  return `"${normalized}"`
}

function formatBulletsThreeArg(title: string | null, style: string, itemsArray: string): string {
  const titlePart = title == null || title.trim() === "null" ? "null" : title.trim()
  return `Bullets(${titlePart}, ${quoteBulletsStyle(style)}, ${itemsArray})`
}

/** Coalesce excess positional strings into items=[...]; normalize named items= to 3 positionals. */
function sanitizeBulletsCallInner(inner: string): string {
  const rawArgs = splitTopLevelLangArgs(inner)
  if (rawArgs.length === 0) return formatBulletsThreeArg(null, "bullet", "[]")

  const hasNamed = rawArgs.some((a) => parseNamedArg(a) !== null)
  if (hasNamed) {
    const map = new Map<string, string>()
    for (const a of rawArgs) {
      const named = parseNamedArg(a)
      if (named) map.set(named.key, named.value)
    }
    const title = map.get("title") ?? null
    const style = map.get("style") ?? "bullet"
    const itemsVal = map.get("items")?.trim()
    if (itemsVal && isArrayLikeLangArg(itemsVal)) {
      return formatBulletsThreeArg(title, style, itemsVal)
    }
    if (itemsVal) {
      const innerItems = itemsVal.replace(/^\[|\]$/g, "").trim()
      const parts = innerItems ? splitTopLevelLangArgs(innerItems) : []
      if (parts.length >= 1) {
        return formatBulletsThreeArg(title, style, `[${parts.join(", ")}]`)
      }
    }
  }

  let i = 0
  let title: string | null = null
  if (rawArgs[i]?.trim() === "null") {
    title = "null"
    i++
  } else if (rawArgs[i]?.trim().startsWith('"') || rawArgs[i]?.trim().startsWith("'")) {
    title = rawArgs[i]!.trim()
    i++
  }

  let style = "bullet"
  if (i < rawArgs.length && isBulletsStyleArg(rawArgs[i]!)) {
    style = rawArgs[i]!.trim().replace(/^["']|["']$/g, "")
    i++
  }

  if (i < rawArgs.length && isArrayLikeLangArg(rawArgs[i]!)) {
    return formatBulletsThreeArg(title, style, rawArgs[i]!.trim())
  }

  const stringItems = rawArgs.slice(i).filter((a) => {
    const t = a.trim()
    return t.startsWith('"') || t.startsWith("'")
  })
  if (stringItems.length >= 1) {
    return formatBulletsThreeArg(title, style, `[${stringItems.join(", ")}]`)
  }

  if (rawArgs.length === 3 && isArrayLikeLangArg(rawArgs[2]!)) {
    return `Bullets(${rawArgs[0]}, ${quoteBulletsStyle(rawArgs[1]!)}, ${rawArgs[2]})`
  }

  return formatBulletsThreeArg(title, style, "[]")
}

/** Extract a named string prop even when the value contains commas. */
function extractNamedLangString(inner: string, key: string): string | null {
  const re = new RegExp(`\\b${key}\\s*=\\s*"((?:[^"\\\\]|\\\\.)*)"`)
  const m = inner.match(re)
  if (!m) return null
  return `"${m[1]}"`
}

function findMatchingBracket(
  source: string,
  openIndex: number,
  openCh: string,
  closeCh: string
): number {
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
    if (ch === openCh) depth++
    else if (ch === closeCh) {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

function extractNamedLangArray(inner: string, key: string): string | null {
  const keyMatch = inner.match(new RegExp(`\\b${key}\\s*=\\s*\\[`))
  if (!keyMatch || keyMatch.index == null) return null
  const openBracket = inner.indexOf("[", keyMatch.index)
  const closeBracket = findMatchingBracket(inner, openBracket, "[", "]")
  if (closeBracket < 0) return null
  return inner.slice(openBracket, closeBracket + 1)
}

function sanitizeTwoColumnProseCallInner(inner: string): string {
  const left = extractNamedLangString(inner, "left")
  const right = extractNamedLangString(inner, "right")
  if (left && right) return `TwoColumnProse(${left}, ${right})`

  const rawArgs = splitTopLevelLangArgs(inner)
  if (rawArgs.length === 2) {
    return `TwoColumnProse(${rawArgs[0]}, ${rawArgs[1]})`
  }
  if (rawArgs.length > 2) {
    const mid = Math.ceil(rawArgs.length / 2)
    const joinParts = (parts: string[]) => {
      const texts = parts
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => {
          const t = p.trim()
          if (t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1)
          if (t.startsWith("'") && t.endsWith("'")) return t.slice(1, -1)
          return t
        })
      const joined = texts.join(", ").replace(/\\"/g, '"')
      return `"${joined.replace(/"/g, '\\"')}"`
    }
    return `TwoColumnProse(${joinParts(rawArgs.slice(0, mid))}, ${joinParts(rawArgs.slice(mid))})`
  }
  return `TwoColumnProse("", "")`
}

function sanitizeTableOfContentsCallInner(inner: string): string {
  const titleFromNamed = extractNamedLangString(inner, "title")
  let titleArg =
    titleFromNamed ??
    (/\btitle\s*=\s*null\b/.test(inner) ? "null" : '"Table of Contents"')

  const rawArgs = splitTopLevelLangArgs(inner)
  if (rawArgs[0]?.trim() === "null") {
    titleArg = "null"
  }

  const entriesArray = extractNamedLangArray(inner, "entries")
  if (entriesArray) return `TableOfContents(${titleArg}, ${entriesArray})`
  const entryObjects = rawArgs.filter((a) => a.trim().startsWith("{"))
  if (entryObjects.length >= 2) {
    return `TableOfContents(${titleArg}, [${entryObjects.join(", ")}])`
  }

  if (rawArgs.length === 2 && isArrayLikeLangArg(rawArgs[1]!)) {
    return `TableOfContents(${rawArgs[0]}, ${rawArgs[1]})`
  }

  return `TableOfContents(${titleArg}, [])`
}

/** Extract a top-level `[...]` sides array (respects nesting and strings). */
function extractLeadingLangArray(inner: string): string | null {
  const trimmed = inner.trim()
  if (!trimmed.startsWith("[")) return null
  const close = findMatchingBracket(trimmed, 0, "[", "]")
  if (close < 0) return null
  return trimmed.slice(0, close + 1)
}

function formatComparisonTwoArg(title: string | null, sidesArray: string): string {
  const titlePart =
    title == null || title.trim() === "null" ? "null" : title.trim()
  return `Comparison(${titlePart}, ${sidesArray})`
}

function sanitizeComparisonCallInner(inner: string): string {
  const titleFromNamed = extractNamedLangString(inner, "title")
  const titleArg =
    titleFromNamed ??
    (/\btitle\s*=\s*null\b/.test(inner) ? "null" : null)

  const sidesNamed = extractNamedLangArray(inner, "sides")
  if (sidesNamed) {
    return formatComparisonTwoArg(titleArg, sidesNamed)
  }

  const leadingArray = extractLeadingLangArray(inner)
  if (leadingArray) {
    return formatComparisonTwoArg(titleArg, leadingArray)
  }

  const rawArgs = splitTopLevelLangArgs(inner)
  if (rawArgs.length === 2 && isArrayLikeLangArg(rawArgs[1]!)) {
    return formatComparisonTwoArg(rawArgs[0]!.trim(), rawArgs[1]!.trim())
  }

  if (rawArgs.length === 1 && isArrayLikeLangArg(rawArgs[0]!)) {
    return formatComparisonTwoArg(titleArg, rawArgs[0]!.trim())
  }

  const bracketStart = inner.indexOf("[")
  if (bracketStart >= 0) {
    const close = findMatchingBracket(inner, bracketStart, "[", "]")
    if (close >= 0) {
      const sides = inner.slice(bracketStart, close + 1)
      const title =
        titleArg ??
        (rawArgs[0]?.trim().startsWith('"') || rawArgs[0]?.trim().startsWith("'")
          ? rawArgs[0]!.trim()
          : null)
      return formatComparisonTwoArg(title, sides)
    }
  }

  const sideObjects = rawArgs.filter((a) => a.trim().startsWith("{"))
  if (sideObjects.length >= 2) {
    return formatComparisonTwoArg(
      titleArg,
      `[${sideObjects.join(", ")}]`
    )
  }

  return formatComparisonTwoArg(titleArg, "[]")
}

function sanitizeReportCoverHeroCallInner(inner: string): string {
  const imageUrl = extractNamedLangString(inner, "imageUrl")
  const alt = extractNamedLangString(inner, "alt") ?? '"Report cover"'
  const variantMatch = inner.match(/\bvariant\s*=\s*"(cover|section|thumb)"/)
  if (imageUrl) {
    if (variantMatch) {
      return `ReportCoverHero(${imageUrl}, ${alt}, "${variantMatch[1]}")`
    }
    return `ReportCoverHero(${imageUrl}, ${alt})`
  }

  const rawArgs = splitTopLevelLangArgs(inner)
  if (rawArgs.length >= 2) {
    const third = rawArgs[2]?.trim().replace(/^["']|["']$/g, "")
    if (third && ["cover", "section", "thumb"].includes(third)) {
      return `ReportCoverHero(${rawArgs[0]}, ${rawArgs[1]}, "${third}")`
    }
    return `ReportCoverHero(${rawArgs[0]}, ${rawArgs[1]})`
  }
  return `ReportCoverHero("", ${alt})`
}

function sanitizeExtensionComponentCalls(
  lang: string,
  componentName: keyof typeof COMPONENT_CALL_RE,
  sanitizeInner: (inner: string) => string
): string {
  const re = COMPONENT_CALL_RE[componentName]
  if (!re) return lang
  re.lastIndex = 0
  let result = ""
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = re.exec(lang)) !== null) {
    const openParen = match.index + match[0].length - 1
    const closeParen = findMatchingParen(lang, openParen)
    if (closeParen < 0) continue

    result += lang.slice(lastIndex, match.index)
    const inner = lang.slice(openParen + 1, closeParen)
    result += sanitizeInner(inner)
    lastIndex = closeParen + 1
    re.lastIndex = lastIndex
  }

  result += lang.slice(lastIndex)
  return result
}

function sanitizeTwoColumnProseCalls(lang: string): string {
  return sanitizeExtensionComponentCalls(lang, "TwoColumnProse", sanitizeTwoColumnProseCallInner)
}

function sanitizeTableOfContentsCalls(lang: string): string {
  return sanitizeExtensionComponentCalls(lang, "TableOfContents", sanitizeTableOfContentsCallInner)
}

function sanitizeReportCoverHeroCalls(lang: string): string {
  return sanitizeExtensionComponentCalls(lang, "ReportCoverHero", sanitizeReportCoverHeroCallInner)
}

function sanitizeComparisonCalls(lang: string): string {
  return sanitizeExtensionComponentCalls(lang, "Comparison", sanitizeComparisonCallInner)
}

function formatTeamTwoArg(title: string | null, membersArray: string): string {
  const titlePart =
    title == null || title.trim() === "null" ? "null" : title.trim()
  return `Team(${titlePart}, ${membersArray})`
}

function sanitizeTeamCallInner(inner: string): string {
  const titleFromNamed = extractNamedLangString(inner, "title")
  const titleArg =
    titleFromNamed ??
    (/\btitle\s*=\s*null\b/.test(inner) ? "null" : null)

  const membersNamed = extractNamedLangArray(inner, "members")
  if (membersNamed) {
    return formatTeamTwoArg(titleArg, membersNamed)
  }

  const leadingArray = extractLeadingLangArray(inner)
  if (leadingArray) {
    return formatTeamTwoArg(titleArg ?? "null", leadingArray)
  }

  const rawArgs = splitTopLevelLangArgs(inner)
  if (rawArgs.length === 2 && isArrayLikeLangArg(rawArgs[1]!)) {
    return formatTeamTwoArg(rawArgs[0]!.trim(), rawArgs[1]!.trim())
  }

  if (rawArgs.length === 1 && isArrayLikeLangArg(rawArgs[0]!)) {
    return formatTeamTwoArg(titleArg, rawArgs[0]!.trim())
  }

  const memberObjects = rawArgs.filter((a) => a.trim().startsWith("{"))
  if (memberObjects.length >= 1) {
    const first = rawArgs[0]?.trim()
    let title: string | null = titleArg
    if (first === "null") {
      title = "null"
    } else if (first?.startsWith('"') || first?.startsWith("'")) {
      title = first
    } else if (title == null) {
      title = "null"
    }
    return formatTeamTwoArg(title, `[${memberObjects.join(", ")}]`)
  }

  return formatTeamTwoArg(titleArg, "[]")
}

function sanitizeTeamCalls(lang: string): string {
  return sanitizeExtensionComponentCalls(lang, "Team", sanitizeTeamCallInner)
}

function sanitizeBulletsCalls(lang: string): string {
  const re = COMPONENT_CALL_RE.Bullets
  if (!re) return lang
  re.lastIndex = 0
  let result = ""
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = re.exec(lang)) !== null) {
    const openParen = match.index + match[0].length - 1
    const closeParen = findMatchingParen(lang, openParen)
    if (closeParen < 0) continue

    result += lang.slice(lastIndex, match.index)
    const inner = lang.slice(openParen + 1, closeParen)
    result += sanitizeBulletsCallInner(inner)
    lastIndex = closeParen + 1
    re.lastIndex = lastIndex
  }

  result += lang.slice(lastIndex)
  return result
}

export function findMatchingParen(source: string, openIndex: number): number {
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
 * Replace `nodeId = ComponentName(...)` with `nodeId = replacementCall` using balanced-paren scan.
 */
export function replaceLangNodeAssignment(
  lang: string,
  nodeId: string,
  componentName: string,
  replacementCall: string
): string {
  const idEsc = nodeId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const compEsc = componentName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const re = new RegExp(`\\b${idEsc}\\s*=\\s*${compEsc}\\s*\\(`, "g")
  let match: RegExpExecArray | null
  let out = lang
  let offset = 0

  while ((match = re.exec(lang)) !== null) {
    const openParen = match.index + match[0].length - 1
    const closeParen = findMatchingParen(lang, openParen)
    if (closeParen < 0) continue

    const start = match.index
    const end = closeParen + 1
    const replacement = `${nodeId} = ${replacementCall}`
    out = out.slice(0, start + offset) + replacement + out.slice(end + offset)
    offset += replacement.length - (end - start)
    re.lastIndex = start + replacement.length
  }

  return out
}

/**
 * Fix CardHeader / TextContent arity and convert named props to positional strings.
 */
export function sanitizeOpenUILang(lang: string): string {
  if (!lang.trim()) return lang
  let out = stripInlineMarkdownInLangStrings(lang)
  out = sanitizeComponentCalls(out, CARD_HEADER)
  out = sanitizeComponentCalls(out, TEXT_CONTENT)
  out = sanitizeComponentCalls(out, TABLE)
  out = sanitizeBulletsCalls(out)
  out = sanitizeTwoColumnProseCalls(out)
  out = sanitizeTableOfContentsCalls(out)
  out = sanitizeReportCoverHeroCalls(out)
  out = sanitizeComparisonCalls(out)
  out = sanitizeTeamCalls(out)
  return out
}

/** @deprecated Use sanitizeOpenUILang */
export function sanitizeCardHeaderCalls(lang: string): string {
  return sanitizeComponentCalls(lang, CARD_HEADER)
}
