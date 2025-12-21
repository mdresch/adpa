export interface RiskAppetite {
    category: string;
    appetite_level: 'Very Low' | 'Low' | 'Medium' | 'High' | 'Very High';
    thresholds?: string;
    comments?: string;
    source_document?: string;
    source_document_id?: string;
}
