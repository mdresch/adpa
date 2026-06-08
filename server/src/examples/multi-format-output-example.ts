/**
 * Multi-Format Output Engine Example
 * Demonstrates how to use the MultiFormatOutputEngine for document conversion
 */

import { MultiFormatOutputEngine, FormatConversionOptions } from '../modules/multiStageDocumentProcessor/engines/multiFormatOutputEngine'
import { logger } from '../utils/logger'
import fs from 'fs/promises'
import path from 'path'

async function demonstrateFormatConversion() {
  const engine = MultiFormatOutputEngine.getInstance()
  const outputRoot = path.resolve(process.cwd(), 'output', 'format-examples')
  const safeOutputPath = (filename: string) => {
    const outputPath = path.resolve(outputRoot, path.basename(filename))
    if (!outputPath.startsWith(`${outputRoot}${path.sep}`) && outputPath !== outputRoot) {
      throw new Error('Invalid output path')
    }
    return outputPath
  }

  // Sample markdown content
  const sampleMarkdown = `# ADPA Framework Document

## Executive Summary

The ADPA (Automated Document Processing and Analysis) Framework is a comprehensive solution for document generation, processing, and analysis. This framework provides multi-stage document processing capabilities with AI-powered content generation.

### Key Features

- **Multi-Stage Processing**: Documents go through multiple stages including context gathering, template processing, AI generation, context injection, quality assurance, and output formatting.
- **AI Integration**: Supports multiple AI providers including OpenAI, Google AI, Azure AI, and Mistral.
- **Format Flexibility**: Converts documents to multiple formats including PDF, DOCX, HTML, Markdown, JSON, XML, and plain text.
- **Quality Assurance**: Built-in quality assessment and validation mechanisms.

## Technical Architecture

### Stage 1: Context Gathering
The context gathering stage collects relevant information from various sources:

1. Project context and requirements
2. User preferences and profiles
3. Historical document data
4. External integrations (Confluence, SharePoint, GitHub)

### Stage 2: Template Processing
Template processing involves:

- Variable resolution and substitution
- Template inheritance and composition
- Methodology-specific formatting
- Compliance validation

### Stage 3: AI Generation
AI-powered content generation features:

- Multi-model AI integration
- Context-aware content creation
- Stakeholder-specific customization
- Quality-driven refinement

## Implementation Details

### Code Example

\`\`\`typescript
const engine = MultiFormatOutputEngine.getInstance()
const result = await engine.convertFromMarkdown(
  markdownContent,
  'pdf',
  { includeMetadata: true }
)
\`\`\`

### Configuration Options

The framework supports various configuration options:

- **Styling Options**: Font family, size, line height, margins
- **Page Settings**: Orientation, format (A4, Letter, Legal)
- **Metadata Inclusion**: Optional metadata in output
- **Quality Thresholds**: Configurable quality gates

## Conclusion

The ADPA Framework provides a robust, scalable solution for automated document processing with multi-format output capabilities. Its modular architecture ensures flexibility and extensibility for various use cases.

---

*This document was generated using the ADPA Framework's multi-format output engine.*`

  try {
    console.log('🚀 Starting Multi-Format Output Engine Demonstration\n')

    // Create output directory
    const outputDir = outputRoot
    await fs.mkdir(outputDir, { recursive: true })

    // Define conversion options
    const conversionOptions: FormatConversionOptions = {
      includeMetadata: true,
      styling: {
        fontFamily: 'Arial, sans-serif',
        fontSize: 12,
        lineHeight: 1.6,
        margins: {
          top: 25,
          bottom: 25,
          left: 20,
          right: 20
        }
      },
      pageSettings: {
        orientation: 'portrait',
        format: 'A4'
      }
    }

    // Convert to different formats
    const formats = ['html', 'markdown', 'json', 'xml', 'txt']
    
    for (const format of formats) {
      console.log(`📄 Converting to ${format.toUpperCase()}...`)
      
      try {
        const result = await engine.convertFromMarkdown(
          sampleMarkdown,
          format,
          conversionOptions
        )

        // Save to file
        const filename = `sample-document.${format}`
        const filepath = safeOutputPath(filename)
        
        if (Buffer.isBuffer(result.content)) {
          await fs.writeFile(filepath, result.content)
        } else {
          await fs.writeFile(filepath, result.content, 'utf8')
        }

        console.log(`   ✅ ${format.toUpperCase()} conversion completed`)
        console.log(`   📁 Saved to: ${filepath}`)
        console.log(`   📊 Size: ${result.metadata.size} bytes`)
        if (result.metadata.pages) {
          console.log(`   📄 Pages: ${result.metadata.pages}`)
        }
        console.log(`   🕒 Generated: ${result.metadata.generatedAt}`)
        console.log('')

      } catch (error) {
        console.error(`   ❌ ${format.toUpperCase()} conversion failed:`, error.message)
        console.log('')
      }
    }

    // Demonstrate PDF conversion (requires puppeteer)
    console.log('📄 Converting to PDF...')
    try {
      const pdfResult = await engine.convertFromMarkdown(
        sampleMarkdown,
        'pdf',
        conversionOptions
      )

      const pdfPath = safeOutputPath('sample-document.pdf')
      await fs.writeFile(pdfPath, pdfResult.content)

      console.log('   ✅ PDF conversion completed')
      console.log(`   📁 Saved to: ${pdfPath}`)
      console.log(`   📊 Size: ${pdfResult.metadata.size} bytes`)
      console.log(`   📄 Pages: ${pdfResult.metadata.pages}`)
      console.log('')

    } catch (error) {
      console.error('   ❌ PDF conversion failed:', error.message)
      console.log('   💡 Note: PDF conversion requires puppeteer to be properly installed')
      console.log('')
    }

    // Demonstrate DOCX conversion
    console.log('📄 Converting to DOCX...')
    try {
      const docxResult = await engine.convertFromMarkdown(
        sampleMarkdown,
        'docx',
        conversionOptions
      )

      const docxPath = safeOutputPath('sample-document.docx')
      await fs.writeFile(docxPath, docxResult.content)

      console.log('   ✅ DOCX conversion completed')
      console.log(`   📁 Saved to: ${docxPath}`)
      console.log(`   📊 Size: ${docxResult.metadata.size} bytes`)
      console.log(`   📄 Pages: ${docxResult.metadata.pages}`)
      console.log('')

    } catch (error) {
      console.error('   ❌ DOCX conversion failed:', error.message)
      console.log('')
    }

    // Demonstrate format validation
    console.log('🔍 Testing Format Validation...')
    
    const testFormats = ['pdf', 'docx', 'html', 'markdown', 'json', 'xml', 'txt', 'invalid-format']
    
    for (const format of testFormats) {
      try {
        await engine.convertFromMarkdown('# Test', format, {})
        console.log(`   ✅ ${format}: Valid format`)
      } catch (error) {
        console.log(`   ❌ ${format}: ${error.message}`)
      }
    }

    console.log('\n🎉 Multi-Format Output Engine Demonstration Completed!')
    console.log(`📁 All output files saved to: ${outputDir}`)

    // Performance metrics
    console.log('\n📊 Performance Summary:')
    console.log(`   🕒 Total execution time: ${Date.now() - startTime}ms`)
    console.log(`   📄 Formats tested: ${formats.length + 2}`) // +2 for PDF and DOCX
    console.log(`   📁 Files generated: Check ${outputDir}`)

  } catch (error) {
    console.error('❌ Demonstration failed:', error.message)
    logger.error('Multi-format output demonstration failed', { error: error.message })
  } finally {
    // Cleanup resources
    await engine.cleanup()
    console.log('\n🧹 Resources cleaned up')
  }
}

