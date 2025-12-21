export interface FundingTranche {
    tranche_name?: string;
    amount: number;
    required_date?: string;
    received_date?: string;
    status?: 'Planned' | 'Requested' | 'Received';
    source_document?: string;
    source_document_id?: string;
}
