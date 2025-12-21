export interface TeamAvailability {
    person_name: string;
    role?: string;
    availability_percent?: number;
    start_date?: string;
    end_date?: string;
    source_document?: string;
    source_document_id?: string;
}
