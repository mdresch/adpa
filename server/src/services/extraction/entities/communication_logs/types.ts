export interface CommunicationLog {
    sender?: string;
    recipient?: string;
    communication_type?: 'Email' | 'Call' | 'Memo' | 'Slack' | 'Meeting';
    communication_date?: string;
    subject?: string;
    content_summary?: string;
    key_decisions_made?: string;
    source_document?: string;
    source_document_id?: string;
}
