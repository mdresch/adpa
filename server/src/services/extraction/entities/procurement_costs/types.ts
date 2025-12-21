export interface ProcurementCost {
    vendor_name?: string;
    contract_value?: number;
    invoiced_amount?: number;
    paid_amount?: number;
    remaining_value?: number;
    currency?: string;
    status?: 'Active' | 'Closed' | 'Disputed';
    source_document?: string;
    source_document_id?: string;
}
