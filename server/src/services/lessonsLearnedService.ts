; (async function () { try { await (require('../lib/db')).initDb() } catch (e) { } })();
/**
 * Lessons Learned Service
 * 
 * Implements CRUD operations and business logic for lessons learned entities.
 * Integrates with drift detection to auto-generate lessons from positive drift.
 * Provides AI-assisted categorization and recommendation generation.
 */

import { logger } from '../utils/logger'
import { pool } from '../database/connection'
import type { LessonsLearned } from './extraction/entities/lessons_learned/types'
import { ExtractionCacheService } from './extraction/cache/AICacheService'
import { driftDetectionService } from './driftDetectionService'
import { aiRecommendationsService } from './aiRecommendationsService'
import { aiService } from './aiService'
import type { PoolClient } from 'pg'
import { v4 as uuidv4 } from 'uuid'
import { ProjectContextAnalyzer } from '../modules/contextGathering/analyzers/projectContextAnalyzer'

// Initialize cache service
const extractionCacheService = new ExtractionCacheService()

/**
 * Input for creating a lesson learned
 */
export interface CreateLessonsLearnedInput {
    title: string
    description: string
    category?: string
    status?: 'identified' | 'documented' | 'shared' | 'applied' | 'archived'
    situation?: string
    outcome?: string
    recommendations?: string | string[]
    positive_or_negative?: boolean
    impact?: 'low' | 'medium' | 'high' | 'critical'
    severity?: 'low' | 'medium' | 'high' | 'critical'
    phase?: string
    source_document_id?: string
    source_document?: string
    source_section?: string
    date_learned?: string
    date_identified?: string
    applicable_to?: string[]
    shared_with_org?: boolean
    tags?: string[]
}

/**
 * Input for updating a lesson learned
 */
export interface UpdateLessonsLearnedInput {
    title?: string
    description?: string
    category?: string
    status?: 'identified' | 'documented' | 'shared' | 'applied' | 'archived'
    situation?: string
    outcome?: string
    recommendations?: string | string[]
    positive_or_negative?: boolean
    impact?: 'low' | 'medium' | 'high' | 'critical'
    severity?: 'low' | 'medium' | 'high' | 'critical'
    phase?: string
    source_document_id?: string
    source_document?: string
    source_section?: string
    date_learned?: string
    date_identified?: string
    applicable_to?: string[]
    shared_with_org?: boolean
    tags?: string[]
    ai_analysis?: {
        insights?: string
        confidence?: number
        suggested_actions?: string[]
        categorization?: string
    }
    ai_confidence?: number
}

/**
 * Recommendation for applying lessons learned
 */
export interface LessonRecommendation {
    lesson_id: string
    title: string
    description: string
    category: string
    impact: string
    relevance_score: number
    recommended_actions: string[]
    expected_benefit: string
    implementation_complexity: 'low' | 'medium' | 'high'
}

/**
 * Lessons Learned Service
 */
// Cache for column existence check to avoid repeated queries
let dateLearnedColumnExists: boolean | null = null

export class LessonsLearnedService {
    /**
     * Get all lessons learned for a project
     */
    async getByProject(projectId: string, filters?: {
        category?: string
        impact?: string
        positive?: boolean
        limit?: number
        offset?: number
    }): Promise<LessonsLearned[]> {
        try {
            let query = 'SELECT * FROM lessons_learned WHERE project_id = $1'
            const params: any[] = [projectId]
            let paramIndex = 2

            if (filters?.category) {
                query += ` AND category = $${paramIndex}`
                params.push(filters.category)
                paramIndex++
            }

            if (filters?.impact) {
                query += ` AND impact = $${paramIndex}`
                params.push(filters.impact)
                paramIndex++
            }

            if (filters?.positive !== undefined) {
                query += ` AND positive_or_negative = $${paramIndex}`
                params.push(filters.positive)
                paramIndex++
            }

            // Use created_at for ordering (always exists in all schema versions)
            // If date_learned exists, we can add it later, but for now use created_at to avoid errors
            query += ' ORDER BY created_at DESC'

            if (filters?.limit) {
                query += ` LIMIT $${paramIndex}`
                params.push(filters.limit)
                paramIndex++

                if (filters?.offset) {
                    query += ` OFFSET $${paramIndex}`
                    params.push(filters.offset)
                }
            }

            const result = await pool!.query(query, params)
            if (!result || !result.rows) {
                logger.warn('Query returned null result', { projectId, query })
                return []
            }
            return result.rows
        } catch (error) {
            logger.error('Failed to get lessons learned by project', {
                projectId,
                error: error instanceof Error ? error.message : String(error)
            })
            throw error
        }
    }

