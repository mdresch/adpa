export interface RoleResponsibility {
    role_name: string;
    responsibilities?: string;
    raci_category?: 'R' | 'A' | 'C' | 'I';
    assigned_to?: string[];
    authority_level?: string;
    source_document?: string;
    source_document_id?: string;
}