// Example of using the DocumentFormatService
async function demonstrateDocumentFormatService() {
  console.log('\n🔧 Document Format Service Example\n')

  // This would typically be used with a real database connection
  console.log('📝 Example API Usage:')
  console.log('')
  
  console.log('1. Convert document to PDF:')
  console.log('   POST /api/documents/123/convert')
  console.log('   Body: { "format": "pdf", "options": { "pageSettings": { "orientation": "portrait" } } }')
  console.log('')
  
  console.log('2. Get available formats:')
  console.log('   GET /api/documents/123/formats')
  console.log('')
  
  console.log('3. Batch convert documents:')
  console.log('   POST /api/documents/batch-convert')
  console.log('   Body: { "requests": [{ "documentId": "123", "targetFormat": "pdf" }] }')
  console.log('')
  
  console.log('4. Update document with markdown:')
  console.log('   PUT /api/documents/123/markdown')
  console.log('   Body: { "content": "# My Document\\n\\nContent here..." }')
  console.log('')
  
  console.log('5. Get format conversion options:')
  console.log('   GET /api/documents/format-options')
  console.log('')
}

// Run the demonstration
const startTime = Date.now()

async function main() {
  await demonstrateFormatConversion()
  await demonstrateDocumentFormatService()
}

// Execute if run directly
if (require.main === module) {
  main().catch(console.error)
}

export { demonstrateFormatConversion, demonstrateDocumentFormatService }