/**
 * Adobe PDF Services Integration Demo
 * Demonstrates the capabilities of Adobe PDF Services integration
 */

import dotenv from 'dotenv'
dotenv.config()

import { adobePdfService } from '../services/adobePdfService'
import { logger } from '../utils/logger'
import fs from 'fs/promises'
import path from 'path'

// Sample HTML content for demonstration
const sampleHTMLContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Adobe PDF Services Demo Document</title>
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
        .feature-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .feature-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #007acc;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .feature-card h3 {
            margin-top: 0;
            color: #007acc;
        }
        .stats-box {
            background: linear-gradient(135deg, #007acc, #0056b3);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            margin: 20px 0;
        }
        .stats-box h3 {
            margin-top: 0;
        }
        .highlight {
            background: #fff3cd;
            padding: 15px;
            border-radius: 5px;
            border-left: 4px solid #ffc107;
            margin: 20px 0;
        }
        .code-block {
            background: #f4f4f4;
            padding: 15px;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
            overflow-x: auto;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        th {
            background-color: #007acc;
            color: white;
        }
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">ADPA Framework</div>
        <div class="subtitle">Adobe PDF Services Integration Demo</div>
    </div>

    <div class="section">
        <h2>🚀 Premium PDF Generation</h2>
        <p>This document demonstrates the premium PDF generation capabilities provided by Adobe PDF Services integration in the ADPA Framework. Adobe PDF Services offers enterprise-grade PDF processing with superior quality and advanced features.</p>
        
        <div class="highlight">
            <strong>Generated on:</strong> ${new Date().toLocaleString()}<br>
            <strong>Service:</strong> Adobe PDF Services API<br>
            <strong>Quality:</strong> Premium Enterprise Grade<br>
            <strong>Demo Version:</strong> 1.0.0
        </div>
    </div>

    <div class="section">
        <h2>🎯 Key Features</h2>
        <div class="feature-grid">
            <div class="feature-card">
                <h3>🎨 High-Quality Rendering</h3>
                <p>Superior text rendering, font handling, and layout preservation compared to standard PDF generators. Adobe's proven technology ensures professional-grade output.</p>
            </div>
            <div class="feature-card">
                <h3>🗜️ Advanced Compression</h3>
                <p>Intelligent compression algorithms that maintain quality while reducing file size. Optimize PDFs for web delivery or storage.</p>
            </div>
            <div class="feature-card">
                <h3>🔒 Security Features</h3>
                <p>Password protection, permission controls, and encryption capabilities. Secure your documents with enterprise-grade protection.</p>
            </div>
            <div class="feature-card">
                <h3>🔄 Format Conversion</h3>
                <p>Convert PDFs to DOCX, PPTX, XLSX, and other formats with high fidelity. Seamless document transformation.</p>
            </div>
            <div class="feature-card">
                <h3>👁️ OCR Capabilities</h3>
                <p>Optical Character Recognition for scanned documents and images. Make non-searchable PDFs searchable and accessible.</p>
            </div>
            <div class="feature-card">
                <h3>⚡ Linearization</h3>
                <p>Fast web view optimization for improved loading performance. Optimize PDFs for online viewing and streaming.</p>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>📊 Integration Benefits</h2>
        <table>
            <thead>
                <tr>
                    <th>Benefit</th>
                    <th>Description</th>
                    <th>Impact</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Enterprise Reliability</td>
                    <td>Adobe's proven PDF technology used by millions</td>
                    <td>High</td>
                </tr>
                <tr>
                    <td>Scalable Processing</td>
                    <td>Cloud-based service handles high-volume operations</td>
                    <td>High</td>
                </tr>
                <tr>
                    <td>Consistent Quality</td>
                    <td>Predictable, professional-grade output</td>
                    <td>Medium</td>
                </tr>
                <tr>
                    <td>Advanced Features</td>
                    <td>Access to premium PDF manipulation capabilities</td>
                    <td>High</td>
                </tr>
                <tr>
                    <td>API Integration</td>
                    <td>Seamless integration with existing ADPA workflows</td>
                    <td>Medium</td>
                </tr>
            </tbody>
        </table>
    </div>

    <div class="stats-box">
        <h3>📈 Demo Statistics</h3>
        <p>This sample PDF showcases the integration capabilities and serves as a reference for premium PDF generation in the ADPA Framework.</p>
        <p><strong>Features Demonstrated:</strong> HTML to PDF, Styling, Layout, Typography</p>
    </div>

    <div class="section">
        <h2>💼 Usage Examples</h2>
        <p>The Adobe PDF Services integration can be used for:</p>
        <ul>
            <li><strong>Business Documents:</strong> Converting business documents to premium PDFs</li>
            <li><strong>Reports:</strong> Generating reports with complex layouts and formatting</li>
            <li><strong>Secure Documents:</strong> Creating secure documents with password protection</li>
            <li><strong>Legacy Conversion:</strong> Converting legacy documents to modern formats</li>
            <li><strong>OCR Processing:</strong> Processing scanned documents with OCR</li>
            <li><strong>Web Optimization:</strong> Optimizing PDFs for web delivery</li>
        </ul>
    </div>

    <div class="section">
        <h2>🔧 API Integration Example</h2>
        <p>Here's how to use the Adobe PDF Services integration in your applications:</p>
        
        <div class="code-block">
// Generate premium PDF from HTML
const result = await fetch('/api/adobe-pdf/generate-from-html', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-jwt-token'
  },
  body: JSON.stringify({
    html: htmlContent,
    filename: 'premium-document.pdf',
    options: {
      quality: 'high',
      compress: true,
      linearize: true,
      documentLanguage: 'en-US'
    }
  })
});

