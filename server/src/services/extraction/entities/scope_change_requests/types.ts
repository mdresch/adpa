export interface ScopeChangeRequest {
    request_id?: string;
    title: string;
    description?: string;
    requestor?: string;
    impact_analysis?: string;
    cost_impact?: number;
    schedule_impact_days?: number;
    status?: 'Key' | 'Pending' | 'Approved' | 'Rejected';
    decision_date?: string;
    source_document?: string;
    source_document_id?: string;
}
