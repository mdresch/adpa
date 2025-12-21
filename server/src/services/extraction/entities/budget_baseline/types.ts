export interface BudgetBaseline {
    total_budget: number;
    currency?: string;
    categories?: Record<string, number>;
    approval_date?: string;
    version?: string;
    source_document?: string;
    source_document_id?: string;
}
