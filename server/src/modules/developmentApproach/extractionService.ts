/**
 * Development Approach Extraction Service
 * Purpose: Extract development approach metadata from project documents using AI
 * Domain: Development Approach & Life Cycle Performance Domain
 * Created: January 15, 2026
 */

import { logger } from '../../utils/logger';
import { DevelopmentApproach } from './types';
import { validateDevelopmentApproach } from './validation';
import { aiService } from '../../services/aiService';

/**
 * Extract development approach from project documents
 */
export async function extractDevelopmentApproachFromDocuments(
  documents: Array<{ id: string; title: string; content: string }>,
  projectId: string,
  options: {
    aiProvider?: string;
    aiModel?: string;
    temperature?: number;
  } = {}
): Promise<DevelopmentApproach | null> {
  try {
    logger.info('[EXTRACTION-APPROACH] Starting development approach extraction', {
      projectId,
      documentCount: documents.length
    });
    
    // Build document context for AI processing
    const documentContext = documents.map(doc => {
      return `=== DOCUMENT: ${doc.title} ===\n${doc.content}\n`;
    }).join('\n\n');
    
    // AI extraction prompt
    const prompt = `
You are analyzing project documents to extract DEVELOPMENT APPROACH metadata.

**CRITICAL**: This is PROJECT-LEVEL metadata (one record per project), not multiple entities.

Look for methodology selection, justification, and tailoring decisions:
- "Methodology: Agile/Scrum/Waterfall/Hybrid/SAFe"
- "Development approach: Predictive/Adaptive/Incremental/Iterative"
- "Why we chose [methodology]"
- "Tailoring decisions"
- "Life cycle phases"
- "Sprint/iteration length"
- "Delivery cadence"
- "Governance approach"

DOCUMENT CONTENT:
${documentContext}

Extract as a SINGLE JSON object (not array - one per project):

{
  "approach": "predictive" | "adaptive" | "hybrid" | "incremental" | "iterative",
  "methodology": "waterfall" | "scrum" | "kanban" | "lean" | "safe" | "prince2" | "custom",
  "justification": "Full explanation of why this approach was selected (min 50 chars)",
  "uncertainty_level": "low" | "medium" | "high",
  "requirements_stability": "stable" | "evolving" | "uncertain",
  "stakeholder_engagement_model": "periodic" | "continuous",
  "delivery_cadence": "single" | "iterative" | "incremental" | "continuous",
  "organizational_maturity": "low" | "medium" | "high",
  "team_experience_level": "junior" | "mixed" | "senior",
  "regulatory_constraints": true | false,
  "tailoring_decisions": [
    {
      "area": "What was tailored",
      "standard_process": "Normal organizational process",
      "tailored_process": "How it was adapted",
      "justification": "Why it was tailored"
    }
  ],
  "life_cycle_phases": ["Phase 1", "Phase 2", ...],
  "iteration_length": number, // if iterative
  "iteration_unit": "days" | "weeks", // if iterative
  "governance_approach": "lightweight" | "standard" | "formal",
  "review_gates": ["Gate 1", "Gate 2", ...]
}

**IMPORTANT**: Only return valid JSON. Return null if no methodology information found.
`;
    
    // Call AI service with caching
    const cacheKey = `dev_approach_${projectId}_${documents.map(d => d.id).join('_')}`;
    
    const response = await aiService.generate({
      prompt,
      provider: options.aiProvider || 'openai',
      model: options.aiModel || 'gpt-4-turbo-preview',
      temperature: options.temperature || 0.3,
      max_tokens: 2000,
      metadata: {
        cacheKey,
        cacheTTL: 86400 // Cache for 24 hours
      }
    });
    
    // Parse AI response
    let parsed: DevelopmentApproach | null = null;
    try {
      const responseContent = response.content.trim();
      if (responseContent && responseContent !== 'null') {
        parsed = JSON.parse(responseContent);
        
        // Validate the parsed data
        parsed = validateDevelopmentApproach(parsed);
        
        logger.info('[EXTRACTION-APPROACH] Successfully extracted development approach', {
          projectId,
          approach: parsed.approach,
          methodology: parsed.methodology
        });
      }
    } catch (parseError) {
      logger.error('[EXTRACTION-APPROACH] Failed to parse AI response', {
        error: parseError instanceof Error ? parseError.message : String(parseError),
        response: response.content
      });
      return null;
    }
    
    return parsed;
  } catch (error) {
    logger.error('[EXTRACTION-APPROACH] Extraction failed', {
      error: error instanceof Error ? error.message : String(error),
      projectId
    });
    return null;
  }
}

/**
 * Extract development approach from a single document
 */
export async function extractDevelopmentApproachFromDocument(
  document: { id: string; title: string; content: string },
  projectId: string,
  options?: {
    aiProvider?: string;
    aiModel?: string;
    temperature?: number;
  }
): Promise<DevelopmentApproach | null> {
  return extractDevelopmentApproachFromDocuments([document], projectId, options);
}