/**
 * UX Documentation Service
 * Generates user manuals and guides highlighting how ADPA contributes to daily activities
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'
import { aiService as sharedAIService } from './aiService'
import { v4 as uuidv4 } from 'uuid'
import Handlebars from 'handlebars'

export interface DailyActivity {
  id: string
  title: string
  description: string
  category: 'project_management' | 'document_generation' | 'collaboration' | 'analytics' | 'administration'
  time_saved?: string
  productivity_impact?: string
  adpa_features_used: string[]
  steps: string[]
  benefits: string[]
  before_adpa?: string
  after_adpa?: string
}

export interface UXDocumentationRequest {
  target_audience: 'end_users' | 'administrators' | 'portfolio_managers' | 'project_managers' | 'all'
  document_type: 'quick_start' | 'daily_activities' | 'feature_highlight' | 'complete_manual'
  focus_areas?: string[]
  include_screenshots?: boolean
  include_examples?: boolean
  tone?: 'professional' | 'friendly' | 'technical'
  output_format: 'markdown' | 'pdf' | 'docx'
  project_id?: string
}

export interface UXDocumentationResponse {
  id: string
  title: string
  content: string
  format: string
  sections: string[]
  daily_activities: DailyActivity[]
  generated_at: Date
  metadata: {
    word_count: number
    estimated_reading_time: number
    target_audience: string
    document_type: string
  }
}

export class UXDocumentationService {
  private aiService = sharedAIService

  constructor() {}

  /**
   * Generate UX documentation based on request
   */
  async generateUXDocumentation(
    request: UXDocumentationRequest,
    userId: string
  ): Promise<UXDocumentationResponse> {
    const documentationId = uuidv4()
    const startTime = Date.now()

    try {
      logger.info(`Generating UX documentation: ${documentationId}`, {
        user_id: userId,
        document_type: request.document_type,
        target_audience: request.target_audience
      })

      // Gather daily activities from system
      const dailyActivities = await this.gatherDailyActivities(request)

      // Generate content sections based on document type
      const sections = await this.generateDocumentSections(request, dailyActivities, userId)

      // Combine sections into full document
      const content = await this.combineDocumentSections(request, sections, dailyActivities)

      // Calculate metadata
      const wordCount = this.calculateWordCount(content)
      const readingTime = this.estimateReadingTime(wordCount)

      const response: UXDocumentationResponse = {
        id: documentationId,
        title: this.generateTitle(request),
        content,
        format: request.output_format,
        sections: sections.map(s => s.title),
        daily_activities: dailyActivities,
        generated_at: new Date(),
        metadata: {
          word_count: wordCount,
          estimated_reading_time: readingTime,
          target_audience: request.target_audience,
          document_type: request.document_type
        }
      }

      const duration = Date.now() - startTime
      logger.info(`UX documentation generated successfully: ${documentationId}`, {
        duration_ms: duration,
        word_count: wordCount
      })

      return response
    } catch (error) {
      logger.error(`Failed to generate UX documentation: ${documentationId}`, error)
      throw error
    }
  }

  /**
   * Gather daily activities from the system
   */
  async gatherDailyActivities(request: UXDocumentationRequest): Promise<DailyActivity[]> {
    const activities: DailyActivity[] = []

    try {
      // Get project-specific activities if project_id provided
      if (request.project_id) {
        const projectActivities = await this.getProjectActivities(request.project_id)
        activities.push(...projectActivities)
      }

      // Get system-wide daily activities
      const systemActivities = await this.getSystemDailyActivities(request.target_audience)
      activities.push(...systemActivities)

      // Get feature-specific activities if focus areas specified
      if (request.focus_areas && request.focus_areas.length > 0) {
        const featureActivities = await this.getFeatureActivities(request.focus_areas)
        activities.push(...featureActivities)
      }

      return activities
    } catch (error) {
      logger.error('Failed to gather daily activities', error)
      return this.getDefaultDailyActivities(request.target_audience)
    }
  }

  /**
   * Get project-specific activities
   */
  private async getProjectActivities(projectId: string): Promise<DailyActivity[]> {
    try {
      // Get document generation stats
      const docStats = await pool.query(
        `SELECT COUNT(*) as count, 
                AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_time
         FROM documents 
         WHERE project_id = $1`,
        [projectId]
      )

      // Get template usage
      const templateUsage = await pool.query(
        `SELECT t.name, t.category, COUNT(d.id) as usage_count
         FROM templates t
         JOIN documents d ON d.template_id = t.id
         WHERE d.project_id = $1
         GROUP BY t.id, t.name, t.category
         ORDER BY usage_count DESC
         LIMIT 5`,
        [projectId]
      )

      const activities: DailyActivity[] = []

      if (docStats.rows[0]?.count > 0) {
        activities.push({
          id: uuidv4(),
          title: 'Generate Project Documents',
          description: 'Create standards-compliant documents for your project',
          category: 'document_generation',
          time_saved: '80-90% reduction in document creation time',
          productivity_impact: 'High',
          adpa_features_used: ['Document Generator', 'AI Templates', 'Standards Compliance'],
          steps: [
            'Select a template from the template library',
            'Fill in project-specific context variables',
            'Choose an AI provider for content generation',
            'Review and edit the generated document',
            'Export to your preferred format (PDF, DOCX, Markdown)'
          ],
          benefits: [
            'Consistent document structure across projects',
            'AI-powered content generation saves hours of writing',
            'Automatic compliance with PMBOK, BABOK, or DMBOK standards',
            'Easy customization with project-specific information'
          ]
        })
      }

      return activities
    } catch (error) {
      logger.error('Failed to get project activities', error)
      return []
    }
  }

  /**
   * Get system-wide daily activities
   */
  private async getSystemDailyActivities(targetAudience: string): Promise<DailyActivity[]> {
    const activities: DailyActivity[] = [
      {
        id: uuidv4(),
        title: 'Monitor Project Dashboards',
        description: 'Track project health and progress at a glance',
        category: 'analytics',
        time_saved: '75% reduction in status meeting preparation',
        productivity_impact: 'High',
        adpa_features_used: ['Executive Dashboards', 'Real-time Analytics', 'Drift Detection'],
        steps: [
          'Access the project dashboard from the sidebar',
          'Review key metrics and KPIs',
          'Check for drift alerts and notifications',
          'Export reports for stakeholders'
        ],
        benefits: [
          'Real-time visibility into project status',
          'Early detection of project drift',
          'Reduced time preparing status reports',
          'Data-driven decision making'
        ],
        before_adpa: 'Spend 2-3 hours weekly gathering data and preparing status reports',
        after_adpa: '5-minute dashboard review with automatic alerts and ready-to-share reports'
      },
      {
        id: uuidv4(),
        title: 'Create and Manage Baselines',
        description: 'Establish project baselines and track changes over time',
        category: 'project_management',
        time_saved: '60% reduction in baseline management overhead',
        productivity_impact: 'Medium',
        adpa_features_used: ['Baseline Management', 'Version Control', 'Change Tracking'],
        steps: [
          'Navigate to the project baseline page',
          'Create a new baseline with current project state',
          'Set approval workflow for baseline changes',
          'Monitor baseline drift and manage change requests'
        ],
        benefits: [
          'Clear snapshot of project state at key milestones',
          'Automatic tracking of changes and drift',
          'Streamlined approval workflows',
          'Historical comparison and analysis'
        ]
      },
      {
        id: uuidv4(),
        title: 'Collaborate on Documents',
        description: 'Work together with team members on document creation and review',
        category: 'collaboration',
        time_saved: '50% reduction in document review cycles',
        productivity_impact: 'High',
        adpa_features_used: ['Real-time Collaboration', 'Document Sharing', 'Comment System'],
        steps: [
          'Open a document in collaboration mode',
          'Invite team members to review',
          'Add comments and suggestions',
          'Track changes and resolve feedback',
          'Approve and publish final version'
        ],
        benefits: [
          'Real-time collaboration reduces email back-and-forth',
          'Centralized feedback and version control',
          'Faster review and approval cycles',
          'Clear audit trail of changes'
        ]
      },
      {
        id: uuidv4(),
        title: 'Prioritize Portfolio Projects',
        description: 'Use data-driven prioritization to allocate resources effectively',
        category: 'analytics',
        time_saved: '70% reduction in prioritization meeting time',
        productivity_impact: 'High',
        adpa_features_used: ['Portfolio Prioritization Matrix', 'Multi-criteria Scoring', 'Scenario Analysis'],
        steps: [
          'Access the portfolio prioritization page',
          'Define or select prioritization criteria',
          'Score each project against criteria',
          'Review ranked results and scenarios',
          'Export prioritization report for stakeholders'
        ],
        benefits: [
          'Objective, data-driven prioritization',
          'Transparent decision-making process',
          'Support for multiple prioritization strategies',
          'Quick scenario analysis for what-if planning'
        ]
      },
      {
        id: uuidv4(),
        title: 'Generate AI-Powered Documents',
        description: 'Create professional documents in seconds instead of hours',
        category: 'document_generation',
        time_saved: '90% reduction in document creation time',
        productivity_impact: 'Very High',
        adpa_features_used: ['AI Document Generation', 'Template Library', 'Multi-format Export'],
        steps: [
          'Select a template from the library',
          'Provide project context and variables',
          'Choose AI provider and generate',
          'Review and customize generated content',
          'Export to PDF, DOCX, or Markdown'
        ],
        benefits: [
          'Generate complex documents in 30-60 seconds',
          'Standards-compliant output (PMBOK, BABOK, DMBOK)',
          'Consistent quality and structure',
          'Easy customization for specific needs'
        ],
        before_adpa: '7 hours to create a comprehensive project charter manually',
        after_adpa: '43 seconds to generate, plus 15 minutes for review and customization'
      }
    ]

    // Filter by target audience if needed
    if (targetAudience === 'administrators') {
      return activities.filter(a => a.category === 'administration' || a.category === 'project_management')
    }

    return activities
  }

  /**
   * Get feature-specific activities
   */
  private async getFeatureActivities(focusAreas: string[]): Promise<DailyActivity[]> {
    // This would query the database for activities related to specific features
    // For now, return empty array - can be enhanced later
    return []
  }

  /**
   * Get default daily activities if gathering fails
   */
  private getDefaultDailyActivities(targetAudience: string): DailyActivity[] {
    return this.getSystemDailyActivities(targetAudience)
  }

  /**
   * Generate document sections based on document type
   */
  private async generateDocumentSections(
    request: UXDocumentationRequest,
    activities: DailyActivity[],
    userId: string
  ): Promise<Array<{ title: string; content: string }>> {
    const sections: Array<{ title: string; content: string }> = []

    switch (request.document_type) {
      case 'quick_start':
        sections.push(...await this.generateQuickStartSections(request, activities))
        break
      case 'daily_activities':
        sections.push(...await this.generateDailyActivitiesSections(request, activities))
        break
      case 'feature_highlight':
        sections.push(...await this.generateFeatureHighlightSections(request, activities))
        break
      case 'complete_manual':
        sections.push(...await this.generateCompleteManualSections(request, activities))
        break
    }

    return sections
  }

  /**
   * Generate quick start guide sections
   */
  private async generateQuickStartSections(
    request: UXDocumentationRequest,
    activities: DailyActivity[]
  ): Promise<Array<{ title: string; content: string }>> {
    const sections: Array<{ title: string; content: string }> = []

    sections.push({
      title: 'Introduction',
      content: `# ADPA Quick Start Guide

Welcome to ADPA! This guide will help you understand how ADPA can transform your daily work.

## What is ADPA?

ADPA (Advanced Document Processing & Automation) is an enterprise-grade platform that uses AI to automate document generation and project management tasks, saving you hours every day.

## Key Benefits

- **90% time savings** on document creation
- **75% reduction** in status reporting time
- **Real-time collaboration** on documents
- **Data-driven insights** for better decision making
`
    })

    sections.push({
      title: 'Your First 5 Minutes',
      content: `## Getting Started in 5 Minutes

1. **Create a Project** (1 minute)
   - Click "New Project" in the sidebar
   - Enter project name and description
   - Set project status and dates

2. **Generate Your First Document** (2 minutes)
   - Go to your project → Documents
   - Click "Generate Document"
   - Select a template (e.g., Project Charter)
   - Fill in project details
   - Click "Generate"

3. **Review and Export** (2 minutes)
   - Review the generated content
   - Make any necessary edits
   - Export to PDF or DOCX

**Congratulations!** You've just created a professional document in minutes instead of hours.
`
    })

    return sections
  }

  /**
   * Generate daily activities sections
   */
  private async generateDailyActivitiesSections(
    request: UXDocumentationRequest,
    activities: DailyActivity[]
  ): Promise<Array<{ title: string; content: string }>> {
    const sections: Array<{ title: string; content: string }> = []

    sections.push({
      title: 'How ADPA Transforms Your Daily Activities',
      content: `# How ADPA Transforms Your Daily Activities

This guide highlights how ADPA contributes to your daily work and helps you accomplish more with less effort.

## Overview

ADPA transforms routine tasks from time-consuming manual work into quick, efficient processes. This document shows you exactly how ADPA impacts each of your daily activities.
`
    })

    // Add a section for each activity
    for (const activity of activities) {
      const beforeAfter = activity.before_adpa && activity.after_adpa
        ? `\n\n### Before vs After ADPA\n\n- **Before**: ${activity.before_adpa}\n- **After**: ${activity.after_adpa}`
        : ''

      sections.push({
        title: activity.title,
        content: `## ${activity.title}

**Category**: ${this.formatCategory(activity.category)}  
**Time Saved**: ${activity.time_saved || 'Significant'}  
**Productivity Impact**: ${activity.productivity_impact || 'High'}

### Description

${activity.description}

### How ADPA Helps

${activity.benefits.map(b => `- ${b}`).join('\n')}${beforeAfter}

### Step-by-Step Process

${activity.steps.map((step, idx) => `${idx + 1}. ${step}`).join('\n')}

### ADPA Features Used

${activity.adpa_features_used.map(f => `- ${f}`).join('\n')}
`
      })
    }

    return sections
  }

  /**
   * Generate feature highlight sections
   */
  private async generateFeatureHighlightSections(
    request: UXDocumentationRequest,
    activities: DailyActivity[]
  ): Promise<Array<{ title: string; content: string }>> {
    // Group activities by category/feature
    const featureGroups = this.groupActivitiesByFeature(activities)

    const sections: Array<{ title: string; content: string }> = []

    for (const [feature, featureActivities] of Object.entries(featureGroups)) {
      sections.push({
        title: feature,
        content: `## ${feature}

${featureActivities.map(activity => `### ${activity.title}\n\n${activity.description}\n\n**Benefits**: ${activity.benefits.join(', ')}\n`).join('\n')}
`
      })
    }

    return sections
  }

  /**
   * Generate complete manual sections
   */
  private async generateCompleteManualSections(
    request: UXDocumentationRequest,
    activities: DailyActivity[]
  ): Promise<Array<{ title: string; content: string }>> {
    // Combine all section types for complete manual
    const quickStart = await this.generateQuickStartSections(request, activities)
    const dailyActivities = await this.generateDailyActivitiesSections(request, activities)
    
    return [...quickStart, ...dailyActivities]
  }

  /**
   * Combine document sections into full content
   */
  private async combineDocumentSections(
    request: UXDocumentationRequest,
    sections: Array<{ title: string; content: string }>,
    activities: DailyActivity[]
  ): Promise<string> {
    const template = Handlebars.compile(`# {{title}}

{{#each sections}}
{{content}}

---

{{/each}}

## Summary

ADPA transforms your daily work by automating routine tasks and providing powerful tools for project management and documentation. 

### Total Impact

- **${activities.length} daily activities** enhanced with ADPA
- **Average time savings**: 70-90% on routine tasks
- **Productivity increase**: Significant across all activities

### Next Steps

1. Try the activities outlined in this guide
2. Explore additional features in the ADPA dashboard
3. Share this guide with your team
4. Contact support for personalized training

---

*Generated on {{date}}*  
*Document Type: {{document_type}}*  
*Target Audience: {{target_audience}}*
`)

    return template({
      title: this.generateTitle(request),
      sections,
      date: new Date().toLocaleDateString(),
      document_type: request.document_type,
      target_audience: request.target_audience
    })
  }

  /**
   * Generate document title
   */
  private generateTitle(request: UXDocumentationRequest): string {
    const audienceMap: Record<string, string> = {
      end_users: 'End Users',
      administrators: 'Administrators',
      portfolio_managers: 'Portfolio Managers',
      project_managers: 'Project Managers',
      all: 'All Users'
    }

    const typeMap: Record<string, string> = {
      quick_start: 'Quick Start Guide',
      daily_activities: 'Daily Activities Guide',
      feature_highlight: 'Feature Highlights',
      complete_manual: 'Complete User Manual'
    }

    return `ADPA ${typeMap[request.document_type]} - ${audienceMap[request.target_audience]}`
  }

  /**
   * Format category name
   */
  private formatCategory(category: string): string {
    const categoryMap: Record<string, string> = {
      project_management: 'Project Management',
      document_generation: 'Document Generation',
      collaboration: 'Collaboration',
      analytics: 'Analytics',
      administration: 'Administration'
    }

    return categoryMap[category] || category
  }

  /**
   * Group activities by feature/category
   */
  private groupActivitiesByFeature(activities: DailyActivity[]): Record<string, DailyActivity[]> {
    const groups: Record<string, DailyActivity[]> = {}

    for (const activity of activities) {
      const feature = this.formatCategory(activity.category)
      if (!groups[feature]) {
        groups[feature] = []
      }
      groups[feature].push(activity)
    }

    return groups
  }

  /**
   * Calculate word count
   */
  private calculateWordCount(content: string): number {
    return content.split(/\s+/).filter(word => word.length > 0).length
  }

  /**
   * Estimate reading time (average 200 words per minute)
   */
  private estimateReadingTime(wordCount: number): number {
    return Math.ceil(wordCount / 200)
  }
}

export const uxDocumentationService = new UXDocumentationService()

