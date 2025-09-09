/**
 * Adobe PDF Service
 * Service layer for Adobe PDF Services integration
 */

import { AdobePDFService, AdobePDFConfig, PDFGenerationOptions, PDFConversionResult, PDFOperationResult } from '../integrations/adobe-pdf'
import { logger } from '../utils/logger'
import path from 'path'
import fs from 'fs/promises'

export interface AdobePDFServiceConfig extends AdobePDFConfig {
  outputDirectory: string
  tempDirectory: string
}

export interface PremiumPDFOptions extends PDFGenerationOptions {
  useAdobeServices?: boolean
  fallbackToPuppeteer?: boolean
}

export class AdobePDFServiceWrapper {
  private adobePDFService: AdobePDFService
  private config: AdobePDFServiceConfig

  constructor(config: AdobePDFServiceConfig) {
    this.config = config
    this.adobePDFService = new AdobePDFService(config)
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    try {
      await this.adobePDFService.initialize()
      await this.ensureDirectories()
      logger.info('Adobe PDF Service wrapper initialized')
    } catch (error) {
      logger.error('Failed to initialize Adobe PDF Service wrapper:', error)
      throw error
    }
  }

  /**
   * Test connection to Adobe PDF Services
   */
  async testConnection(): Promise<boolean> {
    return await this.adobePDFService.testConnection()
  }

