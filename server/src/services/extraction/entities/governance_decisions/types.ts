export interface GovernanceDecision {
    decision_id?: string
    decision_type?: string
    description?: string
    outcome?: 'Approved' | 'Rejected' | 'Deferred'
    rationale?: string
    decision_makers?: string[]
    decision_date?: string
    implementation_status?: string
    source_document_id?: string
    [key: string]: any
}
