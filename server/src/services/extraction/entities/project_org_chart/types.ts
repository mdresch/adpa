export interface ProjectOrgChartNode {
    person_name: string;
    title?: string;
    reports_to?: string;
    department?: string;
    source_document?: string;
    source_document_id?: string;
}
