export interface RiskChecklist {
    category: string;
    check_item: string;
    is_applicable?: boolean;
    notes?: string;
    source_document?: string;
    source_document_id?: string;
}
