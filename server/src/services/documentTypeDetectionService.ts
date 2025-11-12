/**
 * Document Type Detection Service
 * Uses AI to classify uploaded documents into standard PM/BA document types
 * 
 * Features:
 * - AI-powered document classification
 * - Multi-provider support (OpenAI, Google Gemini, Mistral)
 * - Confidence scoring
 * - Fallback to keyword-based detection
 * 
 * @module services/documentTypeDetectionService
 */

import { Pool } from 'pg';
import { logger } from '../utils/logger';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface DetectionResult {
  detected_type: string;
  confidence: number;
  alternatives?: Array<{ type: string; confidence: number }>;
  method: 'ai' | 'keyword' | 'manual';
  provider?: string;
  model?: string;
  processing_time_ms?: number;
}

// Standard document types
const DOCUMENT_TYPES = [
  'Project Charter',
  'Business Case',
  'Scope Statement',
  'Work Breakdown Structure (WBS)',
  'Schedule Baseline',
  'Cost Baseline',
  'Requirements Document',
  'Requirements Traceability Matrix',
  'Risk Register',
  'Risk Management Plan',
  'Quality Management Plan',
  'Communications Management Plan',
  'Stakeholder Register',
  'Stakeholder Engagement Plan',
  'Resource Management Plan',
  'Procurement Management Plan',
  'Change Management Plan',
  'Configuration Management Plan',
  'Project Management Plan',
  'Status Report',
  'Progress Report',
  'Lessons Learned',
  'Closure Report',
  'Meeting Minutes',
  'Decision Log',
  'Issue Log',
  'Action Items',
  'Business Requirements Document (BRD)',
  'Functional Specification',
  'Technical Specification',
  'Use Case Document',
  'User Story',
  'Data Model',
  'Process Flow Diagram',
  'Business Process Model',
  'Gap Analysis',
  'Feasibility Study',
  'Other/Unknown'
];

class DocumentTypeDetectionService {
  private pool: Pool;
  private openai?: OpenAI;
  private googleAI?: GoogleGenerativeAI;

  constructor(pool: Pool) {
    this.pool = pool;
    
    // Initialize AI providers
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    
    if (process.env.GOOGLE_AI_API_KEY) {
      this.googleAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    }
  }

  /**
   * Detect document type using AI
   */
  async detectDocumentType(
    documentId: string,
    content: string,
    title?: string
  ): Promise<DetectionResult> {
    const startTime = Date.now();
    
    try {
      logger.info('[DocumentTypeDetectionService] Starting detection', {
        document_id: documentId,
        content_length: content.length
      });

      // Try AI detection first
      let result = await this.detectWithAI(content, title);
      
      // If AI fails or low confidence, fallback to keyword-based
      if (!result || result.confidence < 0.5) {
        logger.warn('[DocumentTypeDetectionService] AI detection failed or low confidence, using fallback', {
          document_id: documentId,
          ai_confidence: result?.confidence
        });
        result = this.detectWithKeywords(content, title);
      }

      result.processing_time_ms = Date.now() - startTime;

      // Update document record
      await this.updateDocumentType(documentId, result);

      logger.info('[DocumentTypeDetectionService] Detection completed', {
        document_id: documentId,
        detected_type: result.detected_type,
        confidence: result.confidence,
        method: result.method
      });

      return result;

    } catch (error) {
      logger.error('[DocumentTypeDetectionService] Detection failed', {
        document_id: documentId,
        error
      });

      // Return fallback result
      const fallbackResult = this.detectWithKeywords(content, title);
      fallbackResult.processing_time_ms = Date.now() - startTime;
      
      await this.updateDocumentType(documentId, fallbackResult);
      
      return fallbackResult;
    }
  }

