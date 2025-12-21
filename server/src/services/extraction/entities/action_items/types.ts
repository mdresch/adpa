export interface ActionItem {
    item_id?: string;
    description: string;
    owner?: string;
    priority?: 'High' | 'Medium' | 'Low';
    status?: 'Open' | 'In Progress' | 'Completed';
    due_date?: string;
    completion_date?: string;
    source_document?: string;
    source_document_id?: string;
}
