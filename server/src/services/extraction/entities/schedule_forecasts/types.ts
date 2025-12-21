export interface ScheduleForecast {
    forecast_date?: string;
    estimated_completion_date?: string;
    variance_at_completion_days?: number;
    confidence_level?: 'High' | 'Medium' | 'Low';
    assumptions?: string;
    source_document?: string;
    source_document_id?: string;
}