    /**
     * Get a specific lesson learned by ID
     */
    async getById(lessonId: string): Promise<LessonsLearned | null> {
        try {
            const result = await pool!.query('SELECT * FROM lessons_learned WHERE id = $1', [lessonId])
            return result.rows[0] || null
        } catch (error) {
            logger.error('Failed to get lesson learned by ID', {
                lessonId,
                error: error instanceof Error ? error.message : String(error)
            })
            throw error
        }
    }

    /**
     * Create a new lesson learned
     */
    async create(input: CreateLessonsLearnedInput & { project_id: string }, userId: string): Promise<LessonsLearned> {
        try {
            // Get project_id from input or from source document
            const projectId = input.project_id ||
                (input.source_document_id ? await this.getProjectIdFromDocument(input.source_document_id) : null);

            if (!projectId) {
                throw new Error('project_id is required');
            }

            const result = await pool!.query(
                `INSERT INTO lessons_learned (
                    project_id, title, description, category, status, positive_or_negative, 
                    impact, severity, phase, source_document_id, source_document, source_section, 
                    date_identified, applicable_to, shared_with_org, tags
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                RETURNING *`,
                [
                    projectId,
                    input.title,
                    input.description,
                    input.category || 'other',
                    input.status || 'identified',
                    input.positive_or_negative ?? true,
                    input.impact || 'medium',
                    input.severity || input.impact || 'medium',
                    input.phase || null,
                    input.source_document_id || null,
                    input.source_document || null,
                    input.source_section || null,
                    input.date_identified || new Date(),
                    JSON.stringify(input.applicable_to || []),
                    input.shared_with_org || false,
                    input.tags || []
                ]
            )

            const lesson = result.rows[0]

            // Generate AI analysis for the lesson (optional - disabled if AI providers fail)
            try {
                await this.generateAIAnalysis(lesson.id);
            } catch (error) {
                logger.warn('AI analysis generation skipped for lesson', {
                    lessonId: lesson.id,
                    error: error instanceof Error ? error.message : String(error)
                });
                // Continue without AI analysis - it's optional
            }

            // Check if this lesson represents positive drift (improvement)
            if (lesson.positive_or_negative && lesson.source_document_id) {
                try {
                    const driftResult = await driftDetectionService.checkForDrift(lesson.project_id, lesson.source_document_id);
                    const relatedDrift = driftResult.driftPoints.find(dp =>
                        dp.entityType === lesson.category &&
                        (dp.driftType === 'added' || (dp as any).severity === 'positive')
                    );
                    if (relatedDrift) {
                        logger.info(`[LESSONS] Positive drift lesson confirmed by drift detection: ${lesson.id}`);
                    }
                } catch (error) {
                    logger.warn(`[LESSONS] Could not verify drift for lesson ${lesson.id}: ${error instanceof Error ? error.message : String(error)}`);
                }
            }

            // Cache the lesson
            await extractionCacheService.set(
                lesson.project_id,
                'manual_entry',
                'lessons_learned',
                [lesson]
            )

            return lesson
        } catch (error) {
            logger.error('Failed to create lesson learned', {
                input,
                error: error instanceof Error ? error.message : String(error)
            })
            throw error
        }
    }

