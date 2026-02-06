import { logger } from '../utils/logger'
import { aiService } from './aiService'

export interface ExtractedInfrastructureData {
    id?: string
    entity_type: 'safety_plan' | 'environmental_impact' | 'method_statement' | 'construction_risk'
    title: string
    description: string
    specifications?: string[]
    compliance_status?: string
    mitigation_measures?: string[]
    impact_level?: 'low' | 'medium' | 'high' | 'critical'
    carbon_footprint_estimate?: string
    source_document: string
    source_document_id?: string
    source_text_start?: number
    source_text_end?: number
    source_line_start?: number
    source_line_end?: number
    source_context?: string
    source_snippet?: string
}

export interface ExtractedSupplyChainData {
    id?: string
    entity_type: 'inventory_status' | 'logistics_metric' | 'sustainability_esg' | 'iot_device_status'
    title: string
    description: string
    metric_value?: string
    unit?: string
    status?: string
    location?: string
    supplier_compliance?: string
    carbon_emissions?: string
    source_document: string
    source_document_id?: string
    source_text_start?: number
    source_text_end?: number
    source_line_start?: number
    source_line_end?: number
    source_context?: string
    source_snippet?: string
}

export class DomainSpecificExtractionService {

    /**
     * Extract domain-specific entities for Infrastructure and Supply Chain
     */
    async extractDomainDataWithLocations(
        documents: Array<{ id: string; title: string; content: string; template_name?: string }>,
        projectId: string,
        options: { aiProvider?: string; aiModel?: string; domain?: 'infrastructure' | 'supply_chain' }
    ): Promise<{
        infrastructure_data: ExtractedInfrastructureData[]
        supply_chain_data: ExtractedSupplyChainData[]
    }> {
        try {
            logger.info(`[DOMAIN-EXTRACTION] Starting domain-specific extraction for ${options.domain || 'both domains'}`)

            const prompt = this.buildDomainExtractionPrompt(documents, options.domain)

            const response = await aiService.generateWithFallback({
                prompt,
                provider: options.aiProvider || 'openai',
                model: options.aiModel,
                temperature: 0.2,
                max_tokens: 8000
            }, ['openai', 'google', 'anthropic', 'mistral', 'groq'])

            const parsed = this.parseAIResponse(response.content)

            const enhanceWithLocations = (entities: any[]) => {
                return entities.map((entity: any) => {
                    const locationData = this.extractLocationData(entity, documents)
                    return {
                        ...entity,
                        source_text_start: locationData.startChar,
                        source_text_end: locationData.endChar,
                        source_line_start: locationData.startLine,
                        source_line_end: locationData.endLine,
                        source_context: locationData.context,
                        source_snippet: locationData.snippet
                    }
                })
            }

            const infrastructure_data = enhanceWithLocations(parsed.infrastructure_data || [])
            const supply_chain_data = enhanceWithLocations(parsed.supply_chain_data || [])

            logger.info(`[DOMAIN-EXTRACTION] Extracted ${infrastructure_data.length} infrastructure and ${supply_chain_data.length} supply chain items`)

            return { infrastructure_data, supply_chain_data }

        } catch (error) {
            logger.error(`[DOMAIN-EXTRACTION] Failed to extract domain-specific data`, {
                error: error instanceof Error ? error.message : String(error)
            })
            return { infrastructure_data: [], supply_chain_data: [] }
        }
    }

    private buildDomainExtractionPrompt(
        documents: Array<{ id: string; title: string; content: string; template_name?: string }>,
        domain?: string
    ): string {
        const documentContext = this.buildDocumentContextWithLineNumbers(documents)

        return `You are an expert analyst extracting specialized data from project documents.
Focus on ${domain || 'Infrastructure and Supply Chain'} domains.

Look for:
INFRASTRUCTURE DATA:
- Safety plans, hazards, and OSHA compliance terms.
- Environmental Management Plans (EMP), mitigation measures, and Embodied Carbon data.
- Construction Method Statements, sequence of works, and equipment specs.
- Engineering Design Basis, codes, and material parameters.

SUPPLY CHAIN DATA:
- Inventory levels, stock-on-hand, and warehouse status.
- Logistics KPIs (OTD, carrier performance, freight costs).
- Sustainability/ESG metrics (Scope 3 emissions, supplier compliance, labor ethics).
- IoT device telemetry status, connectivity health, and maintenance tags.

CRITICAL POSITION TRACKING:
For each entity extracted, you MUST provide precise location data:
- source_document: EXACT title
- source_text_start/end: character positions (0-based)
- source_line_start/end: line numbers (1-based)
- source_snippet: EXACT text from the document.

Return JSON in this format:
{
  "infrastructure_data": [
    {
      "entity_type": "safety_plan|environmental_impact|method_statement|construction_risk",
      "title": "Clear title",
      "description": "Summary",
      "compliance_status": "Status if applicable",
      "impact_level": "low|medium|high|critical",
      "carbon_footprint_estimate": "Value if found",
      "source_document": "...",
      "source_line_start": 10,
      "source_snippet": "..."
    }
  ],
  "supply_chain_data": [
    {
      "entity_type": "inventory_status|logistics_metric|sustainability_esg|iot_device_status",
      "title": "Clear title",
      "description": "Summary",
      "metric_value": "Value",
      "unit": "Unit",
      "status": "active|warning|critical",
      "source_document": "...",
      "source_line_start": 20,
      "source_snippet": "..."
    }
  ]
}

SOURCE DOCUMENTS:
${documentContext}

AVAILABLE DOCUMENTS:
${documents.map(d => d.title).join(', ')}

Return ONLY valid JSON.`
    }

    private buildDocumentContextWithLineNumbers(documents: any[]): string {
        return documents.map((doc, idx) => {
            const lines = doc.content.split('\n')
            const numberedContent = lines.map((l, i) => `${(i + 1).toString().padStart(3, ' ')}: ${l}`).join('\n')
            return `Document ${idx + 1}: "${doc.title}"\n${numberedContent}\n---`
        }).join('\n\n')
    }

    private extractLocationData(entity: any, documents: any[]): any {
        const sourceDoc = documents.find(d => d.title === entity.source_document)
        if (!sourceDoc) return { startChar: 0, endChar: 0, startLine: 0, endLine: 0, context: '', snippet: '' }

        const content = sourceDoc.content
        const snippet = entity.source_snippet || ''
        const index = content.indexOf(snippet)

        if (index === -1) {
            // Fallback: search by line number if provided
            const lineNum = entity.source_line_start
            if (lineNum && lineNum > 0) {
                const lines = content.split('\n')
                if (lineNum <= lines.length) {
                    const lineText = lines[lineNum - 1]
                    const charPos = content.indexOf(lineText)
                    return { startChar: charPos, endChar: charPos + lineText.length, startLine: lineNum, endLine: lineNum, context: lineText, snippet: lineText }
                }
            }
            return { startChar: 0, endChar: 0, startLine: 0, endLine: 0, context: '', snippet: '' }
        }

        const startLine = content.substring(0, index).split('\n').length
        const endLine = startLine + snippet.split('\n').length - 1

        return {
            startChar: index,
            endChar: index + snippet.length,
            startLine,
            endLine,
            context: content.substring(Math.max(0, index - 100), Math.min(content.length, index + snippet.length + 100)),
            snippet
        }
    }

    private parseAIResponse(content: string): any {
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/)
            return jsonMatch ? JSON.parse(jsonMatch[0]) : {}
        } catch {
            return {}
        }
    }
}

export const domainSpecificExtractionService = new DomainSpecificExtractionService()
