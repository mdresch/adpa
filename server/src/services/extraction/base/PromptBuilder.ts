/**
 * Prompt Builder
 * 
 * Constructs AI prompts for entity extraction with consistent formatting.
 */

import type { ExtractionContext } from './ExtractionContext'

/**
 * Build extraction prompt for a specific entity type
 */
export function buildExtractionPrompt(
  context: ExtractionContext,
  entityType: string,
  entityDescription: string,
  jsonStructure: string,
  requirements: string[] = []
): string {
  const basePrompt = `Analyze the following project documents and extract ALL ${entityDescription} mentioned.

${context.documentContext}

AVAILABLE DOCUMENTS (for source_document matching):
${context.documentList}

Extract ${entityType} in JSON format with the following structure:
${jsonStructure}`

  const requirementsSection = requirements.length > 0
    ? `\n\nRequirements:\n${requirements.map(r => `- ${r}`).join('\n')}`
    : ''

  const sourceDocumentRequirement = `\n- **source_document MUST match exactly** one of the document titles from AVAILABLE DOCUMENTS list above`
  const jsonOnlyRequirement = `\n- Return ONLY valid JSON, no markdown or explanation`

  return `${basePrompt}${requirementsSection}${sourceDocumentRequirement}${jsonOnlyRequirement}`
}

/**
 * Build custom prompt with full control
 */
export function buildCustomPrompt(
  context: ExtractionContext,
  instructions: string,
  jsonStructure?: string
): string {
  let prompt = `${instructions}

${context.documentContext}

AVAILABLE DOCUMENTS (for source_document matching):
${context.documentList}`

  if (jsonStructure) {
    prompt += `\n\nExtract in JSON format with the following structure:\n${jsonStructure}`
  }

  prompt += `\n\n- **source_document MUST match exactly** one of the document titles from AVAILABLE DOCUMENTS list above`
  prompt += `\n- Return ONLY valid JSON, no markdown or explanation`

  return prompt
}

