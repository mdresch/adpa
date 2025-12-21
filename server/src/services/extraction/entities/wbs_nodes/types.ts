export interface WBSNode {
    wbs_code: string;
    name: string;
    level?: number;
    parent_code?: string;
    description?: string;
    owner?: string;
    status?: string;
    estimated_effort?: number;
    estimated_cost?: number;
    source_document?: string;
    source_document_id?: string;
}