  /**
   * Generate premium PDF from HTML content
   */
  async generatePremiumPDF(
    htmlContent: string,
    filename: string,
    options?: PremiumPDFOptions
  ): Promise<PDFConversionResult> {
    try {
      const outputPath = path.join(this.config.outputDirectory, filename)
      
      // Ensure output directory exists
      await fs.mkdir(path.dirname(outputPath), { recursive: true })

      // Use Adobe PDF Services for premium generation
      const result = await this.adobePDFService.createPDFFromHTML(
        htmlContent,
        outputPath,
        options
      )

      if (result.success) {
        logger.info(`Premium PDF generated successfully: ${filename}`, {
          fileSize: result.fileSize,
          processingTime: result.metadata?.processingTime
        })
      } else {
        logger.error(`Premium PDF generation failed: ${filename}`, {
          error: result.error
        })
      }

      return result

    } catch (error) {
      logger.error('Premium PDF generation error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Convert DOCX to premium PDF
   */
  async convertDOCXToPDF(
    docxPath: string,
    outputFilename: string,
    options?: PremiumPDFOptions
  ): Promise<PDFConversionResult> {
    try {
      const outputPath = path.join(this.config.outputDirectory, outputFilename)
      
      // Ensure output directory exists
      await fs.mkdir(path.dirname(outputPath), { recursive: true })

      const result = await this.adobePDFService.createPDFFromDOCX(
        docxPath,
        outputPath,
        options
      )

      if (result.success) {
        logger.info(`DOCX to PDF conversion completed: ${outputFilename}`, {
          fileSize: result.fileSize,
          processingTime: result.metadata?.processingTime
        })
      }

      return result

    } catch (error) {
      logger.error('DOCX to PDF conversion error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Export PDF to other formats
   */
  async exportPDFToFormat(
    pdfPath: string,
    outputFilename: string,
    format: 'docx' | 'pptx' | 'xlsx' | 'rtf' | 'jpeg' | 'png'
  ): Promise<PDFOperationResult> {
    try {
      const outputPath = path.join(this.config.outputDirectory, outputFilename)
      
      // Ensure output directory exists
      await fs.mkdir(path.dirname(outputPath), { recursive: true })

      const result = await this.adobePDFService.exportPDF(pdfPath, outputPath, format)

      if (result.success) {
        logger.info(`PDF export completed: ${outputFilename}`, {
          format,
          inputFile: path.basename(pdfPath)
        })
      }

      return result

    } catch (error) {
      logger.error('PDF export error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Perform OCR on PDF
   */
  async performOCR(
    pdfPath: string,
    outputFilename: string
  ): Promise<PDFOperationResult> {
    try {
      const outputPath = path.join(this.config.outputDirectory, outputFilename)
      
      // Ensure output directory exists
      await fs.mkdir(path.dirname(outputPath), { recursive: true })

      const result = await this.adobePDFService.performOCR(pdfPath, outputPath)

      if (result.success) {
        logger.info(`PDF OCR completed: ${outputFilename}`, {
          inputFile: path.basename(pdfPath)
        })
      }

      return result

    } catch (error) {
      logger.error('PDF OCR error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get service status
   */
  async getStatus(): Promise<{
    enabled: boolean
    initialized: boolean
    credentialsConfigured: boolean
    connectionTest: boolean
  }> {
    const status = await this.adobePDFService.getServiceStatus()
    const connectionTest = status.enabled ? await this.testConnection() : false

    return {
      ...status,
      connectionTest
    }
  }

  /**
   * Create sample PDF to demonstrate capabilities
   */
  async createSamplePDF(): Promise<PDFConversionResult> {
    const sampleHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Adobe PDF Services Sample</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #007acc;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .logo {
            color: #007acc;
            font-size: 2.5em;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .subtitle {
            color: #666;
            font-size: 1.2em;
        }
        .section {
            margin-bottom: 30px;
        }
        .section h2 {
            color: #007acc;
            border-left: 4px solid #007acc;
            padding-left: 15px;
            margin-bottom: 15px;
        }
        .feature-list {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .feature-item {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #007acc;
        }
        .feature-item h3 {
            margin-top: 0;
            color: #007acc;
        }
        .stats {
            background: linear-gradient(135deg, #007acc, #0056b3);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
        }
        .stats h3 {
            margin-top: 0;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            color: #666;
        }
        .highlight {
            background: #fff3cd;
            padding: 15px;
            border-radius: 5px;
            border-left: 4px solid #ffc107;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">ADPA Framework</div>
        <div class="subtitle">Adobe PDF Services Integration Sample</div>
    </div>

    <div class="section">
        <h2>Premium PDF Generation</h2>
        <p>This document demonstrates the premium PDF generation capabilities provided by Adobe PDF Services integration in the ADPA Framework. Adobe PDF Services offers enterprise-grade PDF processing with superior quality and advanced features.</p>
        
        <div class="highlight">
            <strong>Generated on:</strong> ${new Date().toLocaleString()}<br>
            <strong>Service:</strong> Adobe PDF Services API<br>
            <strong>Quality:</strong> Premium Enterprise Grade
        </div>
    </div>

    <div class="section">
        <h2>Key Features</h2>
        <div class="feature-list">
            <div class="feature-item">
                <h3>High-Quality Rendering</h3>
                <p>Superior text rendering, font handling, and layout preservation compared to standard PDF generators.</p>
            </div>
            <div class="feature-item">
                <h3>Advanced Compression</h3>
                <p>Intelligent compression algorithms that maintain quality while reducing file size.</p>
            </div>
            <div class="feature-item">
                <h3>Security Features</h3>
                <p>Password protection, permission controls, and encryption capabilities.</p>
            </div>
            <div class="feature-item">
                <h3>Format Conversion</h3>
                <p>Convert PDFs to DOCX, PPTX, XLSX, and other formats with high fidelity.</p>
            </div>
            <div class="feature-item">
                <h3>OCR Capabilities</h3>
                <p>Optical Character Recognition for scanned documents and images.</p>
            </div>
            <div class="feature-item">
                <h3>Linearization</h3>
                <p>Fast web view optimization for improved loading performance.</p>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>Integration Benefits</h2>
        <ul>
            <li><strong>Enterprise Reliability:</strong> Adobe's proven PDF technology used by millions</li>
            <li><strong>Scalable Processing:</strong> Cloud-based service handles high-volume operations</li>
            <li><strong>Consistent Quality:</strong> Predictable, professional-grade output</li>
            <li><strong>Advanced Features:</strong> Access to premium PDF manipulation capabilities</li>
            <li><strong>API Integration:</strong> Seamless integration with existing ADPA workflows</li>
        </ul>
    </div>

    <div class="stats">
        <h3>Sample Generation Statistics</h3>
        <p>This sample PDF showcases the integration capabilities and serves as a reference for premium PDF generation in the ADPA Framework.</p>
    </div>

    <div class="section">
        <h2>Usage Examples</h2>
        <p>The Adobe PDF Services integration can be used for:</p>
        <ul>
            <li>Converting business documents to premium PDFs</li>
            <li>Generating reports with complex layouts and formatting</li>
            <li>Creating secure documents with password protection</li>
            <li>Converting legacy documents to modern formats</li>
            <li>Processing scanned documents with OCR</li>
            <li>Optimizing PDFs for web delivery</li>
        </ul>
    </div>

    <div class="footer">
        <p>Generated by ADPA Framework - Adobe PDF Services Integration</p>
        <p>© 2024 ADPA Framework. Premium PDF generation powered by Adobe PDF Services.</p>
    </div>
</body>
</html>
    `

    const filename = `adobe-pdf-sample-${Date.now()}.pdf`
    
    return await this.generatePremiumPDF(sampleHTML, filename, {
      quality: 'high',
      compress: true,
      linearize: true,
      includeTaggedPDF: true,
      documentLanguage: 'en-US'
    })
  }

  /**
   * Ensure required directories exist
   */
  private async ensureDirectories(): Promise<void> {
    await fs.mkdir(this.config.outputDirectory, { recursive: true })
    await fs.mkdir(this.config.tempDirectory, { recursive: true })
  }
}

// Create service instance with configuration from environment
export const createAdobePDFServiceInstance = (): AdobePDFServiceWrapper => {
  const config: AdobePDFServiceConfig = {
    clientId: process.env.ADOBE_CLIENT_ID || '',
    clientSecret: process.env.ADOBE_CLIENT_SECRET || '',
    organizationId: process.env.ADOBE_ORGANIZATION_ID,
    accountId: process.env.ADOBE_ACCOUNT_ID,
    privateKey: process.env.ADOBE_PRIVATE_KEY,
    enabled: process.env.ADOBE_PDF_ENABLED === 'true',
    outputDirectory: process.env.ADOBE_OUTPUT_DIR || './generated-documents/adobe-pdf',
    tempDirectory: process.env.ADOBE_TEMP_DIR || './temp/adobe-pdf'
  }

  return new AdobePDFServiceWrapper(config)
}

// Export a lazily-created proxy that constructs the real service on first use.
let _adobeInstance: AdobePDFServiceWrapper | null = null
function getAdobeInstance(): AdobePDFServiceWrapper {
  if (!_adobeInstance) {
    _adobeInstance = createAdobePDFServiceInstance()
  }
  return _adobeInstance
}

export const adobePdfService: any = new Proxy({}, {
  get(_, prop: string) {
    const inst: any = getAdobeInstance()
    const v = inst[prop]
    if (typeof v === 'function') {
      return v.bind(inst)
    }
    return v
  },
  set(_, prop: string, value) {
    const inst: any = getAdobeInstance()
    inst[prop] = value
    return true
  }
})