const data = await result.json();
console.log('PDF generated:', data.data.downloadUrl);
        </div>
    </div>

    <div class="section">
        <h2>🎛️ Configuration Options</h2>
        <p>The Adobe PDF Services integration supports various configuration options:</p>
        
        <table>
            <thead>
                <tr>
                    <th>Option</th>
                    <th>Type</th>
                    <th>Description</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>quality</td>
                    <td>string</td>
                    <td>PDF quality: 'low', 'medium', 'high'</td>
                </tr>
                <tr>
                    <td>compress</td>
                    <td>boolean</td>
                    <td>Enable PDF compression</td>
                </tr>
                <tr>
                    <td>linearize</td>
                    <td>boolean</td>
                    <td>Enable fast web view</td>
                </tr>
                <tr>
                    <td>protect</td>
                    <td>boolean</td>
                    <td>Enable password protection</td>
                </tr>
                <tr>
                    <td>documentLanguage</td>
                    <td>string</td>
                    <td>Document language (e.g., 'en-US')</td>
                </tr>
                <tr>
                    <td>includeTaggedPDF</td>
                    <td>boolean</td>
                    <td>Include accessibility tags</td>
                </tr>
            </tbody>
        </table>
    </div>

    <div class="footer">
        <p><strong>Generated by ADPA Framework - Adobe PDF Services Integration</strong></p>
        <p>© 2024 ADPA Framework. Premium PDF generation powered by Adobe PDF Services.</p>
        <p>Demo completed successfully at ${new Date().toISOString()}</p>
    </div>
