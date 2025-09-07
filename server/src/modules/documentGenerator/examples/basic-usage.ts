/**
 * Document Generator Basic Usage Examples
 * 
 * This file demonstrates how to use the document generator module
 * to create documents from templates in various formats.
 */

import { documentGeneratorService } from '../service'
import { OutputFormat } from '../types'
import type { DocumentGenerationRequest, AuthenticatedUser } from '../types'

// Example user (in real usage, this would come from authentication)
const exampleUser: AuthenticatedUser = {
  id: 'user-123',
  email: 'developer@example.com',
  role: 'user',
  permissions: {}
}

/**
 * Example 1: Generate a simple Markdown document
 */
export async function generateMarkdownExample(): Promise<void> {
  const request: DocumentGenerationRequest = {
    template_id: 'template-uuid-here',
    data: {
      title: 'Project Requirements Document',
      author: 'John Doe',
      date: new Date().toISOString().split('T')[0],
      project_name: 'ADPA Framework',
      description: 'This document outlines the requirements for the ADPA Framework project.',
      requirements: [
        'User authentication and authorization',
        'Document template management',
        'AI-powered content generation',
        'Integration with external systems'
      ]
    },
    output_format: OutputFormat.MARKDOWN,
    options: {
      filename: 'project-requirements.md'
    }
  }

  try {
    const result = await documentGeneratorService.generateDocument(request, exampleUser)
    console.log('Markdown document generated:', result.file_url)
    console.log('Generation time:', result.metadata.generation_time_ms, 'ms')
  } catch (error) {
    console.error('Failed to generate Markdown document:', error.message)
  }
}

/**
 * Example 2: Generate a PDF document with custom styling
 */
export async function generatePDFExample(): Promise<void> {
  const request: DocumentGenerationRequest = {
    template_id: 'template-uuid-here',
    data: {
      title: 'Business Analysis Report',
      company: 'ACME Corporation',
      analyst: 'Jane Smith',
      date: new Date().toLocaleDateString(),
      executive_summary: 'This report provides an analysis of current business processes...',
      findings: [
        'Process efficiency can be improved by 30%',
        'Technology adoption is below industry standards',
        'Staff training programs need enhancement'
      ],
      recommendations: [
        'Implement automated workflow systems',
        'Upgrade legacy technology infrastructure',
        'Develop comprehensive training programs'
      ]
    },
    output_format: OutputFormat.PDF,
    options: {
      filename: 'business-analysis-report.pdf',
      page_size: 'A4',
      orientation: 'portrait',
      margins: {
        top: '1in',
        right: '0.75in',
        bottom: '1in',
        left: '0.75in'
      },
      include_header: true,
      header_template: `
        <div style="font-size: 10px; text-align: center; width: 100%; color: #666;">
          Business Analysis Report - ACME Corporation
        </div>
      `,
      include_footer: true,
      footer_template: `
        <div style="font-size: 10px; text-align: center; width: 100%; color: #666;">
          Page <span class="pageNumber"></span> of <span class="totalPages"></span>
        </div>
      `,
      css_styles: `
        body {
          font-family: 'Times New Roman', serif;
          line-height: 1.6;
          color: #333;
        }
        h1 {
          color: #2c3e50;
          border-bottom: 2px solid #3498db;
          padding-bottom: 10px;
        }
        h2 {
          color: #34495e;
          margin-top: 30px;
        }
        .executive-summary {
          background-color: #f8f9fa;
          padding: 20px;
          border-left: 4px solid #3498db;
          margin: 20px 0;
        }
        ul {
          padding-left: 20px;
        }
        li {
          margin-bottom: 8px;
        }
      `
    }
  }

  try {
    const result = await documentGeneratorService.generateDocument(request, exampleUser)
    console.log('PDF document generated:', result.file_url)
    console.log('File size:', result.file_size, 'bytes')
  } catch (error) {
    console.error('Failed to generate PDF document:', error.message)
  }
}

/**
 * Example 3: Generate a DOCX document for collaboration
 */
export async function generateDOCXExample(): Promise<void> {
  const request: DocumentGenerationRequest = {
    template_id: 'template-uuid-here',
    data: {
      title: 'Project Charter',
      project_name: 'Digital Transformation Initiative',
      project_manager: 'Alice Johnson',
      sponsor: 'Bob Wilson',
      start_date: '2024-01-15',
      end_date: '2024-12-31',
      budget: '$500,000',
      objectives: [
        'Modernize legacy systems',
        'Improve customer experience',
        'Increase operational efficiency',
        'Enable data-driven decision making'
      ],
      scope: 'This project encompasses the digital transformation of core business processes...',
      deliverables: [
        'Updated system architecture',
        'Migrated applications',
        'Staff training materials',
        'Performance metrics dashboard'
      ],
      risks: [
        { risk: 'Technical complexity', mitigation: 'Engage experienced consultants' },
        { risk: 'Budget overrun', mitigation: 'Regular budget reviews and controls' },
        { risk: 'Staff resistance', mitigation: 'Comprehensive change management program' }
      ]
    },
    output_format: OutputFormat.DOCX,
    options: {
      filename: 'project-charter.docx',
      page_size: 'Letter',
      orientation: 'portrait'
    }
  }

  try {
    const result = await documentGeneratorService.generateDocument(request, exampleUser)
    console.log('DOCX document generated:', result.file_url)
    console.log('Variables used:', result.metadata.variables_used)
  } catch (error) {
    console.error('Failed to generate DOCX document:', error.message)
  }
}

/**
 * Example 4: Generate an HTML document for web display
 */
