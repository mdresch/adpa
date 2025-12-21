export interface LessonsLearned {
    id: string;
    project_id: string;
    title: string;
    description: string;
    category: string;
    situation?: string;
    outcome?: string;
    recommendations?: string[];
    positive_or_negative: boolean;
    impact: 'low' | 'medium' | 'high' | 'critical';

    // Source tracking
    source_document_id?: string;
    source_document_title?: string;
    source_section?: string;

    // AI analysis
    ai_analysis?: {
        insights?: string;
        confidence?: number;
        suggested_actions?: string[];
        categorization?: string;
    };
    ai_confidence?: number;

    // Dates
    date_learned: string;

    // Metadata
    tags?: string[];
    metadata?: Record<string, any>;
    applicability?: string[];

    // Audit trail
    created_at: string;
    updated_at: string;
    created_by?: string;
    updated_by?: string;
}
