    Carousel: [
      /\b(carousel|gallery|slideshow|slide|rotate|image|album|portfolio)/i,
      /\b(before and after|comparison|alternative|option|choose)/i,
    ],
    Alert: [
      /\b(alert|warning|error|critical|caution|important|notice|attention|success)/i,
      /\b(watch out|be aware|note|remember|info|information)/i,
    ],
    Steps: [
      /\b(step|steps|process|workflow|sequence|guide|instruction|how to|procedure)/i,
      /\b(progress|stage|phase|milestone|checkpoint)/i,
    ],
    Breadcrumb: [
      /\b(breadcrumb|navigation|path|location|hierarchy|navigate back|where am i)/i,
      /\b(route|trail|origin|destination)/i,
    ],
    Sidebar: [
      /\b(sidebar|panel|filter|option|menu|navigation|search|refine|category)/i,
      /\b(filter by|narrow down|organize)/i,
    ],
    Comparison: [
      /\b(compare|comparison|versus|vs|difference|similar|opposite|alternative|pros cons|advantage)/i,
      /\b(which|better|choose between|side by side)/i,
    ],
    Calendar: [
      /\b(calendar|schedule|availability|booking|appointment|event|when|deadline|due date|sprint|iteration)/i,
      /\b(date|dates|scheduled|upcoming|this week|this month|milestone|recurring)/i,
    ],
    Team: [
      /\b(team|member|people|participant|who|assignee|contributor|staff|crew|roster|person|personnel)/i,
      /\b(assigned to|owner|responsible|stakeholder|contact|directory|profile|avatar)/i,
    ],
    Text: [
      /\b(explain|describe|tell|write|answer|question|help|summary|overview)/i,
    ],
    /\b(timeline|schedule|gantt|sequence|order|when|dates|deadline|milestone|phase)\b/i,
    /\b(roadmap|plan|progression|workflow|process)\b/i,
  ],
  Kanban: [
    /\b(kanban|board|column|status|stage|workflow|pipeline|progress)\b/i,
    /\b(todo|doing|done|backlog|queue)\b/i,
  ],
  Bullets: [
    /\b(list|bullet|point|outline|summary|items|breakdown|checklist|features|benefits|requirements|steps)\b/i,
    /\b(key point|highlight|takeaway|summary)\b/i,
  ],
  Tabs: [
    /\b(tab|section|category|categories|navigation|compare|comparison|different view|switch between)\b/i,
    /\b(multiple section|organize|group|segment)\b/i,
  ],
  Accordion: [
    /\b(accordion|expandable|collapse|collapsible|detail|toggle|faq|question|answer)\b/i,
    /\b(expand|hide|reveal|section|more information)\b/i,
  ],
  Carousel: [
    /\b(carousel|gallery|slideshow|slide|rotate|image|album|portfolio)/i,
    /\b(before and after|comparison|alternative|option|choose)/i,
  ],
  Alert: [
    /\b(alert|warning|error|critical|caution|important|notice|attention|success)/i,
    /\b(watch out|be aware|note|remember|info|information)/i,
  ],
  Steps: [
    /\b(step|steps|process|workflow|sequence|guide|instruction|how to|procedure)/i,
    /\b(progress|stage|phase|milestone|checkpoint)/i,
  ],
  Carousel: [
    /\b(carousel|gallery|slideshow|slide|rotate|image|album|portfolio)/i,
    /\b(before and after|comparison|alternative|option|choose)/i,
  ],
  Alert: [
    /\b(alert|warning|error|critical|caution|important|notice|attention|success)/i,
    /\b(watch out|be aware|note|remember|info|information)/i,
  ],
  Steps: [
    /\b(step|steps|process|workflow|sequence|guide|instruction|how to|procedure)/i,
    /\b(progress|stage|phase|milestone|checkpoint)/i,
  ],
  Breadcrumb: [
    /\b(breadcrumb|navigation|path|location|hierarchy|navigate back|where am i)/i,
    /\b(route|trail|origin|destination)/i,
  ],
  Sidebar: [
    /\b(sidebar|panel|filter|option|menu|navigation|search|refine|category)/i,
    /\b(filter by|narrow down|organize)/i,
  ],
  Comparison: [
    /\b(compare|comparison|versus|vs|difference|similar|opposite|alternative|pros cons|advantage)/i,
    /\b(which|better|choose between|side by side)/i,
  ],
  Text: [
    /\b(explain|describe|tell|write|answer|question|help|summary|overview)/i,
  ],