export async function generateHTMLExample(): Promise<void> {
  const request: DocumentGenerationRequest = {
    template_id: 'template-uuid-here',
    data: {
      title: 'API Documentation',
      version: '1.0.0',
      base_url: 'https://api.example.com',
      endpoints: [
        {
          method: 'GET',
          path: '/api/users',
          description: 'Retrieve list of users',
          parameters: [
            { name: 'page', type: 'integer', description: 'Page number' },
            { name: 'limit', type: 'integer', description: 'Items per page' }
          ]
        },
        {
          method: 'POST',
          path: '/api/users',
          description: 'Create a new user',
          body: {
            name: 'string',
            email: 'string',
            role: 'string'
          }
        }
      ],
      authentication: 'Bearer token required in Authorization header',
      rate_limits: '1000 requests per hour per API key'
    },
    output_format: OutputFormat.HTML,
    options: {
      filename: 'api-documentation.html',
      css_styles: `
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f8f9fa;
        }
        .container {
          background: white;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .endpoint {
          background: #f8f9fa;
          padding: 20px;
          margin: 20px 0;
          border-radius: 5px;
          border-left: 4px solid #007bff;
        }
        .method {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 3px;
          font-weight: bold;
          color: white;
          margin-right: 10px;
        }
        .method.get { background-color: #28a745; }
        .method.post { background-color: #007bff; }
        .method.put { background-color: #ffc107; color: #212529; }
        .method.delete { background-color: #dc3545; }
        code {
          background: #e9ecef;
          padding: 2px 6px;
          border-radius: 3px;
          font-family: 'Monaco', 'Consolas', monospace;
        }
        pre {
          background: #2d3748;
          color: #e2e8f0;
          padding: 20px;
          border-radius: 5px;
          overflow-x: auto;
        }
      `
    }
  }

  try {
    const result = await documentGeneratorService.generateDocument(request, exampleUser)
    console.log('HTML document generated:', result.file_url)
    console.log('Ready for web display')
  } catch (error) {
    console.error('Failed to generate HTML document:', error.message)
  }
}

/**
 * Example 5: Batch generation with different formats
 */
export async function batchGenerationExample(): Promise<void> {
  const baseData = {
    title: 'System Architecture Document',
    version: '2.0',
    author: 'Architecture Team',
    date: new Date().toISOString().split('T')[0],
    overview: 'This document describes the system architecture...',
    components: [
      'Frontend Application',
      'API Gateway',
      'Microservices',
      'Database Layer',
      'Caching Layer'
    ]
  }

  const formats = [
    { format: OutputFormat.MARKDOWN, filename: 'architecture.md' },
    { format: OutputFormat.PDF, filename: 'architecture.pdf' },
    { format: OutputFormat.DOCX, filename: 'architecture.docx' },
    { format: OutputFormat.HTML, filename: 'architecture.html' }
  ]

  console.log('Starting batch generation...')

  for (const { format, filename } of formats) {
    try {
      const request: DocumentGenerationRequest = {
        template_id: 'template-uuid-here',
        data: baseData,
        output_format: format,
        options: { filename }
      }

      const result = await documentGeneratorService.generateDocument(request, exampleUser)
      console.log(`✅ Generated ${format}: ${result.file_url}`)
    } catch (error) {
      console.error(`❌ Failed to generate ${format}:`, error.message)
    }
  }

  console.log('Batch generation completed')
}

/**
 * Example 6: Monitor generation status
 */
export async function monitorGenerationExample(): Promise<void> {
  const request: DocumentGenerationRequest = {
    template_id: 'template-uuid-here',
    data: {
      title: 'Large Report',
      content: 'This is a large document that takes time to generate...'
    },
    output_format: OutputFormat.PDF
  }

  try {
    // Start generation
    const result = await documentGeneratorService.generateDocument(request, exampleUser)
    const generationId = result.id

    // Monitor status (in real usage, you might poll this)
    const status = await documentGeneratorService.getGenerationStatus(generationId)
    console.log('Generation status:', status)

    if (status?.status === 'completed') {
      console.log('Document ready:', status.result?.file_url)
    } else if (status?.status === 'failed') {
      console.error('Generation failed:', status.error)
    }
  } catch (error) {
    console.error('Generation error:', error.message)
  }
}

/**
 * Example 7: Get generation statistics
 */
export async function getStatsExample(): Promise<void> {
  try {
    const stats = await documentGeneratorService.getGenerationStats(exampleUser)
    
    console.log('Generation Statistics:')
    console.log('- Total generations:', stats.total_generations)
    console.log('- Success rate:', 
      Math.round((stats.successful_generations / stats.total_generations) * 100) + '%')
    console.log('- Average generation time:', stats.average_generation_time + 'ms')
    console.log('- Most used format:', 
      Object.entries(stats.most_used_formats)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'None')
  } catch (error) {
    console.error('Failed to get stats:', error.message)
  }
}

// Example template content (this would typically be stored in the database)
export const exampleTemplateContent = `
# {{title}}

**Author:** {{author}}  
**Date:** {{date}}  
**Version:** {{version}}

## Overview

{{overview}}

## Project Information

- **Project Name:** {{project_name}}
- **Project Manager:** {{project_manager}}
- **Budget:** {{budget}}
- **Timeline:** {{start_date}} to {{end_date}}

## Objectives

{{#each objectives}}
- {{this}}
{{/each}}

## Requirements

{{#each requirements}}
- {{this}}
{{/each}}

## Components

{{#each components}}
- **{{this}}**
{{/each}}

## Risks and Mitigation

{{#each risks}}
- **Risk:** {{this.risk}}
- **Mitigation:** {{this.mitigation}}

{{/each}}

---

*Generated on {{formatDate created_at}} using ADPA Document Generator*
`

// Run examples (uncomment to test)
// generateMarkdownExample()
// generatePDFExample()
// generateDOCXExample()
// generateHTMLExample()
// batchGenerationExample()
// monitorGenerationExample()
// getStatsExample()