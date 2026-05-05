using System.Text.Json.Serialization;

namespace Adpa.Orchestrator.Models.Governance;

/// <summary>
/// Just-in-time human approval bound to a scoped task. Required when <c>Governance:ApprovalsEnforced</c> is true.
/// </summary>
public sealed class TaskApprovalAttestation
{
    [JsonPropertyName("scope")]
    public string Scope { get; set; } = string.Empty;

    [JsonPropertyName("task_id")]
    public string TaskId { get; set; } = string.Empty;

    [JsonPropertyName("human_decision_id")]
    public string HumanDecisionId { get; set; } = string.Empty;

    [JsonPropertyName("decided_by")]
    public string DecidedBy { get; set; } = string.Empty;

    /// <summary>UTC instant after which this attestation must not be accepted.</summary>
    [JsonPropertyName("expires_at")]
    public DateTimeOffset? ExpiresAt { get; set; }
}