function scoreComponent(componentType: ComponentType, context: ComponentSelectionContext): number {
  let score = 0

  for (const regex of COMPONENT_KEYWORDS[componentType]) {
    if (regex.test(context.prompt)) {
      score += 10
    }

    if (context.threadHistory && regex.test(context.threadHistory)) {
      score += 5
    }
  }

  // Bonus for specific signals
  if (componentType === "Table" && context.dataPoints && context.dataPoints > 3) {
    score += 5
  }

  if (componentType === "Chart" && context.dataPoints && context.dataPoints > 5) {
    score += 10
  }

  if (componentType === "Timeline" && /\b(phase|stage|month|quarter|year)\b/i.test(context.prompt)) {
    score += 10
  }

  return score
}

/**
 * Select the best component type for the given context
 * Falls back to Text if no strong match
 */
export function selectComponentType(context: ComponentSelectionContext): ComponentType {
  const components: ComponentType[] = [
    "Table", "Chart", "Form", "Card", "Timeline", "Kanban",
    "Bullets", "Tabs", "Accordion", "Carousel", "Alert",
    "Steps", "Breadcrumb", "Sidebar", "Comparison",
    "Calendar", "Team", "Text",
  ]

  let bestComponent: ComponentType = "Text"
  let bestScore = 0

  for (const component of components) {
    const score = scoreComponent(component, context)
    if (score > bestScore) {
      bestScore = score
      bestComponent = component
    }
  }

  // If score is too low, default to Text
  if (bestScore < 3) {
    return "Text"
  }

  return bestComponent
}

/**
 * Build suggested follow-up prompts based on component type
 */
export function suggestFollowUps(componentType: ComponentType, prompt: string): string[] {
  const suggestions: Record<ComponentType, string[]> = {
    Table: [
      "Can you sort by importance?",
      "Filter to high-priority items",
      "Show only open items",
      "Group by category",
    ],
    Chart: [
      "Can you add a trend line?",
      "Show comparison to last quarter",
      "Break down by category",
      "Create an interactive version",
    ],
    Form: [
      "Pre-fill common values",
      "Add validation rules",
      "Create a template",
      "Generate a checklist",
    ],
    Card: [
      "Expand with more details",
      "Create a card for each item",
      "Add action buttons",
      "Show metrics",
    ],
    Timeline: [
      "Add dependencies",
      "Mark critical path",
      "Show resource allocation",
      "Create milestone view",
    ],
    Kanban: [
      "Add due dates",
      "Assign owners",
      "Show dependencies",
      "Add priority indicators",
    ],
    Accordion: [
      "Expand all sections",
      "Show summary view",
      "Add search functionality",
    ],
    Carousel: [
      "Show all items at once",
      "Add navigation controls",
      "Enable auto-play",
    ],
    Alert: [
      "Show more details",
      "Create an action plan",
      "Set up notifications",
    ],
    Steps: [
      "Show progress percentage",
      "Add time estimates",
      "Mark completed steps",
    ],
    Breadcrumb: [
      "Show full hierarchy",
      "Add quick navigation",
      "Show related paths",
    ],
    Sidebar: [
      "Apply all filters",
      "Save filter preset",
      "Reset filters",
    ],
    Comparison: [
      "Add more options",
      "Show detailed breakdown",
      "Create recommendation",
    ],
    Calendar: [
      "Show conflicts",
      "Export to calendar",
      "Set reminders",
    ],
    Team: [
      "Show availability",
      "Assign tasks",
      "View workload",
    ],
    Bullets: [
      "Convert to checklist",
      "Expand with details",
      "Prioritize items",
    ],
    Tabs: [
      "Merge all tabs",
      "Export all sections",
      "Add new tab",
    ],
    Text: [
      "Summarize into bullets",
      "Create a visual timeline",
      "Make a checklist",
      "Generate a table",
    ],
  }
  return suggestions[componentType]?.slice(0, 3) || []
}
