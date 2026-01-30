import AdmZip from 'adm-zip'
import { logger } from '../utils/logger'
import { digitalTwinAssetService } from './digitalTwinAssetService'
import { digitalTwinEventService } from './digitalTwinEventService'
import { v4 as uuidv4 } from 'uuid'

export interface VisioParseResult {
    pages: VisioPage[]
    stats: {
        shapeCount: number
        connectionCount: number
    }
}

export interface VisioPage {
    id: string
    name: string
    shapes: VisioShape[]
}

export interface VisioShape {
    id: string
    name: string
    text?: string
    master?: string
    type: string
    properties: Record<string, any>
}

export const visioIngestionService = {
    /**
     * Parse a VSDX buffer and extract shapes/assets
     */
    async parseVisioFile(buffer: Buffer): Promise<VisioParseResult> {
        try {
            const zip = new AdmZip(buffer)
            const zipEntries = zip.getEntries()

            const pages: VisioPage[] = []
            let totalShapes = 0

            // 1. Find pages (simplified: look for page*.xml in visio/pages/)
            // Real implementation would parse [Content_Types].xml or visio/pages/pages.xml,
            // but iteration is robust enough for POC.
            const pageEntries = zipEntries.filter(entry =>
                entry.entryName.match(/^visio\/pages\/page\d+\.xml$/i)
            )

            for (const entry of pageEntries) {
                const xmlContent = entry.getData().toString('utf8')
                const shapes = this.extractShapesFromXml(xmlContent)

                pages.push({
                    id: entry.name, // page1.xml
                    name: entry.name.replace('.xml', ''), // Simplified, real name is in pages.xml rels
                    shapes
                })
                totalShapes += shapes.length
            }

            return {
                pages,
                stats: {
                    shapeCount: totalShapes,
                    connectionCount: 0 // TODO: Extract connections from <Connect> tags
                }
            }
        } catch (error) {
            logger.error('visioIngestionService.parseVisioFile error', { error })
            throw new Error(`Failed to parse Visio file: ${(error as Error).message}`)
        }
    },

    /**
     * Simple Regex-based XML shape extractor for POC
     * WARNING: Not for production use with complex XML nested structures.
     * Assumes standard VSDX flat XML format.
     */
    extractShapesFromXml(xml: string): VisioShape[] {
        const shapes: VisioShape[] = []

        // Non-recursive regex to find <Shape ...> ... </Shape> blocks is hard.
        // Instead, we iterate over <Shape> tags and simplisticly extract attributes.
        // This ignores hierarchy for now (flat list of shapes).

        // Regex for Shape tag with attributes
        const shapeTagRegex = /<Shape\s+([^>]+)>/g

        let match
        while ((match = shapeTagRegex.exec(xml)) !== null) {
            const attrString = match[1]

            // Extract ID
            const idMatch = attrString.match(/ID="(\d+)"/)
            const id = idMatch ? idMatch[1] : `unknown-${Math.random()}`

            // Extract Name
            const nameMatch = attrString.match(/Name="([^"]+)"/) || attrString.match(/NameU="([^"]+)"/)
            const name = nameMatch ? nameMatch[1] : `Shape ${id}`

            // Extract Type
            const typeMatch = attrString.match(/Type="([^"]+)"/)
            const type = typeMatch ? typeMatch[1] : 'Shape'

            // Skip if it's not a Group or Shape (basic filter)
            if (type !== 'Shape' && type !== 'Group') continue

            // For Text content, we need to look ahead until </Shape> or <Text>...
            // Since regex lookahead for arbitrary length is bad, we'll skip text extraction in this regex pass
            // and keep it metadata-light for the POC.

            shapes.push({
                id,
                name,
                type,
                properties: {} // TODO: Extract <Prop> tags
            })
        }

        return shapes
    },

    /**
     * Import parsed Visio assets into Digital Twin tables
     */
    async importVisioAssets(projectId: string, parseResult: VisioParseResult, sourceDocumentId?: string) {
        const results = {
            created: 0,
            updated: 0,
            errors: 0
        }

        for (const page of parseResult.pages) {
            for (const shape of page.shapes) {
                try {
                    // Construct external ID: Project::Visio::Page::ShapeID
                    const externalId = `visio::${projectId}::${page.id}::${shape.id}`

                    const assetInput = {
                        project_id: projectId,
                        external_id: externalId,
                        platform_type: 'Visio' as const,
                        platform_instance_url: `visio-file`, // Could be the filename
                        name: shape.name, // e.g. "Process Box.12"
                        description: `Imported from Visio Page ${page.name}`,
                        asset_type: shape.type,
                        location: { page: page.name },
                        metadata: {
                            visioShapeId: shape.id,
                            visioPage: page.name,
                            ...shape.properties
                        },
                        source_document_id: sourceDocumentId
                    }

                    const asset = await digitalTwinAssetService.registerAsset(assetInput)

                    // Log creation event
                    await digitalTwinEventService.ingestEvent({
                        asset_id: asset.id,
                        event_type: 'creation',
                        event_payload: assetInput,
                        event_summary: `Imported via Visio Bridge`,
                        platform_type: 'Visio',
                        event_timestamp: new Date()
                    })

                    results.created++
                } catch (e) {
                    logger.error(`Failed to import Visio shape ${shape.id}`, { error: e })
                    results.errors++
                }
            }
        }

        return results
    }
}
