import { marked } from "marked"

// Simplified mapping for export icons (text-based for simplicity in PDF/Word/Print)
const ENTITY_TYPE_ICONS: Record<string, string> = {
  stakeholders: "👥",
  risks: "⚠️",
  deliverables: "📦",
  milestones: "🚩",
  constraints: "🛡️",
  requirements: "✅",
  resources: "💼",
  activities: "📝",
  work_items: "📝",
  success_criteria: "🏆",
  scope_verification: "🏆",
  best_practices: "💡",
  opportunities: "💡",
  scope_items: "🎯",
  phases: "📚",
  project_iterations: "📚",
  performance_measurements: "📈",
  earned_value_metrics: "📈",
  technologies: "💻",
  team_agreements: "🤝",
  capacity_plans: "📅",
  risk_responses: "⚡",
}

const ENTITY_COLORS: Record<string, string> = {
  stakeholders: "#dbeafe", // blue-100
  risks: "#fee2e2", // red-100
  deliverables: "#dcfce7", // green-100
  milestones: "#f3e8ff", // purple-100
  constraints: "#ffedd5", // orange-100
  requirements: "#ccfbf1", // teal-100
  resources: "#e0e7ff", // indigo-100
  activities: "#e0f2fe", // sky-100
  work_items: "#e0f2fe", // sky-100
  success_criteria: "#d1fae5", // emerald-100
}

const DEFAULT_COLOR = "#f3f4f6" // gray-100

/**
 * Renders H8 tags into visual pills for export formats.
 * This removes the JSON metadata and provides a static representation.
 */
export function renderH8TagsForExport(content: string, format: 'html' | 'text' = 'html'): string {
  if (!content) return ""

  const h8Regex = /^########\s+([a-zA-Z0-9_-]+):\s*(.*)$/gm

  return content.replace(h8Regex, (match, type, jsonStr) => {
    let data: any = {}
    try {
      data = JSON.parse(jsonStr)
    } catch (e) {
      // If parsing fails, just show the type
    }

    const displayName = data.name || data.title || type.replace(/_/g, " ")
    const icon = ENTITY_TYPE_ICONS[type.toLowerCase()] || "📄"
    const color = ENTITY_COLORS[type.toLowerCase()] || DEFAULT_COLOR

    if (format === 'html') {
      return `<span style="display: inline-flex; align-items: center; background-color: ${color}; border: 1px solid rgba(0,0,0,0.1); border-radius: 4px; padding: 2px 8px; margin: 0 4px; font-size: 12px; font-weight: 500; font-family: sans-serif; vertical-align: middle;">
        <span style="margin-right: 4px;">${icon}</span>
        <span>${displayName}</span>
      </span>`
    } else {
      // For Markdown/Text export, use a readable bracket format
      return `[${icon} ${type.toUpperCase()}: ${displayName}]`
    }
  })
}

/**
 * Prepares document content for export by processing H8 tags and converting to HTML if needed.
 */
export function prepareContentForExport(markdown: string, format: 'pdf' | 'docx' | 'markdown' | 'print'): string {
  if (format === 'markdown') {
    // For external markdown export, we replace H8 with a readable text version (without JSON)
    return renderH8TagsForExport(markdown, 'text')
  }

  // For visual formats, we convert H8 to HTML pills first
  const processedMarkdown = renderH8TagsForExport(markdown, 'html')

  if (format === 'print') {
    // Print logic will handle the full HTML wrapper
    return marked.parse(processedMarkdown) as string
  }

  return processedMarkdown
}

export function getExportStyleSheet(): string {
  return `
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 800px; margin: 40px auto; padding: 0 20px; }
    h1 { font-size: 2.5rem; color: #111; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 30px; }
    h2 { font-size: 1.8rem; color: #222; margin-top: 40px; margin-bottom: 20px; }
    h3 { font-size: 1.4rem; color: #333; margin-top: 30px; margin-bottom: 15px; }
    p { margin-bottom: 1rem; }
    ul, ol { margin-bottom: 1rem; padding-left: 2rem; }
    li { margin-bottom: 0.5rem; }
    blockquote { border-left: 4px solid #ddd; padding-left: 1rem; color: #666; font-style: italic; margin: 1.5rem 0; }
    code { background: #f4f4f4; padding: 0.2rem 0.4rem; border-radius: 3px; font-family: monospace; font-size: 0.9rem; }
    pre { background: #f4f4f4; padding: 1rem; border-radius: 5px; overflow-x: auto; margin: 1.5rem 0; }
    table { border-collapse: collapse; width: 100%; margin: 1.5rem 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f8f9fa; font-weight: bold; }
    hr { border: 0; border-top: 1px solid #eee; margin: 2rem 0; }
    img { max-width: 100%; height: auto; }
    @media print {
      body { margin: 0; padding: 0; width: 100%; max-width: none; }
      .no-print { display: none; }
    }
  `
}
