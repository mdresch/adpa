export interface LaborRate {
    resource_category: string;
    hourly_rate: number;
    currency?: string;
    effective_date?: string;
    source_document?: string;
    source_document_id?: string;
}
