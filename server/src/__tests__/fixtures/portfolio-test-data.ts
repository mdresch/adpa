export const testCriteria = [
  {
    name: "Strategic Alignment",
    description: "How well does this align with organizational strategy?",
    weight: 1.5,
    min_score: 1,
    max_score: 5,
  },
  {
    name: "ROI Potential",
    description: "Expected return on investment",
    weight: 1.3,
    min_score: 1,
    max_score: 5,
  },
  {
    name: "Risk Level",
    description: "Overall project risk (higher score = lower risk)",
    weight: 1.0,
    min_score: 1,
    max_score: 5,
  },
  {
    name: "Resource Availability",
    description: "Can we staff this project adequately?",
    weight: 1.2,
    min_score: 1,
    max_score: 5,
  },
] as const

export const testProjects = [
  {
    name: "Project Alpha",
    description: "Customer portal modernization",
    status: "planning",
    budget: 500000,
    scores: {
      "Strategic Alignment": { score: 5, rationale: "Critical to customer experience strategy" },
      "ROI Potential": { score: 4, rationale: "Expected 20% efficiency gain" },
      "Risk Level": { score: 3, rationale: "Medium complexity, proven tech stack" },
      "Resource Availability": { score: 4, rationale: "Team available Q2" },
    },
  },
  {
    name: "Project Beta",
    description: "Internal tools automation",
    status: "active",
    budget: 250000,
    scores: {
      "Strategic Alignment": { score: 3, rationale: "Nice to have, not mission-critical" },
      "ROI Potential": { score: 5, rationale: "High productivity gains" },
      "Risk Level": { score: 5, rationale: "Low risk, small scope" },
      "Resource Availability": { score: 5, rationale: "Dedicated team ready" },
    },
  },
  {
    name: "Project Gamma",
    description: "AI-powered analytics platform",
    status: "planning",
    budget: 1200000,
    scores: {
      "Strategic Alignment": { score: 5, rationale: "Key differentiator for competitive advantage" },
      "ROI Potential": { score: 3, rationale: "Uncertain market adoption" },
      "Risk Level": { score: 2, rationale: "High technical complexity" },
      "Resource Availability": { score: 2, rationale: "Need to hire specialized talent" },
    },
  },
  {
    name: "Project Delta",
    description: "Legacy system migration",
    status: "planning",
    budget: 800000,
    scores: {
      "Strategic Alignment": { score: 4, rationale: "Technical debt reduction priority" },
      "ROI Potential": { score: 2, rationale: "Cost avoidance, not revenue generation" },
      "Risk Level": { score: 2, rationale: "Complex dependencies" },
      "Resource Availability": { score: 3, rationale: "Requires specialized mainframe knowledge" },
    },
  },
] as const