    /**
     * Update an existing lesson learned
     */
    async update(lessonId: string, input: UpdateLessonsLearnedInput, userId: string): Promise<LessonsLearned> {
        try {
            const updates: string[] = []
            const values: any[] = []
            let paramIndex = 1

            // Only update fields that exist in the schema
            const allowedFields = ['title', 'description', 'category', 'status', 'positive_or_negative',
                'impact', 'severity', 'phase', 'source_document_id', 'source_document',
                'source_section', 'date_identified', 'applicable_to', 'shared_with_org', 'tags'];

            // Build dynamic update query
            Object.entries(input).forEach(([key, value]) => {
                if (value !== undefined && allowedFields.includes(key)) {
                    updates.push(`${key} = $${paramIndex}`)
                    values.push(value)
                    paramIndex++
                }
            })

            // Always update updated_at
            updates.push(`updated_at = CURRENT_TIMESTAMP`)

            if (updates.length === 1) {
                // Only updating timestamp, no need to execute
                const result = await pool!.query('SELECT * FROM lessons_learned WHERE id = $1', [lessonId])
                return result.rows[0]
            }

            values.push(lessonId)

            const query = `UPDATE lessons_learned SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`
            const result = await pool!.query(query, values)

            const lesson = result.rows[0]

            // Regenerate AI analysis if content changed
            if (updates.some(update => !update.includes('updated_at') && !update.includes('updated_by'))) {
                await this.generateAIAnalysis(lesson.id)
            }

            // Update cache
            await extractionCacheService.set(
                lesson.project_id,
                'manual_entry',
                'lessons_learned',
                [lesson]
            )

            return lesson
        } catch (error) {
            logger.error('Failed to update lesson learned', {
                lessonId,
                input,
                error: error instanceof Error ? error.message : String(error)
            })
            throw error
        }
    }

    /**
     * Delete a lesson learned
     */
    async delete(lessonId: string): Promise<void> {
        try {
            // Get project ID before deletion for cache invalidation
            const lesson = await this.getById(lessonId)

            await pool!.query('DELETE FROM lessons_learned WHERE id = $1', [lessonId])

            if (lesson?.project_id) {
                await extractionCacheService.invalidateProject(lesson.project_id)
            }
        } catch (error) {
            logger.error('Failed to delete lesson learned', {
                lessonId,
                error: error instanceof Error ? error.message : String(error)
            })
            throw error
        }
    }

