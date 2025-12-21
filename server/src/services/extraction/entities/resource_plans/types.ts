export interface ResourcePlan {
    resource_description?: string;
    required_quantity?: number;
    start_date?: string;
    end_date?: string;
    skill_set?: string[];
    location?: string;
    status?: 'Planned' | 'Assigned' | 'Onboarded';
    source_document?: string;
    source_document_id?: string;
}
