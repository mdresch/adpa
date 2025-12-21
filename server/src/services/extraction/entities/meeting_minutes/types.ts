export interface MeetingMinute {
    meeting_title: string;
    meeting_date?: string;
    attendees?: string[];
    agenda?: string;
    key_points?: string;
    decisions_made?: string;
    source_document?: string;
    source_document_id?: string;
}
