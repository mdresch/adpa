export interface ScopeVerification {
    deliverable_name: string;
    verification_date?: string;
    verifier?: string;
    method?: 'Inspection' | 'Test' | 'Review';
    outcome?: 'Accepted' | 'Rejected' | 'Conditionally Accepted';
    comments?: string;
    source_document?: string;
    source_document_id?: string;
}
