export interface PolicyCompliance {
    policy_name: string;
    category?: string;
    compliance_status?: 'Compliant' | 'Non-Compliant' | 'At Risk';
    findings?: string;
    last_audit_date?: string;
    next_audit_date?: string;
    source_document?: string;
    source_document_id?: string;
}
