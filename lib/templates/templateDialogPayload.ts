import type { Template } from "@/lib/api"

export interface TemplateParagraph {
  section_name: string
  section_type: "header" | "paragraph" | "list" | "table" | "code_block" | "summary" | "conclusion"
  description: string
  required: boolean
  order: number
  prompt_guidance?: string
}

interface BuildTemplateDialogPayloadInput {
  mode: "create" | "update"
  name: string
  description: string
  framework: string
  category: string
  promptVersion: string
  systemPrompt: string
  templateParagraphs: TemplateParagraph[]
}

function parsePromptVersion(value: string): number | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined

  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed) || parsed < 0) return undefined

  return Math.trunc(parsed)
}

export function getTemplatePromptVersionValue(
  template: Pick<Template, "prompt_version" | "version"> | null | undefined,
): string {
  if (template?.prompt_version != null) return String(template.prompt_version)
  if (template?.version != null && template.version !== "") return String(template.version)
  return "1"
}

export function buildTemplateDialogPayload({
  mode,
  name,
  description,
  framework,
  category,
  promptVersion,
  systemPrompt,
  templateParagraphs,
}: BuildTemplateDialogPayloadInput): Partial<Template> {
  const payload: Partial<Template> = {
    name,
    description,
    framework,
    category,
    system_prompt: systemPrompt,
    template_paragraphs: templateParagraphs,
  }

  const parsedPromptVersion = parsePromptVersion(promptVersion)
  if (parsedPromptVersion !== undefined) {
    payload.prompt_version = parsedPromptVersion
  }

  if (mode === "create") {
    payload.content = { blocks: [] }
    payload.variables = []
    payload.is_public = false
  }

  return payload
}
