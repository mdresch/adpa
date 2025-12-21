export interface ApprovalWorkflow {
    name: string;
    description?: string;
    trigger_condition?: string;
    approvers?: string[];
    sla_hours?: number;
    status?: string;
    gates?: string[];
    source_document?: string;
    source_document_id?: string;
}
