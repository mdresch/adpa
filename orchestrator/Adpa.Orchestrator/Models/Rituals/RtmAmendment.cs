using System.Text.Json.Serialization;

namespace Adpa.Orchestrator.Models.Rituals;

public class RtmAmendment
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [JsonPropertyName("target_requirement_id")]
    public string TargetRequirementId { get; set; } = string.Empty;

    [JsonPropertyName("original_description")]
    public string OriginalDescription { get; set; } = string.Empty;

    [JsonPropertyName("proposed_description")]
    public string ProposedDescription { get; set; } = string.Empty;

    [JsonPropertyName("justification")]
    public string Justification { get; set; } = string.Empty;

    [JsonPropertyName("requester")]
    public string Requester { get; set; } = "SYSTEM_GOVERNANCE";

    [JsonPropertyName("approval_status")]
    public string ApprovalStatus { get; set; } = "PENDING"; // PENDING, APPROVED, REJECTED

    [JsonPropertyName("amendment_type")]
    public string AmendmentType { get; set; } = "REPLACEMENT"; // REPLACEMENT, EXPANSION

    [JsonPropertyName("amendment_sub_type")]
    public string AmendmentSubType { get; set; } = "FULL_REPLACEMENT"; // e.g., Corrective, Functional, Regulatory

    [JsonPropertyName("source_version")]
    public int SourceVersion { get; set; } = 1;

    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [JsonPropertyName("decided_by")]
    public string? DecidedBy { get; set; }

    [JsonPropertyName("decided_at")]
    public DateTime? DecidedAt { get; set; }

    [JsonPropertyName("decision_notes")]
    public string? DecisionNotes { get; set; }

    [JsonPropertyName("applied_at")]
    public DateTime? AppliedAt { get; set; }

    [JsonPropertyName("applied_by")]
    public string? AppliedBy { get; set; }

    [JsonPropertyName("resulting_requirement_id")]
    public string? ResultingRequirementId { get; set; }
}