    /**
     * Analyze a project upon completion to identify lessons learned and accomplishments
     */
    async analyzeProjectCompletion(projectId: string, userId: string): Promise<void> {
        try {
            logger.info(`[LESSONS-ANALYSIS] Starting completion analysis for project: ${projectId}`);
            
            const analyzer = new ProjectContextAnalyzer();
            const projectContext = await analyzer.analyzeProjectContext(projectId);
            
            const prompt = `You are a senior project management consultant. A project has just been completed, and you need to identify key "Lessons Learned" and "Accomplishments".
            
            **Project Context:**
            - Name: ${projectContext.project_name}
            - Description: ${projectContext.project_description}
            - Type: ${projectContext.project_type}
            - Status: ${projectContext.project_status}
            - Success Criteria: ${JSON.stringify(projectContext.success_criteria)}
            - Budget: ${JSON.stringify(projectContext.budget_info)}
            - Timeline: ${JSON.stringify(projectContext.timeline_info)}
            - Risks identified: ${projectContext.risks.length}
            - Milestones completed: ${projectContext.milestones.filter(m => m.status === 'completed').length}
            
            **Task:**
            Analyze the project's performance, risks, and milestones to generate:
            1. **Lessons Learned**: 2-4 valuable takeaways (both positive improvements and negative pitfalls).
            2. **Accomplishments**: 2-4 major successes or milestones achieved.
            
            **Output Format (JSON):**
            {
              "lessons": [
                {
                  "title": "Brief title",
                  "description": "Detailed explanation",
                  "category": "technical|management|communication|budget|timeline",
                  "positive_or_negative": true,
                  "impact": "low|medium|high|critical"
                }
              ],
              "accomplishments": [
                {
                  "title": "Achievement title",
                  "description": "What was achieved and why it matters",
                  "category": "milestone|deliverable|innovation|efficiency",
                  "impact": "high|critical"
                }
              ]
            }
            
            Analyze now:`;
            
            const response = await aiService.generateWithFallback({
                provider: 'openai',
                model: 'gpt-4o',
                prompt,
                temperature: 0.7,
                max_tokens: 2000
            });
            
            const jsonMatch = response.content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('No JSON found in AI response');
            const result = JSON.parse(jsonMatch[0]);
            
            // Save Lessons
            if (result.lessons && Array.isArray(result.lessons)) {
                for (const l of result.lessons) {
                    await this.create({
                        project_id: projectId,
                        title: l.title,
                        description: l.description,
                        category: l.category,
                        positive_or_negative: l.positive_or_negative,
                        impact: l.impact,
                        status: 'identified', // Suggested for moderation
                        tags: ['ai-suggested', 'completion-analysis']
                    }, userId);
                }
            }
            
            // Save Accomplishments (as a special category in lessons for now)
            if (result.accomplishments && Array.isArray(result.accomplishments)) {
                for (const a of result.accomplishments) {
                    await this.create({
                        project_id: projectId,
                        title: `Accomplishment: ${a.title}`,
                        description: a.description,
                        category: 'accomplishment',
                        positive_or_negative: true,
                        impact: a.impact,
                        status: 'identified', // Suggested for moderation
                        tags: ['ai-suggested', 'accomplishment', 'completion-analysis']
                    }, userId);
                }
            }
            
            logger.info(`[LESSONS-ANALYSIS] Completed analysis for project: ${projectId}. Generated ${result.lessons?.length || 0} lessons and ${result.accomplishments?.length || 0} accomplishments.`);
        } catch (error) {
            logger.error('[LESSONS-ANALYSIS] Completion analysis failed', {
                projectId,
                error: error instanceof Error ? error.message : String(error)
            });
            // Don't throw - this is a background process
        }
    }

    /**
     * Generate AI analysis for a lesson learned
     * Note: AI analysis columns (ai_analysis, ai_confidence) don't exist in current schema
     * This feature is disabled until migration adds these columns
     */
    async generateAIAnalysis(lessonId: string): Promise<void> {
        try {
            const lesson = await this.getById(lessonId)
            if (!lesson) return

            // Generate AI analysis for the lesson using a more robust approach
            const aiAnalysis = await this.generateLessonAnalysisInternal(lesson);

            // Note: ai_analysis and ai_confidence columns added in migration 395

            await pool!.query(
                `UPDATE lessons_learned SET
                    ai_analysis = $1,
                    ai_confidence = $2,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $3`,
                [
                    JSON.stringify(aiAnalysis.analysis),
                    aiAnalysis.confidence,
                    lessonId
                ]
            )

            logger.info('AI analysis generated and persisted', {
                lessonId,
                confidence: aiAnalysis.confidence
            });
        } catch (error) {
            logger.warn('AI analysis generation failed or skipped', {
                lessonId,
                error: error instanceof Error ? error.message : String(error)
            })
            // Don't throw - AI analysis is optional
        }
    }

    /**
     * Internal method to generate lesson analysis using AI service
     */
    private async generateLessonAnalysisInternal(lesson: LessonsLearned): Promise<{ analysis: any, confidence: number }> {
        try {
            // Build prompt for lesson analysis
            const prompt = this.buildLessonAnalysisPrompt(lesson);

            // Use AI service singleton to generate analysis
            const response = await aiService.generateWithFallback({
                provider: 'openai',
                model: 'gpt-4o',
                prompt,
                temperature: 0.7,
                max_tokens: 1500
            });

            // Parse the response
            return this.parseLessonAnalysisResponse(response.content, lesson);

        } catch (error) {
            logger.warn('Failed to generate AI analysis via service, using fallback', {
                lessonId: lesson.id,
                error: error instanceof Error ? error.message : String(error)
            });

            // Return fallback analysis
            return {
                analysis: {
                    insights: this.generateFallbackInsights(lesson),
                    suggested_actions: this.generateFallbackActions(lesson),
                    categorization: lesson.category || 'other'
                },
                confidence: 0.7
            };
        }
    }

