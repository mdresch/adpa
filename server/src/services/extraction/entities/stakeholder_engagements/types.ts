export interface StakeholderEngagement {
    stakeholder_name: string;
    engagement_type: 'Workshop' | 'Interview' | 'Presentation' | 'Other';
    engagement_date?: string;
    objective?: string;
    outcome?: string;
    feedback?: string;
    source_document?: string;
    source_document_id?: string;
}
