import OpenAI from "openai"
import {
  getGenuiOpenAIClientConfig,
  resolveGenuiLlmProvider,
} from "@/lib/llm/genuiLlmProvider"
import { COVER_SUMMARY_MAX_CHARS, buildCoverBlurb } from "@/lib/openui/coverSummary"

const COVER_SUMMARY_SYSTEM = `You write short cover blurbs for governance report cards shown before the table of contents.
Rules:
- 2–4 sentences only; plain prose (no headings, bullets, or markdown).
- Teaser tone: what the document is about and why it matters — not a full executive summary.
- Maximum ${COVER_SUMMARY_MAX_CHARS} characters.
- Do not invent facts, metrics, or names not present in the excerpt.`

export type GenerateCoverSummaryInput = {
  documentTitle?: string
  /** Document excerpt (will be trimmed server-side). */
  content: string
  /** Heuristic blurb used when the model call fails. */
  fallbackBlurb?: string
}

export type GenerateCoverSummaryResult = {
  summary: string
  source: "ai" | "fallback"
}

export async function generateCoverSummary(
  input: GenerateCoverSummaryInput
): Promise<GenerateCoverSummaryResult> {
  const fallback =
    input.fallbackBlurb?.trim() ||
    buildCoverBlurb(input.content.slice(0, 1200))

  const excerpt = input.content.trim().slice(0, 8000)
  if (!excerpt) {
    return { summary: fallback, source: "fallback" }
  }

  const provider = resolveGenuiLlmProvider()
  const config = getGenuiOpenAIClientConfig(provider)
  if ("error" in config) {
    return { summary: fallback, source: "fallback" }
  }

  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  })

  const titleLine = input.documentTitle?.trim()
    ? `Document title: ${input.documentTitle.trim()}`
    : ""

  try {
    const completion = await client.chat.completions.create({
      model: config.model,
      messages: [
        { role: "system", content: COVER_SUMMARY_SYSTEM },
        {
          role: "user",
          content: [titleLine, "", "Excerpt:", excerpt].filter(Boolean).join("\n"),
        },
      ],
      max_tokens: 220,
      temperature: 0.3,
    })

    const raw = completion.choices[0]?.message?.content?.trim() ?? ""
    if (!raw) {
      return { summary: fallback, source: "fallback" }
    }

    const capped = buildCoverBlurb(raw, { maxChars: COVER_SUMMARY_MAX_CHARS })
    return { summary: capped || fallback, source: "ai" }
  } catch {
    return { summary: fallback, source: "fallback" }
  }
}