    /**
     * Build prompt for lesson analysis
     */
    private buildLessonAnalysisPrompt(lesson: LessonsLearned): string {
        return `You are a senior project management consultant specializing in lessons learned and knowledge management.

**Lesson Learned Details:**
- Title: ${lesson.title}
- Category: ${lesson.category}
- Impact: ${lesson.impact}
- Type: ${lesson.positive_or_negative ? 'Positive (Improvement)' : 'Negative (Issue)'}
- Description: ${lesson.description}
${lesson.situation ? `- Situation: ${lesson.situation}\n` : ''}
${lesson.outcome ? `- Outcome: ${lesson.outcome}\n` : ''}

**Task:**
Analyze this lesson learned and provide:
1. **Insights**: Key takeaways and strategic implications (2-3 bullet points)
2. **Suggested Actions**: 2-4 specific, actionable recommendations to apply this lesson
3. **Categorization**: Refined category suggestion
4. **Confidence**: Confidence score in your analysis (0-1)

**Output Format (JSON):**
{
  "insights": ["insight 1", "insight 2", "insight 3"],
  "suggested_actions": [
    {
      "action": "Brief action description",
      "details": "Detailed explanation of how to implement",
      "priority": "high|medium|low"
    }
  ],
  "categorization": "refined_category",
  "confidence": 0.9
}

Generate the analysis now:`;
    }

