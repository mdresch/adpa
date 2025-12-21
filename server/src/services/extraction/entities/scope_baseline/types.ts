export interface ScopeBaseline {
    statement?: string;
    boundaries?: string;
    inclusions?: string[];
    exclusions?: string[];
    assumptions?: string[];
    constraints?: string[];
    approval_date?: string;
    version?: string;
    source_document?: string;
    source_document_id?: string;
}
