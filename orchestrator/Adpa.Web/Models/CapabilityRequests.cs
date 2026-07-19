using System.Text.Json.Serialization;

namespace Adpa.Web.Models;

/// <summary>
/// ADR-012 PR5: one DTO shape per concept, reused everywhere (ADR-012's UI requirements
/// section) -- PendingOverride/PendingException moved out of Approvals.razor's private
/// nested classes, where Capabilities.razor and (PR6) MyRequests.razor couldn't reference
/// them, into this shared location. Wire shape unchanged; this is a move, not a rename.
/// </summary>
public sealed class PendingOverridesResponse
{
    [JsonPropertyName("overrideRequests")] public List<PendingOverride> OverrideRequests { get; set; } = new();
}

public sealed class PendingOverride
{
    [JsonPropertyName("id")] public string Id { get; set; } = string.Empty;
    [JsonPropertyName("moduleId")] public string ModuleId { get; set; } = string.Empty;
    [JsonPropertyName("portfolioId")] public string PortfolioId { get; set; } = string.Empty;
    [JsonPropertyName("requestedNewStatus")] public string RequestedNewStatus { get; set; } = string.Empty;
    [JsonPropertyName("justification")] public string Justification { get; set; } = string.Empty;
    [JsonPropertyName("requestedByDepartment")] public string RequestedByDepartment { get; set; } = string.Empty;
    [JsonPropertyName("requestedAt")] public DateTimeOffset RequestedAt { get; set; }

    // ADR-012 PR6d: present on every response (overrides/pending and overrides/mine both
    // come from the same repository mapping) but only meaningfully consumed by
    // MyRequests.razor -- Approvals.razor's pending queue implies "status = pending" from
    // context and doesn't render these. Extending the existing shape, not adding a second one.
    [JsonPropertyName("status")] public string Status { get; set; } = string.Empty;
    [JsonPropertyName("decidedAt")] public DateTimeOffset? DecidedAt { get; set; }
    [JsonPropertyName("denialReason")] public string? DenialReason { get; set; }
    [JsonPropertyName("withdrawnAt")] public DateTimeOffset? WithdrawnAt { get; set; }
}

public sealed class PendingExceptionsResponse
{
    [JsonPropertyName("exceptions")] public List<PendingException> Exceptions { get; set; } = new();
}

public sealed class PendingException
{
    [JsonPropertyName("id")] public string Id { get; set; } = string.Empty;
    [JsonPropertyName("moduleId")] public string ModuleId { get; set; } = string.Empty;
    [JsonPropertyName("portfolioId")] public string PortfolioId { get; set; } = string.Empty;
    [JsonPropertyName("requestedNewStatus")] public string RequestedNewStatus { get; set; } = string.Empty;
    [JsonPropertyName("justification")] public string Justification { get; set; } = string.Empty;
    [JsonPropertyName("raisedAt")] public DateTimeOffset RaisedAt { get; set; }
    [JsonPropertyName("reviews")] public List<ExceptionReview> Reviews { get; set; } = new();
}

public sealed class ExceptionReview
{
    [JsonPropertyName("id")] public string Id { get; set; } = string.Empty;
    [JsonPropertyName("reviewerCategory")] public string ReviewerCategory { get; set; } = string.Empty;
    [JsonPropertyName("reviewerLabel")] public string? ReviewerLabel { get; set; }
    [JsonPropertyName("decision")] public string? Decision { get; set; }
}

/// <summary>
/// Client-side draft for the two-step Request Override / Raise Break-Glass forms
/// (ADR-012 §B/PR5) -- same wire shape as Adpa.Orchestrator's
/// CapabilityRegistryClient.OverrideRequestBody, which both override/request and
/// exceptions/request accept identically.
/// </summary>
public sealed class OverrideRequestDraft
{
    [JsonPropertyName("requestedNewStatus")] public string RequestedNewStatus { get; set; } = string.Empty;
    [JsonPropertyName("justification")] public string Justification { get; set; } = string.Empty;
    [JsonPropertyName("dracoVerdictId")] public string? DracoVerdictId { get; set; }
}

/// <summary>Client-side draft for the Promote action -- same wire shape as CapabilityRegistryClient.PromoteRequest.</summary>
public sealed class PromoteDraft
{
    [JsonPropertyName("newStatus")] public string NewStatus { get; set; } = string.Empty;
    [JsonPropertyName("reason")] public string Reason { get; set; } = string.Empty;
    [JsonPropertyName("dracoVerdictId")] public string? DracoVerdictId { get; set; }
}
