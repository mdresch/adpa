export interface IssueLog {
    issue_id?: string;
    title: string;
    description?: string;
    priority?: 'Low' | 'Medium' | 'High' | 'Critical';
    status?: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
    owner?: string;
    opened_date?: string;
    target_resolution_date?: string;
    actual_resolution_date?: string;
    resolution_description?: string;
    source_document?: string;
    source_document_id?: string;
}
