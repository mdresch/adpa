export interface BenefitRealizationPlan {
    benefit_name: string;
    target_value?: number;
    actual_value?: number;
    realization_date?: string;
    owner?: string;
    strategic_alignment?: string;
    source_document?: string;
    source_document_id?: string;
}
