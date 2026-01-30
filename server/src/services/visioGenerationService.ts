import JSZip from 'jszip'
import xml2js from 'xml2js'
import * as fs from 'fs'
import * as path from 'path'
import { logger } from '../utils/logger'
import { DtAsset } from './extraction/entities/dt_assets/types'

// Types for Visio XML structure (Partial)
interface VisioPage {
    PageContents: {
        Shapes: { Shape: any[] }[],
        Connects: { Connect: any[] }[]
    }
}

export class VisioGenerationService {
    private readonly TEMPLATE_PATH = path.join(__dirname, '../../templates/digital_twin_template.vsdx')
    private masterMap: Map<string, string> = new Map() // Name (lowercase) -> ID

    /**
     * Generates a .vsdx buffer from the provided assets.
     */
    async generateVisio(
        assets: DtAsset[],
        projectId: string
    ): Promise<Buffer> {
        logger.info('Generating Visio diagram', { count: assets.length, projectId })

        // 1. Load Template
        if (!fs.existsSync(this.TEMPLATE_PATH)) {
            throw new Error(`Visio template not found at ${this.TEMPLATE_PATH}. Please create it using README_VISIO_TEMPLATE.md instructions.`)
        }
        const templateBuffer = fs.readFileSync(this.TEMPLATE_PATH)
        const zip = await JSZip.loadAsync(templateBuffer)

        // 2. Parse Masters XML (To find ID by Name)
        await this.loadMasterMap(zip)

        // 3. Parse Page1 XML
        const page1Path = 'visio/pages/page1.xml'
        const page1Xml = await zip.file(page1Path)?.async('string')
        if (!page1Xml) {
            throw new Error('Invalid Visio template: visio/pages/page1.xml not found')
        }

        const parser = new xml2js.Parser()
        const builder = new xml2js.Builder()
        const pageObj = await parser.parseStringPromise(page1Xml)

        // 4. Prepare Data Structures
        if (!pageObj.PageContents.Shapes) pageObj.PageContents.Shapes = [{ Shape: [] }]

        const shapes = pageObj.PageContents.Shapes[0].Shape || []

        // Find highest existing ID to avoid collisions
        let maxId = 0
        shapes.forEach((s: any) => {
            const id = parseInt(s.$.ID)
            if (!isNaN(id) && id > maxId) maxId = id
        })

        // Simple Layout Grid
        let currentX = 2.0
        let currentY = 10.0
        const ROW_HEIGHT = 1.5
        const COL_WIDTH = 2.0
        const MAX_COLS = 5
        let colCount = 0

        // 5. Generate Shapes for Assets
        for (const asset of assets) {
            maxId++
            const shapeId = maxId

            // Dynamic Master Lookup
            // Try to find a master matching the asset type, otherwise default to a generic 'shape' or 'rectangle'
            // If the template has a Master named "Sensor", asset_type="sensor" will find it.
            const typeKey = (asset.asset_type || 'generic').toLowerCase()
            let masterId = this.masterMap.get(typeKey)

            if (!masterId) {
                // Fallback to "Process" or "Rectangle" if available, or just first master found (dangerous but works for POC if only 1 master)
                // Better: Log warning and use a safe default if we know it (e.g., '2' is risky without checking).
                // We will try standard names.
                masterId = this.masterMap.get('process') || this.masterMap.get('rectangle') || this.masterMap.get('dynamic connector') || '2' // Fallback to 2
                logger.warn(`Master for type '${typeKey}' not found, defaulting to Master ID ${masterId}`)
            }

            const newShape: any = {
                $: {
                    ID: String(shapeId),
                    NameU: asset.external_id,
                    Name: asset.name,
                    Type: 'Shape',
                    Master: masterId
                },
                Cell: [
                    { $: { N: 'PinX', V: String(currentX) } },
                    { $: { N: 'PinY', V: String(currentY) } }
                ],
                Text: [asset.name],
                Section: [
                    {
                        $: { N: 'Property' },
                        Row: [
                            { $: { N: 'Prop.external_id' }, Cell: [{ $: { N: 'Value', V: asset.external_id } }, { $: { N: 'Label', V: 'External ID' } }] },
                            { $: { N: 'Prop.platform' }, Cell: [{ $: { N: 'Value', V: asset.platform_type } }, { $: { N: 'Label', V: 'Platform' } }] }
                        ]
                    }
                ]
            }

            // Add Telemetry Props
            if (asset.metadata) {
                Object.entries(asset.metadata).forEach(([key, val]) => {
                    if (typeof val === 'object') return
                    newShape.Section[0].Row.push({
                        $: { N: `Prop.meta_${key}` },
                        Cell: [
                            { $: { N: 'Value', V: String(val) } },
                            { $: { N: 'Label', V: key } }
                        ]
                    })
                })
            }

            shapes.push(newShape)

            // Update Grid Layout
            currentX += COL_WIDTH
            colCount++
            if (colCount >= MAX_COLS) {
                currentX = 2.0
                currentY -= ROW_HEIGHT
                colCount = 0
            }
        }

        // 6. Save back to ZIP
        pageObj.PageContents.Shapes[0].Shape = shapes
        const newPageXml = builder.buildObject(pageObj)
        zip.file(page1Path, newPageXml)

        return await zip.generateAsync({ type: 'nodebuffer' })
    }

    private async loadMasterMap(zip: JSZip) {
        try {
            const parser = new xml2js.Parser()
            const mastersXml = await zip.file('visio/masters/masters.xml')?.async('string')

            if (!mastersXml) {
                logger.warn('visio/masters/masters.xml not found. Dynamic lookup disabled. Using default ID=2.')
                return
            }

            const mastersObj = await parser.parseStringPromise(mastersXml)
            const masterList = mastersObj.Masters.Master || []

            masterList.forEach((m: any) => {
                const id = m.$.ID
                // Name or NameU property
                const name = (m.$.NameU || m.$.Name || '').toLowerCase()
                if (name && id) {
                    this.masterMap.set(name, id)
                }
            })

            logger.info('Loaded Visio Masters', { count: this.masterMap.size, keys: Array.from(this.masterMap.keys()) })

        } catch (e) {
            logger.error('Failed to parse masters.xml', { error: e })
        }
    }
}
