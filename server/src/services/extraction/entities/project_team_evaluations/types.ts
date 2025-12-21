export interface ProjectTeamEvaluation {
    team_member_name: string;
    role?: string;
    evaluation_date?: string;
    performance_rating?: number;
    strengths?: string[];
    improvement_areas?: string[];
    source_document?: string;
    source_document_id?: string;
}