  /**
   * Detect document type using AI (OpenAI or Google Gemini)
   */
  private async detectWithAI(
    content: string,
    title?: string
  ): Promise<DetectionResult | null> {
    // Truncate content for AI (use first 3000 chars + title)
    const truncatedContent = content.substring(0, 3000);
    
    const prompt = `You are an expert in project management and business analysis documentation.

Analyze the following document and classify it into ONE of these standard document types:
${DOCUMENT_TYPES.map((type, i) => `${i + 1}. ${type}`).join('\n')}

${title ? `Document Title: "${title}"\n\n` : ''}Document Content:
${truncatedContent}

Respond in JSON format:
{
  "document_type": "exact name from list above",
  "confidence": 0.0 to 1.0,
  "reasoning": "brief explanation",
  "alternatives": [
    {"type": "alternative 1", "confidence": 0.0 to 1.0},
    {"type": "alternative 2", "confidence": 0.0 to 1.0}
  ]
}`;

    try {
      // Try Google Gemini first (faster and cheaper)
      if (this.googleAI) {
        return await this.detectWithGemini(prompt);
      }
      
      // Fallback to OpenAI
      if (this.openai) {
        return await this.detectWithOpenAI(prompt);
      }

      return null;

    } catch (error) {
      logger.error('[DocumentTypeDetectionService] AI detection error', { error });
      return null;
    }
  }

