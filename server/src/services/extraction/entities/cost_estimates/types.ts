export interface CostEstimate {
    item_name: string;
    wbs_code?: string;
    estimated_cost: number;
    basis_of_estimate?: string;
    contingency_buffer?: number;
    confidence_level?: string;
    source_document?: string;
    source_document_id?: string;
}
