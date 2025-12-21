export interface GeneralChangeRequest {
    request_id?: string;
    title: string;
    description?: string;
    priority?: 'Low' | 'Medium' | 'High' | 'Critical';
    status?: 'Pending' | 'Approved' | 'Rejected' | 'Deferred';
    request_date?: string;
    decision_date?: string;
    decision_reason?: string;
    source_document?: string;
    source_document_id?: string;
}