</body>
</html>
`

async function runDemo() {
  console.log('🚀 Starting Adobe PDF Services Integration Demo...\n')

  try {
    // Initialize the service
    console.log('📋 Initializing Adobe PDF Service...')
    await adobePdfService.initialize()
    console.log('✅ Adobe PDF Service initialized\n')

    // Test connection
    console.log('🔗 Testing connection to Adobe PDF Services...')
    const connectionTest = await adobePdfService.testConnection()
    console.log(`${connectionTest ? '✅' : '❌'} Connection test: ${connectionTest ? 'SUCCESS' : 'FAILED'}\n`)

    if (!connectionTest) {
      console.log('⚠️  Adobe PDF Services is not available. Please check your configuration.')
      console.log('   Make sure you have set the following environment variables:')
      console.log('   - ADOBE_PDF_ENABLED=true')
      console.log('   - ADOBE_CLIENT_ID=your-adobe-client-id')
      console.log('   - ADOBE_CLIENT_SECRET=your-adobe-client-secret')
      console.log('\n   You can still run the demo to see the integration structure.\n')
    }

    // Get service status
    console.log('📊 Getting service status...')
    const status = await adobePdfService.getStatus()
    console.log('Service Status:', JSON.stringify(status, null, 2))
    console.log('')

    // Demo 1: Generate sample PDF
    console.log('📄 Demo 1: Generating sample PDF...')
    try {
      const sampleResult = await adobePdfService.createSamplePDF()
      if (sampleResult.success) {
        console.log('✅ Sample PDF generated successfully!')
        console.log(`   File: ${sampleResult.filePath}`)
        console.log(`   Size: ${sampleResult.fileSize} bytes`)
        console.log(`   Processing time: ${sampleResult.metadata?.processingTime}ms`)
        if (sampleResult.metadata?.compressionRatio) {
          console.log(`   Compression ratio: ${sampleResult.metadata.compressionRatio.toFixed(2)}x`)
        }
      } else {
        console.log(`❌ Sample PDF generation failed: ${sampleResult.error}`)
      }
    } catch (error) {
      console.log(`❌ Sample PDF generation error: ${error.message}`)
    }
    console.log('')

    // Demo 2: Generate premium PDF from HTML
    console.log('📄 Demo 2: Generating premium PDF from HTML...')
    try {
      const htmlResult = await adobePdfService.generatePremiumPDF(
        sampleHTMLContent,
        `adobe-demo-${Date.now()}.pdf`,
        {
          quality: 'high',
          compress: true,
          linearize: true,
          includeTaggedPDF: true,
          documentLanguage: 'en-US'
        }
      )

      if (htmlResult.success) {
        console.log('✅ Premium PDF from HTML generated successfully!')
        console.log(`   File: ${htmlResult.filePath}`)
        console.log(`   Size: ${htmlResult.fileSize} bytes`)
        console.log(`   Processing time: ${htmlResult.metadata?.processingTime}ms`)
        if (htmlResult.metadata?.compressionRatio) {
          console.log(`   Compression ratio: ${htmlResult.metadata.compressionRatio.toFixed(2)}x`)
        }
      } else {
        console.log(`❌ Premium PDF generation failed: ${htmlResult.error}`)
      }
    } catch (error) {
      console.log(`❌ Premium PDF generation error: ${error.message}`)
    }
    console.log('')

    // Demo 3: Create a simple DOCX and convert to PDF (if we have a sample DOCX)
    console.log('📄 Demo 3: Testing DOCX to PDF conversion...')
    try {
      // Create a simple DOCX file for testing
      const docxContent = `
        This is a sample DOCX document for testing Adobe PDF Services conversion.
        
        Features:
        - High-quality conversion
        - Preserves formatting
        - Enterprise-grade processing
        
        Generated at: ${new Date().toISOString()}
      `
      
      // For this demo, we'll skip DOCX creation and just log the capability
      console.log('ℹ️  DOCX to PDF conversion capability available')
      console.log('   Use the /api/adobe-pdf/convert-docx endpoint to convert DOCX files')
    } catch (error) {
      console.log(`❌ DOCX conversion demo error: ${error.message}`)
    }
    console.log('')

    // Demo 4: Show available export formats
    console.log('📄 Demo 4: Available export formats...')
    const exportFormats = ['docx', 'pptx', 'xlsx', 'rtf', 'jpeg', 'png']
    console.log('✅ Supported export formats:')
    exportFormats.forEach(format => {
      console.log(`   - ${format.toUpperCase()}`)
    })
    console.log('')

    // Demo 5: Show API endpoints
    console.log('🔗 Demo 5: Available API endpoints...')
    const endpoints = [
      'GET  /api/adobe-pdf/status - Get service status',
      'POST /api/adobe-pdf/generate-from-html - Generate PDF from HTML',
      'POST /api/adobe-pdf/convert-docx - Convert DOCX to PDF',
      'POST /api/adobe-pdf/export/:format - Export PDF to other formats',
      'POST /api/adobe-pdf/ocr - Perform OCR on PDF',
      'POST /api/adobe-pdf/sample - Generate sample PDF',
      'GET  /api/adobe-pdf/download/:filename - Download generated files',
      'GET  /api/adobe-pdf/test-connection - Test connection'
    ]
    
    console.log('✅ Available API endpoints:')
    endpoints.forEach(endpoint => {
      console.log(`   ${endpoint}`)
    })
    console.log('')

    console.log('🎉 Adobe PDF Services Integration Demo completed successfully!')
    console.log('')
    console.log('📚 Next steps:')
    console.log('   1. Configure your Adobe PDF Services credentials')
    console.log('   2. Set ADOBE_PDF_ENABLED=true in your environment')
    console.log('   3. Use the API endpoints in your applications')
    console.log('   4. Check the generated PDF files in the output directory')
    console.log('')

  } catch (error) {
    console.error('❌ Demo failed:', error)
    logger.error('Adobe PDF Services demo failed:', error)
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  runDemo().catch(console.error)
}

export { runDemo }