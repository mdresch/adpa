export interface CriticalPath {
    path_description?: string;
    activities?: string[];
    total_duration_days?: number;
    slack_available?: number;
    risks?: string;
    source_document?: string;
    source_document_id?: string;
}