    /**
     * Parse AI response for lesson analysis
     */
    private parseLessonAnalysisResponse(response: string, lesson: LessonsLearned): { analysis: any, confidence: number } {
        try {
            // Extract JSON from response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in AI response');
            }

            const parsed = JSON.parse(jsonMatch[0]);

            return {
                analysis: {
                    insights: parsed.insights || [],
                    suggested_actions: Array.isArray(parsed.suggested_actions)
                        ? parsed.suggested_actions.map((action: any) => {
                            if (typeof action === 'string') {
                                return {
                                    action: action,
                                    details: '',
                                    priority: 'medium'
                                };
                            }
                            return {
                                action: action.action || 'New action',
                                details: action.details || '',
                                priority: action.priority || 'medium'
                            };
                        })
                        : [],
                    categorization: parsed.categorization || lesson.category || 'other'
                },
                confidence: typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0.8
            };

        } catch (error) {
            logger.warn('Failed to parse AI lesson analysis, using fallback', {
                lessonId: lesson.id,
                error: error instanceof Error ? error.message : String(error)
            });

            return {
                analysis: {
                    insights: this.generateFallbackInsights(lesson),
                    suggested_actions: this.generateFallbackActions(lesson),
                    categorization: lesson.category || 'other'
                },
                confidence: 0.7
            };
        }
    }

    /**
     * Generate fallback insights for lesson
     */
    private generateFallbackInsights(lesson: LessonsLearned): string[] {
        const insights = [];

        if (lesson.positive_or_negative) {
            insights.push(`This positive lesson demonstrates an effective practice in ${lesson.category} that improved project outcomes.`);
            insights.push(`Adopting this approach can enhance ${lesson.category} management and potentially prevent related issues in future projects.`);
        } else {
            insights.push(`This negative lesson highlights a significant risk in ${lesson.category} that led to project challenges.`);
            insights.push(`Addressing this issue proactively can prevent ${lesson.impact} impacts on project success criteria.`);
        }

        insights.push(`The ${lesson.impact} impact of this lesson indicates it should be prioritized for knowledge sharing and process improvement.`);

        return insights;
    }

    /**
     * Generate fallback actions for lesson
     */
    private generateFallbackActions(lesson: LessonsLearned): any[] {
        const actions = [];

        if (lesson.positive_or_negative) {
            actions.push({
                action: `Document and share this positive practice`,
                details: `Create a knowledge base entry detailing the approach, context, and benefits of this positive lesson to enable replication across other projects.`,
                priority: 'high'
            });

            actions.push({
                action: `Incorporate into project templates and checklists`,
                details: `Update relevant project templates, checklists, and process documentation to include this effective practice for ${lesson.category}.`,
                priority: 'medium'
            });

            if (lesson.recommendations && lesson.recommendations.length > 0) {
                actions.push({
                    action: `Implement recommended improvements`,
                    details: `Review and implement the specific recommendations: ${lesson.recommendations.join(', ')}`,
                    priority: 'high'
                });
            }

        } else {
            actions.push({
                action: `Develop mitigation strategy`,
                details: `Create a detailed mitigation plan to address the root cause of this negative lesson and prevent recurrence.`,
                priority: 'high'
            });

            actions.push({
                action: `Update risk management documentation`,
                details: `Incorporate this lesson into risk registers and mitigation plans to ensure proactive management of similar risks.`,
                priority: 'medium'
            });

            if (lesson.recommendations && lesson.recommendations.length > 0) {
                actions.push({
                    action: `Implement corrective actions`,
                    details: `Execute the recommended corrective actions: ${lesson.recommendations.join(', ')}`,
                    priority: 'high'
                });
            }
        }

        actions.push({
            action: `Share with project team and stakeholders`,
            details: `Communicate this lesson learned to relevant team members and stakeholders to raise awareness and prevent similar issues.`,
            priority: 'medium'
        });

        return actions;
    }

    /**
     * Get recommendations for applying lessons to current project
     */
    async getRecommendations(projectId: string): Promise<LessonRecommendation[]> {
        try {
            const lessons = await this.getByProject(projectId)

            // Get current project context for relevance scoring
            const projectContext = await this.getProjectContext(projectId)

            const recommendations: LessonRecommendation[] = []

            for (const lesson of lessons) {
                const relevanceScore = await this.calculateRelevanceScore(lesson, projectContext)

                recommendations.push({
                    lesson_id: lesson.id,
                    title: lesson.title || 'Untitled Lesson',
                    description: lesson.description,
                    category: lesson.category || 'other',
                    impact: lesson.impact || 'medium',
                    relevance_score: relevanceScore,
                    recommended_actions: lesson.ai_analysis?.suggested_actions || [],
                    expected_benefit: this.getExpectedBenefit(lesson),
                    implementation_complexity: await this.estimateImplementationComplexity(lesson)
                })
            }

            // Sort by relevance score (highest first)
            return recommendations.sort((a, b) => b.relevance_score - a.relevance_score)
        } catch (error) {
            logger.error('Failed to get lesson recommendations', {
                projectId,
                error: error instanceof Error ? error.message : String(error)
            })
            throw error
        }
    }

    /**
     * Generate lessons learned from drift detection results
     */
    async generateFromDrift(projectId: string, userId: string): Promise<LessonsLearned[]> {
        try {
            // Get drift detection results for this project
            // Note: checkForDrift requires a documentId, but we want drift for the entire project
            // Using empty string as documentId to indicate project-level drift detection
            const driftResult = await driftDetectionService.checkForDrift(projectId, "")

            const lessons: LessonsLearned[] = []

            // Process positive drift (improvements) as lessons learned
            for (const driftPoint of driftResult.driftPoints) {
                if (driftPoint.driftType === 'added' || (driftPoint as any).severity === 'positive') {
                    const lesson = await this.createFromDriftPoint(driftPoint, userId)
                    lessons.push(lesson)
                }
            }

            return lessons
        } catch (error) {
            logger.error('Failed to generate lessons from drift', {
                projectId,
                error: error instanceof Error ? error.message : String(error)
            })
            throw error
        }
    }

    /**
     * Create a knowledge base entry from a lesson learned
     */
    async createKnowledgeBaseEntry(lessonId: string, userId: string): Promise<string> {
        try {
            const lesson = await this.getById(lessonId)
            if (!lesson) throw new Error('Lesson not found')

            // Create knowledge base entry
            const result = await pool!.query(
                `INSERT INTO knowledge_base_entries (
                    project_id, entry_type, category, title, description, 
                    baseline_approach, improved_approach, value_metrics, 
                    replication_guide, applicable_contexts, status, 
                    created_by, created_at, tags
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, $13)
                RETURNING id`,
                [
                    lesson.project_id,
                    'lessons_learned',
                    lesson.category || 'other',
                    lesson.title || 'Lesson Learned: ' + lesson.description.substring(0, 50) + '...',
                    lesson.description,
                    null, // baseline_approach - extracted from description if needed
                    null, // improved_approach - extracted from description if needed
                    lesson.impact ? { impact: lesson.impact } : null,
                    null, // replication_guide - can be added later
                    [], // applicable_contexts
                    'pending_review',
                    userId,
                    lesson.tags || []
                ]
            )

            // Note: metadata column doesn't exist in current schema, skip linking for now
            // This can be added in a future migration if needed

            return result.rows[0].id
        } catch (error) {
            logger.error('Failed to create knowledge base entry from lesson', {
                lessonId,
                error: error instanceof Error ? error.message : String(error)
            })
            throw error
        }
    }

    /**
     * Get similar lessons from other projects
     */
    async getSimilarLessons(projectId: string, lessonId: string, limit: number = 5): Promise<LessonsLearned[]> {
        try {
            const lesson = await this.getById(lessonId)
            if (!lesson) return []

            // Use created_at for ordering (always exists in all schema versions)
            const orderByColumn = 'created_at'

            const result = await pool!.query(
                `SELECT * FROM lessons_learned 
                WHERE project_id != $1 
                AND (category = $2 OR $3 && tags)
                ORDER BY 
                    CASE WHEN category = $2 THEN 1 ELSE 0 END + 
                    CASE WHEN $3 && tags THEN 1 ELSE 0 END DESC,
                ${orderByColumn} DESC
                LIMIT $4`,
                [projectId, lesson.category, lesson.tags || [], limit]
            )

            return result.rows
        } catch (error) {
            logger.error('Failed to get similar lessons', {
                projectId,
                lessonId,
                error: error instanceof Error ? error.message : String(error)
            })
            throw error
        }
    }

    // =============================================================================
    // HELPER METHODS
    // =============================================================================

    /**
     * Get project ID from document ID
     */
    private async getProjectIdFromDocument(documentId: string): Promise<string> {
        const result = await pool!.query('SELECT project_id FROM documents WHERE id = $1', [documentId])
        if (result.rows.length === 0) {
            throw new Error(`Document not found: ${documentId}`)
        }
        return result.rows[0].project_id
    }

    /**
     * Get project context for relevance scoring
     */
    private async getProjectContext(projectId: string): Promise<{
        projectType?: string
        industry?: string
        currentPhase?: string
        challenges?: string[]
        goals?: string[]
    }> {
        try {
            const result = await pool!.query('SELECT * FROM projects WHERE id = $1', [projectId])
            if (result.rows.length === 0) return {}

            const project = result.rows[0]
            return {
                projectType: project.type,
                industry: project.industry,
                currentPhase: project.phase,
                challenges: project.challenges || [],
                goals: project.goals || []
            }
        } catch (error) {
            logger.warn('Failed to get project context', {
                projectId,
                error: error instanceof Error ? error.message : String(error)
            })
            return {}
        }
    }

    /**
     * Calculate relevance score for a lesson
     */
    private async calculateRelevanceScore(lesson: LessonsLearned, projectContext: any): Promise<number> {
        let score = 0

        // Category match (30% weight)
        if (projectContext.projectType && lesson.category === projectContext.projectType) {
            score += 0.3
        }

        // Industry match (20% weight)
        if (projectContext.industry && lesson.tags?.includes(projectContext.industry)) {
            score += 0.2
        }

        // Impact level (20% weight)
        const impactScores = { low: 0.05, medium: 0.1, high: 0.15, critical: 0.2 }
        score += impactScores[lesson.impact || 'medium'] || 0.1

        // Recency (15% weight)
        const daysOld = (new Date().getTime() - new Date(lesson.date_learned || '').getTime()) / (1000 * 60 * 60 * 24)
        if (daysOld < 30) score += 0.15
        else if (daysOld < 90) score += 0.1
        else if (daysOld < 180) score += 0.05

        // AI confidence (15% weight)
        if (lesson.ai_confidence) {
            score += lesson.ai_confidence * 0.15
        }

        return Math.min(Math.max(score, 0), 1) // Clamp between 0 and 1
    }

    /**
     * Get expected benefit description
     */
    private getExpectedBenefit(lesson: LessonsLearned): string {
        if (lesson.positive_or_negative) {
            return `Adopting this positive practice can improve ${lesson.category || 'project outcomes'} by implementing ${lesson.recommendations?.join(', ') || 'recommended actions'}`
        } else {
            return `Avoiding this negative pattern can prevent ${lesson.impact || 'issues'} in ${lesson.category || 'project area'}`
        }
    }

    /**
     * Estimate implementation complexity
     */
    private async estimateImplementationComplexity(lesson: LessonsLearned): Promise<'low' | 'medium' | 'high'> {
        // Simple heuristic based on number of recommendations and impact level
        const recommendationCount = Array.isArray(lesson.recommendations) ? lesson.recommendations.length : 1

        if (lesson.impact === 'critical' || lesson.impact === 'high') {
            return 'high'
        } else if (recommendationCount > 3) {
            return 'medium'
        } else {
            return 'low'
        }
    }

    /**
     * Create a lesson learned from a drift point
     */
    private async createFromDriftPoint(driftPoint: any, userId: string): Promise<LessonsLearned> {
        // Determine if this is a positive drift (improvement)
        const isPositive = driftPoint.driftType === 'added' || driftPoint.severity === 'positive';

        const title = isPositive
            ? `Positive Drift: ${driftPoint.entity_type || driftPoint.entityType} Improvement`
            : `Negative Drift: ${driftPoint.entity_type || driftPoint.entityType} Issue`;

        // Build comprehensive description including situation, outcome, and recommendations
        let description = isPositive
            ? `Positive change detected in ${driftPoint.entity_type || driftPoint.entityType}: ${driftPoint.description}\n\nThis represents an improvement over the baseline that should be captured as a lesson learned.`
            : `Negative change detected in ${driftPoint.entity_type || driftPoint.entityType}: ${driftPoint.description}\n\nThis represents a deviation from the baseline that should be analyzed and addressed.`;

        // Add situation context
        const situation = driftPoint.baselineValue !== undefined
            ? `Baseline: ${driftPoint.baselineValue}\nCurrent: ${driftPoint.currentValue}`
            : `Baseline: ${driftPoint.baseline_value}\nCurrent: ${driftPoint.current_value}`;
        description += `\n\nSituation:\n${situation}`;

        // Add outcome
        const outcome = driftPoint.impact || driftPoint.impact_description || 'Impact to be determined';
        description += `\n\nOutcome:\n${outcome}`;

        // Add recommendations
        const recommendations = driftPoint.recommendations || driftPoint.suggested_actions || [];
        if (recommendations.length > 0) {
            description += `\n\nRecommendations:\n${recommendations.join('\n')}`;
        }

        return await this.create({
            project_id: driftPoint.project_id,
            title,
            description,
            category: (driftPoint.entity_type || driftPoint.entityType || 'unknown').toLowerCase().replace(/ /g, '_'),
            positive_or_negative: isPositive,
            impact: driftPoint.impact_severity || driftPoint.impact || 'medium',
            source_document_id: driftPoint.source_document_id || driftPoint.document_id,
            source_document: driftPoint.source_document || driftPoint.document_name,
            tags: []
        }, userId)
    }
}

// Export singleton instance
export const lessonsLearnedService = new LessonsLearnedService()