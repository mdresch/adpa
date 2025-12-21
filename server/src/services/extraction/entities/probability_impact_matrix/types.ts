export interface ProbabilityImpactMatrix {
    probability_level: 'Very Low' | 'Low' | 'Medium' | 'High' | 'Very High';
    impact_level: 'Very Low' | 'Low' | 'Medium' | 'High' | 'Very High';
    risk_score?: number;
    action_level?: string;
    source_document?: string;
    source_document_id?: string;
}
