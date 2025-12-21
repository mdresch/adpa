export interface ScheduleActivity {
    activity_id?: string;
    name: string;
    description?: string;
    wbs_code?: string;
    start_date?: string;
    end_date?: string;
    duration_days?: number;
    status?: 'Not Started' | 'In Progress' | 'Completed';
    percent_complete?: number;
    assigned_to?: string[];
    dependencies?: string[];
    is_critical?: boolean;
    source_document?: string;
    source_document_id?: string;
}
