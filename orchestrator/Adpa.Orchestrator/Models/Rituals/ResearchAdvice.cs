using System.Text.Json.Serialization;

namespace Adpa.Orchestrator.Models.Rituals;

public record ResearchAdvice(
    [property: JsonPropertyName("target_requirement_id")] string TargetRequirementId,
    [property: JsonPropertyName("suggested_description")] string SuggestedDescription,
    [property: JsonPropertyName("justification")] string Justification,
    [property: JsonPropertyName("amendment_type")] string AmendmentType,
    [property: JsonPropertyName("amendment_sub_type")] string AmendmentSubType,
    [property: JsonPropertyName("confidence_score")] double ConfidenceScore,
    [property: JsonPropertyName("analysis_context")] string AnalysisContext);