  /**
   * Detect using Google Gemini
   */
  private async detectWithGemini(prompt: string): Promise<DetectionResult | null> {
    try {
      const model = this.googleAI!.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(prompt);
      const response = result.response.text();
      
      // Parse JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        detected_type: parsed.document_type,
        confidence: parsed.confidence,
        alternatives: parsed.alternatives?.slice(0, 3),
        method: 'ai',
        provider: 'google',
        model: 'gemini-1.5-flash'
      };

    } catch (error) {
      logger.error('[DocumentTypeDetectionService] Gemini detection failed', { error });
      return null;
    }
  }

  /**
   * Detect using OpenAI
   */
  private async detectWithOpenAI(prompt: string): Promise<DetectionResult | null> {
    try {
      const completion = await this.openai!.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in project management and business analysis documentation classification.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      const parsed = JSON.parse(content);

      return {
        detected_type: parsed.document_type,
        confidence: parsed.confidence,
        alternatives: parsed.alternatives?.slice(0, 3),
        method: 'ai',
        provider: 'openai',
        model: 'gpt-4o-mini'
      };

    } catch (error) {
      logger.error('[DocumentTypeDetectionService] OpenAI detection failed', { error });
      return null;
    }
  }

  /**
   * Fallback: Keyword-based detection
   */
  private detectWithKeywords(content: string, title?: string): DetectionResult {
    const lowerContent = content.toLowerCase();
    const lowerTitle = title?.toLowerCase() || '';
    const combined = lowerTitle + ' ' + lowerContent;

    // Define keyword patterns for each document type
    const patterns: Record<string, string[]> = {
      'Project Charter': ['project charter', 'project authorization', 'project initiation', 'high-level scope', 'project sponsor'],
      'Business Case': ['business case', 'justification', 'cost-benefit', 'roi', 'return on investment', 'feasibility'],
      'Scope Statement': ['scope statement', 'project scope', 'in scope', 'out of scope', 'deliverables', 'acceptance criteria'],
      'Requirements Document': ['requirements', 'functional requirement', 'non-functional requirement', 'user need', 'system shall'],
      'Risk Register': ['risk register', 'risk log', 'risk id', 'probability', 'impact', 'mitigation', 'risk response'],
      'Risk Management Plan': ['risk management plan', 'risk methodology', 'risk categories', 'risk breakdown'],
      'Schedule Baseline': ['schedule', 'gantt', 'milestone', 'task duration', 'critical path', 'project timeline'],
      'Status Report': ['status report', 'progress report', 'weekly status', 'project status', 'current status'],
      'Stakeholder Register': ['stakeholder register', 'stakeholder list', 'stakeholder name', 'interest', 'influence'],
      'Stakeholder Engagement Plan': ['stakeholder engagement', 'engagement strategy', 'communication approach'],
      'Meeting Minutes': ['meeting minutes', 'attendees', 'agenda', 'action items', 'decisions made'],
      'Lessons Learned': ['lessons learned', 'what went well', 'what could improve', 'retrospective'],
      'Business Requirements Document (BRD)': ['business requirements document', 'brd', 'business requirement', 'business need'],
      'Use Case Document': ['use case', 'actor', 'precondition', 'postcondition', 'main flow'],
      'Gap Analysis': ['gap analysis', 'current state', 'future state', 'gap', 'transition'],
      'Process Flow Diagram': ['process flow', 'workflow', 'flowchart', 'swim lane']
    };

    // Score each document type
    const scores: Record<string, number> = {};
    
    for (const [docType, keywords] of Object.entries(patterns)) {
      let score = 0;
      
      for (const keyword of keywords) {
        if (combined.includes(keyword)) {
          // Higher weight for title matches
          if (lowerTitle.includes(keyword)) {
            score += 3;
          } else {
            score += 1;
          }
        }
      }
      
      scores[docType] = score;
    }

    // Find best match
    const sortedTypes = Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .filter(([_, score]) => score > 0);

    if (sortedTypes.length === 0) {
      return {
        detected_type: 'Other/Unknown',
        confidence: 0.3,
        method: 'keyword'
      };
    }

    const [bestType, bestScore] = sortedTypes[0];
    const maxPossibleScore = patterns[bestType]?.length * 3 || 10;
    const confidence = Math.min(bestScore / maxPossibleScore, 0.95);

    const alternatives = sortedTypes
      .slice(1, 4)
      .map(([type, score]) => ({
        type,
        confidence: Math.min(score / maxPossibleScore, 0.95)
      }));

    return {
      detected_type: bestType,
      confidence,
      alternatives,
      method: 'keyword'
    };
  }

  /**
   * Update document with detected type
   */
  private async updateDocumentType(
    documentId: string,
    result: DetectionResult
  ): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        UPDATE documents
        SET 
          detected_type = $2,
          detection_confidence = $3,
          detection_metadata = $4
        WHERE id = $1
      `;

      const metadata = {
        method: result.method,
        provider: result.provider,
        model: result.model,
        alternatives: result.alternatives,
        processing_time_ms: result.processing_time_ms,
        detected_at: new Date().toISOString()
      };

      await client.query(query, [
        documentId,
        result.detected_type,
        result.confidence,
        JSON.stringify(metadata)
      ]);

    } finally {
      client.release();
    }
  }

  /**
   * Batch detect document types
   */
  async detectBatch(batchId: string): Promise<{
    total: number;
    detected: number;
    failed: number;
  }> {
    const client = await this.pool.connect();
    
    try {
      // Get all documents in batch that have content
      const query = `
        SELECT id, title, content
        FROM documents
        WHERE upload_batch_id = $1
        AND conversion_status = 'completed'
        AND detected_type IS NULL
        AND content IS NOT NULL
        AND content != ''
      `;

      const result = await client.query(query, [batchId]);
      const documents = result.rows;

      let detected = 0;
      let failed = 0;

      // Detect type for each document
      for (const doc of documents) {
        try {
          await this.detectDocumentType(doc.id, doc.content, doc.title);
          detected++;
        } catch (error) {
          logger.error('[DocumentTypeDetectionService] Failed to detect type', {
            document_id: doc.id,
            error
          });
          failed++;
        }
      }

      return {
        total: documents.length,
        detected,
        failed
      };

    } finally {
      client.release();
    }
  }

  /**
   * Get supported document types
   */
  getSupportedTypes(): string[] {
    return [...DOCUMENT_TYPES];
  }

  /**
   * Manually set document type
   */
  async setDocumentType(
    documentId: string,
    documentType: string
  ): Promise<void> {
    if (!DOCUMENT_TYPES.includes(documentType)) {
      throw new Error(`Invalid document type: ${documentType}`);
    }

    const result: DetectionResult = {
      detected_type: documentType,
      confidence: 1.0,
      method: 'manual'
    };

    await this.updateDocumentType(documentId, result);
  }
}

export default DocumentTypeDetectionService;

