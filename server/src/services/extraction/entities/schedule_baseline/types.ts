export interface ScheduleBaseline {
    start_date?: string;
    end_date?: string;
    duration_days?: number;
    milestones_count?: number;
    critical_path_length?: number;
    approval_date?: string;
    version?: string;
    source_document?: string;
    source_document_id?: string;
}
