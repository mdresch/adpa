/**
 * Post-generation checks for OpenUI Lang executor output.
 */

import { extractOpenUILangText, looksLikeOpenUILang } from "@/lib/openui/library"

export type LangValidationResult = {
  ok: boolean
  issues: string[]
}

const FORBIDDEN_ROOT = /^\s*root\s*=\s*(Bullets|TextContent|Text|Prose)\s*\(/im

/**
 * Validate streamed/final Lang against executor constraints.
 */
export function validateExecutorLang(raw: string): LangValidationResult {
  const issues: string[] = []
  const lang = extractOpenUILangText(raw)

  if (!lang.trim()) {
    return { ok: false, issues: ["empty response"] }
  }

  if (!looksLikeOpenUILang(lang) && !/^\s*root\s*=/m.test(lang)) {
    issues.push("missing root = assignment")
  }

  if (FORBIDDEN_ROOT.test(lang)) {
    issues.push("forbidden root component (use Stack with structured children)")
  }

  if (/^\s*Report\s*\(/im.test(lang)) {
    issues.push("legacy Report(...) is not allowed")
  }

  const textContentRoots = lang.match(/^\s*root\s*=\s*TextContent/gim)
  if (textContentRoots && textContentRoots.length > 0) {
    issues.push("root must not be TextContent alone")
  }

  return { ok: issues.length === 0, issues }
}
